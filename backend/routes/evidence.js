const express = require("express");
const multer = require("multer");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const pool = require("../db");
const chain = require("../chain");
const config = require("../config");
const audit = require("../audit");
const { requireAuth } = require("../middleware/auth");
const { isValidId, ID_MESSAGE } = require("../validate");
const { analyzeEvidence } = require("./deepfake");
const { newCaseId, newEvidenceId } = require("../ids");

const router = express.Router();
const EXTS = new Set([".mp4", ".avi", ".mov", ".mkv", ".webm"]);

fs.mkdirSync(config.uploadDir, { recursive: true });
const upload = multer({
  dest: path.join(config.uploadDir, ".tmp"),
  limits: { fileSize: 500 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (EXTS.has(path.extname(file.originalname).toLowerCase())) return cb(null, true);
    cb(new Error("Only video files (mp4, avi, mov, mkv, webm) are allowed"));
  },
});

// Wraps multer so its errors become clean JSON responses
const single = (req, res, next) =>
  upload.single("video")(req, res, (err) => {
    if (!err) return next();
    const message = err.code === "LIMIT_FILE_SIZE" ? "File too large (max 500 MB)" : err.message;
    res.status(400).json({ success: false, message });
  });

const sha256 = (file) =>
  new Promise((resolve, reject) => {
    const h = crypto.createHash("sha256");
    fs.createReadStream(file).on("data", (c) => h.update(c)).on("end", () => resolve(h.digest("hex"))).on("error", reject);
  });
const rm = (f) => f && fs.unlink(f, () => {});

/* ---------- UPLOAD ---------- */
router.post("/upload", requireAuth, single, async (req, res) => {
  const tmp = req.file?.path;
  let caseId = String(req.body.caseId || "").trim();
  let evidenceId = String(req.body.evidenceId || "").trim();
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "No video file provided" });

    // Blank IDs are generated here, so they are always valid and unique.
    if (!caseId) caseId = newCaseId();
    if (!evidenceId) {
      evidenceId = newEvidenceId();
      while ((await pool.query("SELECT 1 FROM evidence_metadata WHERE evidence_id = $1", [evidenceId])).rowCount)
        evidenceId = newEvidenceId();
    }
    if (!isValidId(caseId) || !isValidId(evidenceId))
      return res.status(400).json({ success: false, message: ID_MESSAGE });

    const dup = await pool.query("SELECT 1 FROM evidence_metadata WHERE evidence_id = $1", [evidenceId]);
    if (dup.rowCount) return res.status(409).json({ success: false, message: "This evidence ID has already been uploaded" });

    const ext = path.extname(req.file.originalname).toLowerCase();
    const fileName = `${caseId}_${evidenceId}${ext}`;
    const finalPath = path.join(config.uploadDir, fileName);
    fs.renameSync(tmp, finalPath);

    const videoHash = await sha256(finalPath);

    // 1) write to the blockchain first, so a chain failure leaves no orphan DB row
    let tx;
    try {
      tx = await chain.addEvidence(caseId, evidenceId, videoHash, req.user.id);
    } catch (e) {
      rm(finalPath);
      audit(req.user.id, `Upload failed (${e.code}) - ${evidenceId}`, e.code === "CHAIN_DUPLICATE" ? 409 : 500);
      return res.status(e.code === "CHAIN_DUPLICATE" ? 409 : 502).json({ success: false, message: e.message });
    }

    // 2) record metadata
    const status = config.deepfakeEnabled ? "PENDING" : "SKIPPED";
    try {
      await pool.query(
        `INSERT INTO evidence_metadata
           (case_id, evidence_id, file_path, file_hash, submitted_by, tx_hash, block_number, deepfake_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [caseId, evidenceId, `uploads/${fileName}`, videoHash, req.user.id, tx.txHash, tx.blockNumber, status]
      );
    } catch (e) {
      console.error("DB insert after chain write failed:", e.message, tx);
      return res.status(500).json({ success: false, message: "Recorded on blockchain but saving details failed. Tx: " + tx.txHash });
    }

    audit(req.user.id, `Evidence uploaded - ${evidenceId} (case ${caseId})`);
    res.status(201).json({
      success: true,
      message: "Evidence uploaded and recorded on the blockchain",
      caseId,
      evidenceId,
      videoHash,
      txHash: tx.txHash,
      blockNumber: tx.blockNumber,
      deepfakeStatus: status,
    });

    // 3) deepfake analysis runs in the background; the UI polls /deepfake/:id
    if (config.deepfakeEnabled) analyzeEvidence(evidenceId, finalPath, req.user.id);
  } catch (e) {
    console.error("upload:", e);
    rm(tmp);
    if (!res.headersSent) res.status(500).json({ success: false, message: "Upload failed" });
  }
});

/* ---------- VERIFY ---------- */
router.post("/verify", requireAuth, single, async (req, res) => {
  const tmp = req.file?.path;
  try {
    const { evidenceId } = req.body;
    if (!req.file) return res.status(400).json({ success: false, message: "No video file provided" });
    if (!isValidId(evidenceId)) return res.status(400).json({ success: false, message: ID_MESSAGE });

    const computedHash = await sha256(tmp);
    const onChain = await chain.getEvidence(evidenceId);

    let status;
    if (!onChain) status = "NOT_FOUND";
    else status = onChain.hash === computedHash ? "AUTHENTIC" : "TAMPERED";

    audit(req.user.id, `Verification ${status} - ${evidenceId}`, status === "AUTHENTIC" ? 200 : 403);
    res.json({
      success: true,
      status,
      tampered: status === "TAMPERED",
      computedHash,
      storedHash: onChain?.hash || null,
      caseId: onChain?.caseId || null,
      submitter: onChain?.submitter || null,
      recordedAt: onChain ? new Date(onChain.timestamp * 1000).toISOString() : null,
    });
  } catch (e) {
    console.error("verify:", e.message);
    res.status(e.code === "CHAIN_ERROR" ? 502 : 500).json({ success: false, message: e.message });
  } finally {
    rm(tmp);
  }
});

/* ---------- CASES (for the case picker) ---------- */
router.get("/cases", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT case_id, COUNT(*)::int AS items, MAX(created_at) AS last_added
       FROM evidence_metadata GROUP BY case_id ORDER BY MAX(created_at) DESC`
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ success: false, message: "Failed to fetch cases" });
  }
});

/* ---------- LIST ---------- */
router.get("/records", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT e.case_id, e.evidence_id, e.file_hash, e.tx_hash, e.block_number,
              e.deepfake_status, e.avg_probability, e.prediction, e.deepfake_error,
              e.deepfake_analyzed_at, e.created_at, u.name AS submitted_by
       FROM evidence_metadata e LEFT JOIN users u ON u.id = e.submitted_by
       ORDER BY e.created_at DESC`
    );
    res.json(rows);
  } catch (e) {
    console.error("records:", e.message);
    res.status(500).json({ success: false, message: "Failed to fetch records" });
  }
});

/* ---------- VIDEO FILE (auth via header or ?token=) ---------- */
router.get("/files/:evidenceId", (req, res, next) => { req.allowQueryToken = true; next(); }, requireAuth, async (req, res) => {
  if (!isValidId(req.params.evidenceId)) return res.status(400).end();
  const { rows } = await pool.query("SELECT file_path FROM evidence_metadata WHERE evidence_id = $1", [req.params.evidenceId]);
  if (!rows[0]) return res.status(404).end();
  const file = path.join(config.uploadDir, path.basename(rows[0].file_path));
  if (!fs.existsSync(file)) return res.status(404).end();
  res.sendFile(file); // supports Range requests for video seeking
});

/* ---------- AUDIT LOGS ---------- */
router.get("/logs", requireAuth, async (req, res) => {
  try {
    const admin = req.user.role === "admin";
    const { rows } = await pool.query(
      `SELECT l.action, l.status, l.created_at AS timestamp, u.name AS user_name
       FROM audit_log l LEFT JOIN users u ON u.id = l.user_id
       WHERE ($1 OR l.user_id = $2)
       ORDER BY l.created_at DESC LIMIT 200`,
      [admin, req.user.id]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ success: false, message: "Failed to fetch logs" });
  }
});

module.exports = router;

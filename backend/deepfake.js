const express = require("express");
const multer = require("multer");
const rateLimit = require("express-rate-limit");
const { execFile } = require("child_process");
const fs = require("fs");
const path = require("path");
const pool = require("../db");
const config = require("../config");
const audit = require("../audit");
const { requireAuth } = require("../middleware/auth");
const { isValidId } = require("../validate");

const router = express.Router();

// Runs deepfake/analyze.py on one file. Never throws: resolves { ok, result } or { ok: false, error }.
function runAnalyzer(absPath, timeoutMs) {
  return new Promise((resolve) => {
    execFile(
      config.pythonBin,
      [config.analyzeScript, absPath],
      { timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024 },
      (error, stdout, stderr) => {
        let result = null;
        const line = String(stdout).trim().split("\n").filter(Boolean).pop();
        try { result = JSON.parse(line); } catch { /* handled below */ }
        if (error || !result || result.error) {
          const msg = (result && result.error) || String(stderr || error?.message || "Analysis failed").slice(-500);
          return resolve({ ok: false, error: msg });
        }
        resolve({ ok: true, result });
      }
    );
  });
}

// Analysis of an uploaded evidence video; the result is written to evidence_metadata.
async function analyzeEvidence(evidenceId, absPath, userId) {
  const r = await runAnalyzer(absPath, 15 * 60 * 1000);
  try {
    if (!r.ok) {
      await pool.query(
        "UPDATE evidence_metadata SET deepfake_status = 'ERROR', deepfake_error = $2 WHERE evidence_id = $1",
        [evidenceId, r.error]
      );
      audit(userId, `Deepfake analysis failed - ${evidenceId}`, 500);
      return r;
    }
    await pool.query(
      `UPDATE evidence_metadata
       SET deepfake_status = 'DONE', avg_probability = $2, prediction = $3,
           deepfake_error = NULL, deepfake_analyzed_at = NOW()
       WHERE evidence_id = $1`,
      [evidenceId, r.result.fake_probability, r.result.prediction]
    );
    audit(userId, `Deepfake analysis completed - ${evidenceId} (${r.result.prediction})`);
    return r;
  } catch (e) {
    console.error("deepfake db update failed:", e.message);
    return { ok: false, error: e.message };
  }
}

/* ---------- STANDALONE CHECK: any photo or video, nothing stored ---------- */
const MEDIA_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".bmp", ".mp4", ".avi", ".mov", ".mkv", ".webm"]);
const MAX_CONCURRENT = 2; // each analysis loads TensorFlow, so keep this small
let running = 0;

const checkLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many checks. Try again in a few minutes." },
});

const upload = multer({
  dest: path.join(config.uploadDir, ".tmp"),
  limits: { fileSize: 200 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (MEDIA_EXTS.has(path.extname(file.originalname).toLowerCase())) return cb(null, true);
    cb(new Error("Unsupported file. Use an image (jpg, png, webp, bmp) or a video (mp4, avi, mov, mkv, webm)."));
  },
});
const single = (req, res, next) =>
  upload.single("media")(req, res, (err) => {
    if (!err) return next();
    res.status(400).json({ success: false, message: err.code === "LIMIT_FILE_SIZE" ? "File too large (max 200 MB)" : err.message });
  });

router.post("/check", requireAuth, checkLimiter, single, async (req, res) => {
  const tmp = req.file?.path;
  let file = tmp;
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "No file provided" });
    if (!config.deepfakeEnabled) return res.status(503).json({ success: false, message: "Deepfake analysis is disabled on this server" });
    if (running >= MAX_CONCURRENT) return res.status(503).json({ success: false, message: "Server is busy analyzing other files. Try again shortly." });

    // analyze.py decides image vs video from the extension, and multer's temp name has none
    file = tmp + path.extname(req.file.originalname).toLowerCase();
    fs.renameSync(tmp, file);

    running++;
    let r;
    try { r = await runAnalyzer(file, 5 * 60 * 1000); } finally { running--; }

    const name = req.file.originalname.slice(0, 80);
    if (!r.ok) {
      audit(req.user.id, `Deepfake check failed - ${name}`, 500);
      return res.status(422).json({ success: false, message: r.error });
    }
    audit(req.user.id, `Deepfake check - ${name} (${r.result.prediction})`);
    res.json({ success: true, fileName: req.file.originalname, ...r.result });
  } catch (e) {
    console.error("deepfake check:", e);
    if (!res.headersSent) res.status(500).json({ success: false, message: "Check failed" });
  } finally {
    [tmp, file].forEach((f) => f && fs.unlink(f, () => {}));
  }
});

/* ---------- EVIDENCE ANALYSIS STATUS ---------- */
router.get("/:evidenceId", requireAuth, async (req, res) => {
  if (!isValidId(req.params.evidenceId)) return res.status(400).json({ success: false, message: "Invalid evidence ID" });
  const { rows } = await pool.query(
    `SELECT evidence_id, deepfake_status, avg_probability, prediction, deepfake_error, deepfake_analyzed_at
     FROM evidence_metadata WHERE evidence_id = $1`,
    [req.params.evidenceId]
  );
  if (!rows[0]) return res.status(404).json({ success: false, message: "Evidence not found" });
  res.json({ success: true, ...rows[0] });
});

// Re-run analysis (e.g. after a failure, or to refresh results)
router.post("/:evidenceId/rerun", requireAuth, async (req, res) => {
  if (!isValidId(req.params.evidenceId)) return res.status(400).json({ success: false, message: "Invalid evidence ID" });
  if (!config.deepfakeEnabled) return res.status(503).json({ success: false, message: "Deepfake analysis is disabled" });
  const { rows } = await pool.query("SELECT file_path FROM evidence_metadata WHERE evidence_id = $1", [req.params.evidenceId]);
  if (!rows[0]) return res.status(404).json({ success: false, message: "Evidence not found" });
  await pool.query("UPDATE evidence_metadata SET deepfake_status = 'PENDING', deepfake_error = NULL WHERE evidence_id = $1", [req.params.evidenceId]);
  analyzeEvidence(req.params.evidenceId, path.join(config.uploadDir, path.basename(rows[0].file_path)), req.user.id);
  res.status(202).json({ success: true, message: "Analysis started" });
});

module.exports = { router, analyzeEvidence };

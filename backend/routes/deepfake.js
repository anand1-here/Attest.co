const express = require("express");
const { execFile } = require("child_process");
const path = require("path");
const pool = require("../db");
const config = require("../config");
const audit = require("../audit");
const { requireAuth } = require("../middleware/auth");
const { isValidId } = require("../validate");

const router = express.Router();

// Runs deepfake/analyze.py on a stored video and writes the result to evidence_metadata.
// Never throws: failures are recorded as deepfake_status = 'ERROR'.
function analyzeEvidence(evidenceId, absPath, userId) {
  return new Promise((resolve) => {
    execFile(
      config.pythonBin,
      [config.analyzeScript, absPath],
      { timeout: 15 * 60 * 1000, maxBuffer: 10 * 1024 * 1024 },
      async (error, stdout, stderr) => {
        try {
          let result = null;
          const line = String(stdout).trim().split("\n").filter(Boolean).pop();
          try { result = JSON.parse(line); } catch { /* handled below */ }

          if (error || !result || result.error) {
            const msg = (result && result.error) || String(stderr || error?.message || "Analysis failed").slice(-500);
            await pool.query(
              "UPDATE evidence_metadata SET deepfake_status = 'ERROR', deepfake_error = $2 WHERE evidence_id = $1",
              [evidenceId, msg]
            );
            audit(userId, `Deepfake analysis failed - ${evidenceId}`, 500);
            return resolve({ ok: false, error: msg });
          }
          await pool.query(
            `UPDATE evidence_metadata
             SET deepfake_status = 'DONE', avg_probability = $2, prediction = $3,
                 deepfake_error = NULL, deepfake_analyzed_at = NOW()
             WHERE evidence_id = $1`,
            [evidenceId, result.avg_probability, result.prediction]
          );
          audit(userId, `Deepfake analysis completed - ${evidenceId} (${result.prediction})`);
          resolve({ ok: true, result });
        } catch (e) {
          console.error("deepfake db update failed:", e.message);
          resolve({ ok: false, error: e.message });
        }
      }
    );
  });
}

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

// Re-run analysis (e.g. after a failure)
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

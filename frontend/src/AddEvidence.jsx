import { useEffect, useRef, useState } from "react";
import { api } from "./api";

const ID_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

const AddEvidence = () => {
  const [caseId, setCaseId] = useState("");
  const [evidenceId, setEvidenceId] = useState("");
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [videoHash, setVideoHash] = useState("");
  const [cases, setCases] = useState([]);
  const [created, setCreated] = useState(null); // IDs the server generated or accepted
  const [deepfake, setDeepfake] = useState(null); // { evidenceId, status, prediction, probability, error }
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const loadCases = () => api("/cases").then(setCases).catch(() => {});
  useEffect(() => { loadCases(); }, []);

  // Poll until the background deepfake analysis finishes
  const pollDeepfake = (id, tries = 0) => {
    timer.current = setTimeout(async () => {
      try {
        const d = await api(`/deepfake/${encodeURIComponent(id)}`);
        if (d.deepfake_status === "PENDING" && tries < 200) {
          pollDeepfake(id, tries + 1);
          return;
        }
        setDeepfake({
          evidenceId: id,
          status: d.deepfake_status,
          prediction: d.prediction,
          probability: d.avg_probability,
          error: d.deepfake_error,
        });
      } catch {
        setDeepfake({ evidenceId: id, status: "ERROR", error: "Could not fetch analysis status" });
      }
    }, 3000);
  };

  const uploadEvidence = async () => {
    if ((caseId && !ID_RE.test(caseId)) || (evidenceId && !ID_RE.test(evidenceId))) {
      setUploadResult({
        type: "error",
        message: "Invalid ID",
        output: "IDs may contain only letters, digits, '-' and '_' (max 64 characters).",
      });
      return;
    }
    if (!video) return;

    clearTimeout(timer.current);
    setLoading(true);
    setUploadResult(null);
    setVideoHash("");
    setDeepfake(null);
    setCreated(null);

    const formData = new FormData();
    formData.append("caseId", caseId);
    formData.append("evidenceId", evidenceId);
    formData.append("video", video);

    try {
      const data = await api("/upload", { method: "POST", body: formData });
      setVideoHash(data.videoHash || "");
      setUploadResult({
        type: "success",
        message: "Evidence uploaded and recorded on the blockchain",
        output: `Block #${data.blockNumber}\nTransaction: ${data.txHash}`,
      });
      setCreated({ caseId: data.caseId, evidenceId: data.evidenceId });
      loadCases();
      if (data.deepfakeStatus === "PENDING") {
        setDeepfake({ evidenceId: data.evidenceId, status: "PENDING" });
        pollDeepfake(data.evidenceId);
      } else {
        setDeepfake({ evidenceId: data.evidenceId, status: "SKIPPED" });
      }
      setCaseId("");
      setEvidenceId("");
      setVideo(null);
    } catch (error) {
      setUploadResult({
        type: "error",
        message: error.status === 409 ? "Evidence already exists" : "Upload failed",
        output: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-evidence-container">
      <div className="add-evidence-card">
        <h1 >Add Evidence</h1>

        <div className="form-group"  >
          <label htmlFor="case-id">Case ID <small>(optional)</small></label>
          <input
            id="case-id"
            list="case-options"
            placeholder="Leave blank for a new case, or pick / type one"
            value={caseId}
            onChange={(e) => setCaseId(e.target.value)}
            className="input-field"
            disabled={loading}
          />
        </div>

        <datalist id="case-options">
          {cases.map((c) => (
            <option key={c.case_id} value={c.case_id}>{c.items} item(s)</option>
          ))}
        </datalist>

        <div className="form-group" >
          <label htmlFor="evidence-id">Evidence ID <small>(optional)</small></label>
          <input
            id="evidence-id"
            placeholder="Leave blank to auto-generate"
            value={evidenceId}
            onChange={(e) => setEvidenceId(e.target.value)}
            className="input-field"
            disabled={loading}
          />
        </div>

        <div className="form-group" >
          <label htmlFor="video-upload">Upload Video:</label>
          <input
            id="video-upload"
            type="file"
            accept="video/*"
            onChange={(e) => setVideo(e.target.files[0])}
            className="input-field"
            disabled={loading}
          />
          {video && <p className="file-info">{video.name}</p>}
        </div>

        <button
          onClick={uploadEvidence}
          disabled={loading || !video}
          className="btn-upload"
        >
          {loading ? "Uploading..." : "Upload Evidence"}
        </button>
      {/* Security Notice */}
<div className="security-notice">
  <div className="security-icon">🔒</div>
  <div className="security-text">
    <h4>Security Notice</h4>
    <p>
      All evidence records are encrypted and protected with government-grade security. Access is logged for audit purposes. Unauthorized access is prohibited by law. This system maintains complete chain of custody integrity for legal admissibility.
    </p>
  </div>
</div>

        {videoHash && (
          <div className="hash-display">
            <h3>Generated Hash (SHA-256):</h3>
            <div className="hash-value">{videoHash}</div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(videoHash);
                alert("Hash copied to clipboard!");
              }}
              className="btn-copy"
            >
              Copy Hash
            </button>
          </div>
        )}

        {created && (
          <div className="hash-display">
            <h3>Your IDs (save these to verify later)</h3>
            <div className="hash-value">Case ID: {created.caseId}</div>
            <div className="hash-value">Evidence ID: {created.evidenceId}</div>
            <button
              onClick={() => navigator.clipboard.writeText(`Case: ${created.caseId}\nEvidence: ${created.evidenceId}`)}
              className="btn-copy"
            >
              Copy IDs
            </button>
          </div>
        )}

        {deepfake && (
          <div className={`result-box ${deepfake.status === "DONE" ? (deepfake.prediction === "FAKE" ? "error" : "success") : ""}`}>
            <h3>Deepfake Analysis</h3>
            {deepfake.status === "PENDING" && <p>Analyzing video… this can take a minute.</p>}
            {deepfake.status === "SKIPPED" && <p>Deepfake analysis is disabled on this server.</p>}
            {deepfake.status === "ERROR" && <p>Analysis could not be completed: {deepfake.error}</p>}
            {deepfake.status === "DONE" && (
              <p>
                <strong>{deepfake.prediction === "FAKE" ? "FAKE video detected" : "Video appears REAL"}</strong>
                {" "}— fake probability {(deepfake.probability * 100).toFixed(2)}%
              </p>
            )}
          </div>
        )}

        {uploadResult && (
          <div className={`result-box ${uploadResult.type}`}>
            <h3>{uploadResult.message}</h3>
            <pre className="result-output">{uploadResult.output}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddEvidence;
import { useEffect, useState } from "react";
import { api } from "./api";

const VerifyEvidence = () => {
  const [evidenceId, setEvidenceId] = useState("");
  const [video, setVideo] = useState(null);
  const [videoHash, setVideoHash] = useState("");
  const [verificationResult, setVerificationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [known, setKnown] = useState([]);

  useEffect(() => {
    api("/records").then((r) => setKnown(r.map((x) => x.evidence_id))).catch(() => {});
  }, []);

  const verifyEvidence = async () => {
    if (!evidenceId || !video) {
      setMessage("Please provide both Evidence ID and video file");
      return;
    }

    setLoading(true);
    setMessage("");
    setVerificationResult(null);
    setVideoHash("");

    const formData = new FormData();
    formData.append("evidenceId", evidenceId);
    formData.append("video", video);

    try {
      const data = await api("/verify", { method: "POST", body: formData });
      setVideoHash(data.computedHash || "");

      const details =
        `Computed hash: ${data.computedHash}\n` +
        (data.storedHash ? `Blockchain hash: ${data.storedHash}\n` : "") +
        (data.recordedAt ? `Recorded: ${new Date(data.recordedAt).toLocaleString()}` : "");

      if (data.status === "AUTHENTIC") {
        setVerificationResult({ status: "authentic", message: "Evidence is AUTHENTIC", details });
      } else if (data.status === "TAMPERED") {
        setVerificationResult({ status: "tampered", message: "Evidence is TAMPERED", details });
      } else {
        setVerificationResult({
          status: "tampered",
          message: "No record found",
          details: "This Evidence ID is not on the blockchain.",
        });
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVideoChange = (e) => {
    const file = e.target.files[0];
    setVideo(file);
    setMessage("");
    setVideoHash("");
    setVerificationResult(null);
  };

  return (
    <div className="verify-container">
      <div className="verify-card">
        <h1 style={{  fontFamily: "Helvetica"}}> Verify Evidence</h1>
        <p className="subtitle">Upload a video to verify its authenticity against the ID stored on the blockchain</p>

        <div className="form-group">
          <label htmlFor="evidence-id">Evidence ID:</label>
          <input
            id="evidence-id"
            list="evidence-options"
            type="text"
            placeholder="Enter Evidence ID"
            value={evidenceId}
            onChange={(e) => setEvidenceId(e.target.value)}
            className="input-field"
          />
        </div>

        <datalist id="evidence-options">
          {known.map((id) => <option key={id} value={id} />)}
        </datalist>

        <div className="form-group">
          <label htmlFor="video-upload">Upload Video:</label>
          <input
            id="video-upload"
            type="file"
            accept="video/*"
            onChange={handleVideoChange}
            className="input-field"
            disabled={loading}
          />
          {video && <p className="file-info">📁 {video.name}</p>}
        </div>

        <button
          onClick={verifyEvidence}
          disabled={loading || !evidenceId || !video}
          className="btn-verify"
        >
          {loading ? "Verifying..." : "Verify Evidence"}
        </button>

        {message && <div className="error-message">{message}</div>}

        {videoHash && (
          <div className="hash-display">
            <h3> Generated Hash (SHA-256):</h3>
            <div className="hash-value">{videoHash}</div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(videoHash);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="btn-copy"
            >
              {copied ? "Copied!" : "Copy Hash"}
            </button>
          </div>
        )}
        {/* Verification Info */}
<div className="verification-info">

  {/* How Verification Works */}
  <div className="info-card info-blue">
    <h3>
      <span className="info-icon">ℹ️</span>
      How Verification Works
    </h3>

    <ul>
      <li>SHA-256 hash comparison</li>
      <li>Blockchain record lookup</li>
      <li>Recorded upload time and submitter</li>
      <li>Activity log of every upload and check</li>
    </ul>
  </div>

  {/* Verification Standards */}
  <div className="info-card info-green">
    <h3>
      <span className="info-icon">✔️</span>
      Verification Standards
    </h3>

    <p>
      Supports chain-of-custody review by proving a file has not changed
      since it was recorded. Legal admissibility depends on court
      procedure and should be confirmed with legal counsel.
    </p>
  </div>

</div>

        {verificationResult && (
          <div className={`result-box ${verificationResult.status}`}>
            <h2>{verificationResult.message}</h2>
            <div className="result-details">
              <pre>{verificationResult.details}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyEvidence;
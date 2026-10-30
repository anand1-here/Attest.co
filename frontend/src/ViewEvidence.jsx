import { useEffect, useState } from "react";
import { api, videoUrl } from "./api";

const ViewRecords = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () =>
    api("/records")
      .then(setRecords)
      .catch((err) => setError(err.message || "Failed to load records"))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  // Refresh while any analysis is still running
  useEffect(() => {
    if (!records.some((r) => r.deepfake_status === "PENDING")) return;
    const t = setTimeout(load, 4000);
    return () => clearTimeout(t);
  }, [records]);

  const rerun = async (id) => {
    try {
      await api(`/deepfake/${encodeURIComponent(id)}/rerun`, { method: "POST" });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <p className="loading-text">Loading records...</p>;
  if (error) return <p className="error-text">{error}</p>;
  if (records.length === 0) return <p className="empty-text">No evidence records found.</p>;

  return (
    <div className="view-records-container">
      <h1 className="view-records-title">Evidence Records</h1>

      <div className="records-grid">
        {records.map((record) => {
          const status = record.deepfake_status;
          const prediction = status === "DONE" ? record.prediction : status === "PENDING" ? "ANALYZING" : status === "ERROR" ? "ERROR" : "N/A";
          const probability =
            record.avg_probability !== null ? (record.avg_probability * 100).toFixed(2) + "%" : "—";
          const analyzedAt = record.deepfake_analyzed_at
            ? new Date(record.deepfake_analyzed_at).toLocaleString()
            : "Not analyzed yet";

          return (
            <div key={record.evidence_id} className="record-card">
              <div className="record-info">
                <p><strong>Case ID:</strong> {record.case_id}</p>
                <p><strong>Evidence ID:</strong> {record.evidence_id}</p>
                <p><strong>Submitted by:</strong> {record.submitted_by || "—"}</p>
                <p><strong>Added:</strong> {new Date(record.created_at).toLocaleString()}</p>
                <p style={{ wordBreak: "break-all" }}><strong>SHA-256:</strong> {record.file_hash}</p>
                <p style={{ wordBreak: "break-all" }}><strong>Blockchain tx:</strong> {record.tx_hash || "—"} (block {record.block_number ?? "—"})</p>
              </div>

              <div className="analysis-box">
                <p>
                  <strong>Deepfake Result:</strong>{" "}
                  <span
                    className={
                      prediction === "FAKE" ? "prediction-fake" : prediction === "REAL" ? "prediction-real" : "prediction-pending"
                    }
                  >
                    {prediction}
                  </span>
                </p>
                <p><strong>Fake Probability:</strong> {probability}</p>
                <p><strong>Analyzed At:</strong> {analyzedAt}</p>
                {status === "ERROR" && (
                  <p>
                    <small>{record.deepfake_error}</small>{" "}
                    <button onClick={() => rerun(record.evidence_id)}>Retry analysis</button>
                  </p>
                )}
              </div>

              <video controls className="record-video" preload="metadata" src={videoUrl(record.evidence_id)}>
                Your browser does not support the video tag.
              </video>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ViewRecords;

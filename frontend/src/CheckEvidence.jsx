import { useEffect, useState } from "react";
import "./CheckEvidence.css";
import { api } from "./api";

const CheckEvidence = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    setLoading(true);
    setError("");

    try {
      setRecords(await api("/records"));
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load evidence records");
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = records.filter((record) => {
    if (!filter) return true;

    const q = filter.toLowerCase();
    return (
      record.case_id?.toLowerCase().includes(q) ||
      record.evidence_id?.toLowerCase().includes(q) ||
      record.file_hash?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="check-evidence-container">
      <div className="check-evidence-card">
        <h1>Evidence Database</h1>
        <p className="subtitle">Stored evidence metadata (database)</p>

        <div className="controls">
          <input
            type="text"
            placeholder="Search by Case ID, Evidence ID, or Hash"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="search-input"
          />
          <button onClick={fetchRecords} className="btn-refresh">
            Refresh
          </button>
        </div>

        {loading && <p className="status-loading">Loading records...</p>}
        {error && <p className="status-error">{error}</p>}

        {!loading && !error && filteredRecords.length === 0 && (
          <p className="status-empty">No evidence records found</p>
        )}

        {!loading && filteredRecords.length > 0 && (
          <div className="records-container">
            <p className="record-count">
              Total: {filteredRecords.length} record(s)
            </p>

            {filteredRecords.map((record, index) => (
              <div key={index} className="evidence-record">
                <div className="record-grid">
                  <div className="record-item">
                    <span className="label">Case ID</span>
                    <span className="value">{record.case_id}</span>
                  </div>

                  <div className="record-item">
                    <span className="label">Evidence ID</span>
                    <span className="value">{record.evidence_id}</span>
                  </div>
                </div>

                <div className="record-item">
                  <span className="label">SHA-256</span>
                  <span className="value mono">{record.file_hash}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CheckEvidence;

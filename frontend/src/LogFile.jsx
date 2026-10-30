import React, { useState, useEffect } from "react";
import { Activity, Filter, Download, RefreshCw } from "lucide-react";
import { api } from "./api";

const LogFile = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, success, error

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      setLogs(await api("/logs"));
    } catch (error) {
      console.error("Failed to fetch logs:", error);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    if (filter === "all") return true;
    if (filter === "success") return log.status >= 200 && log.status < 300;
    if (filter === "error") return log.status >= 400;
    return true;
  });

  const downloadLogs = () => {
    const csvContent = [
      ["Timestamp", "Action", "Status", "User", "IP"],
      ...logs.map(log => [
        new Date(log.timestamp).toLocaleString(),
        log.action,
        log.status,
        log.user_name || "System",
        ""
      ])
    ]
      .map(row => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `activity-logs-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <div className="log-file-container">
      <div className="log-file-header">
        <div className="header-title">
          <Activity size={32} />
          <div>
            <h1>Activity Logs</h1>
            <p>Complete system activity audit trail</p>
          </div>
        </div>

        <div className="header-actions">
          <button className="btn-refresh" onClick={fetchLogs} disabled={loading}>
            <RefreshCw size={16} className={loading ? "spinning" : ""} />
            Refresh
          </button>
          <button className="btn-download" onClick={downloadLogs}>
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>

      <div className="log-controls">
        <div className="filter-group">
          <Filter size={16} />
          <span>Filter:</span>
          <button
            className={`filter-btn ${filter === "all" ? "active" : ""}`}
            onClick={() => setFilter("all")}
          >
            All ({logs.length})
          </button>
          <button
            className={`filter-btn ${filter === "success" ? "active" : ""}`}
            onClick={() => setFilter("success")}
          >
            Success ({logs.filter(l => l.status >= 200 && l.status < 300).length})
          </button>
          <button
            className={`filter-btn ${filter === "error" ? "active" : ""}`}
            onClick={() => setFilter("error")}
          >
            Errors ({logs.filter(l => l.status >= 400).length})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="log-loading">Loading activity logs...</div>
      ) : filteredLogs.length === 0 ? (
        <div className="log-empty">No logs found for the selected filter</div>
      ) : (
        <div className="log-table-container">
          <table className="log-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Action</th>
                <th>Status</th>
                <th>User</th>
                <th>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log, idx) => (
                <tr key={idx} className="log-row">
                  <td className="log-timestamp">
                    <div className="timestamp-date">
                      {new Date(log.timestamp).toLocaleDateString()}
                    </div>
                    <div className="timestamp-time">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </div>
                  </td>
                  <td className="log-action">{log.action}</td>
                  <td>
                    <span
                      className={`status-badge ${
                        log.status >= 200 && log.status < 300
                          ? "success"
                          : "error"
                      }`}
                    >
                      {log.status}
                    </span>
                  </td>
                  <td className="log-user">{log.user_name || "System"}</td>
                  
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default LogFile;
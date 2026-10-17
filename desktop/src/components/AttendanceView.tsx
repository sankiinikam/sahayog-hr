import React, { useEffect, useState } from "react";
import { apiClient } from "../api/client";
import { Clock, Play, Square } from "lucide-react";

export const AttendanceView: React.FC = () => {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/attendance/records/");
      const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
      setRecords(data);
    } catch (err) {
      console.error("Failed to load attendance records", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  const handlePunch = async (punchType: "IN" | "OUT") => {
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await apiClient.post("/attendance/punch/", { punch_type: punchType });
      setMessage({ text: res.data.detail, type: "success" });
      fetchAttendance();
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || "Action failed. Check connection.";
      setMessage({ text: errorMsg, type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="directory-container">
      <div className="page-header">
        <div>
          <h2>Attendance & Shifts</h2>
          <p>Real-time punch logging, shift tracking, and daily work records</p>
        </div>
        <div className="header-actions">
          <button
            className="btn-primary"
            style={{ backgroundColor: "#16a34a" }}
            disabled={actionLoading}
            onClick={() => handlePunch("IN")}
          >
            <Play size={16} /> Clock In
          </button>
          <button
            className="btn-secondary"
            style={{ borderColor: "#dc2626", color: "#dc2626" }}
            disabled={actionLoading}
            onClick={() => handlePunch("OUT")}
          >
            <Square size={16} /> Clock Out
          </button>
        </div>
      </div>

      {message && (
        <div className={message.type === "success" ? "status-confirmed" : "error-banner"} style={{ padding: "10px", borderRadius: "6px" }}>
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="loading-state">Loading attendance log...</div>
      ) : records.length === 0 ? (
        <div className="empty-state">
          <Clock size={48} color="#94a3b8" />
          <p>No attendance records logged yet. Clock in to begin!</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Status</th>
                <th>First In</th>
                <th>Last Out</th>
                <th>Total Worked</th>
                <th>Late Flag</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id}>
                  <td><strong>{r.attendance_date}</strong></td>
                  <td>
                    <span className={`status-badge status-${r.status.toLowerCase()}`}>
                      {r.status}
                    </span>
                  </td>
                  <td>{r.first_in || "—"}</td>
                  <td>{r.last_out || "—"}</td>
                  <td>{r.worked_minutes ? `${Math.floor(r.worked_minutes / 60)}h ${r.worked_minutes % 60}m` : "—"}</td>
                  <td>{r.is_late ? "Late Arrival" : "On Time"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

import React, { useEffect, useState } from "react";
import { apiClient } from "../api/client";
import { Calendar, Plus } from "lucide-react";

export const LeaveView: React.FC = () => {
  const [balances, setBalances] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    leave_type: "",
    start_date: new Date().toISOString().split("T")[0],
    end_date: new Date().toISOString().split("T")[0],
    reason: "",
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [balRes, reqRes, typeRes] = await Promise.all([
        apiClient.get("/leave/balances/"),
        apiClient.get("/leave/requests/"),
        apiClient.get("/leave/types/"),
      ]);
      const bData = Array.isArray(balRes.data) ? balRes.data : (balRes.data.results || []);
      const rData = Array.isArray(reqRes.data) ? reqRes.data : (reqRes.data.results || []);
      const tData = Array.isArray(typeRes.data) ? typeRes.data : (typeRes.data.results || []);
      setBalances(bData);
      setRequests(rData);
      setLeaveTypes(tData);
      if (tData.length > 0) {
        setFormData((prev) => ({ ...prev, leave_type: tData[0].id }));
      }
    } catch (err) {
      console.error("Failed to load leave data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post("/leave/requests/", formData);
      setShowModal(false);
      setFormData({
        leave_type: leaveTypes[0]?.id || "",
        start_date: new Date().toISOString().split("T")[0],
        end_date: new Date().toISOString().split("T")[0],
        reason: "",
      });
      fetchData();
    } catch (err: any) {
      alert("Error applying leave: " + JSON.stringify(err.response?.data?.detail || err.message));
    }
  };

  return (
    <div className="directory-container">
      <div className="page-header">
        <div>
          <h2>Leave & Absence Management</h2>
          <p>Track leave quotas, submit time-off requests, and monitor approval states</p>
        </div>
        <div className="header-actions">
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} /> Apply for Leave
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "20px" }}>
        {balances.map((b) => (
          <div key={b.leave_type_id} style={{ background: "#fff", padding: "16px", borderRadius: "8px", border: "1px solid var(--border)" }}>
            <h4 style={{ color: "var(--text-muted)", fontSize: "0.85rem", textTransform: "uppercase" }}>{b.leave_type_name}</h4>
            <div style={{ fontSize: "1.8rem", fontWeight: "700", color: "var(--primary)", marginTop: "6px" }}>
              {b.available_balance} <span style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>days left</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "12px", fontSize: "0.8rem", color: "var(--text-muted)" }}>
              <span>Entitled: {b.entitled}</span>
              <span>Used: {b.used}</span>
            </div>
          </div>
        ))}
      </div>

      <h3>Leave Request History</h3>
      {loading ? (
        <div className="loading-state">Loading records...</div>
      ) : requests.length === 0 ? (
        <div className="empty-state">
          <Calendar size={48} color="#94a3b8" />
          <p>No leave requests found.</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Duration</th>
                <th>Days</th>
                <th>Reason</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id}>
                  <td><strong>{r.leave_type}</strong></td>
                  <td>{r.start_date} to {r.end_date}</td>
                  <td>{r.days_count}</td>
                  <td>{r.reason}</td>
                  <td>
                    <span className={`status-badge status-${(r.status || "pending").toLowerCase()}`}>
                      {r.status || "PENDING"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Submit Leave Request</h3>
            <form onSubmit={handleApplyLeave}>
              <div className="form-group">
                <label>Leave Type</label>
                <select
                  required
                  value={formData.leave_type}
                  onChange={(e) => setFormData({ ...formData, leave_type: e.target.value })}
                >
                  {leaveTypes.map((lt) => (
                    <option key={lt.id} value={lt.id}>{lt.name} ({lt.annual_quota} days/yr)</option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Start Date</label>
                  <input
                    type="date"
                    required
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>End Date</label>
                  <input
                    type="date"
                    required
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Reason for Leave</label>
                <textarea
                  required
                  rows={3}
                  style={{ width: "100%", padding: "8px", border: "1px solid var(--border)", borderRadius: "6px" }}
                  placeholder="Explain reason for absence..."
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

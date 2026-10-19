import React, { useEffect, useState } from "react";
import { apiClient } from "../api/client";
import { Calendar, Plus, Clock, CheckCircle2, XCircle, AlertCircle, RefreshCw, Send } from "lucide-react";

export const LeaveView: React.FC = () => {
  const [balances, setBalances] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

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
      if (tData.length > 0 && !formData.leave_type) {
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
    setSubmitting(true);
    setMessage(null);
    try {
      await apiClient.post("/leave/requests/", formData);
      setShowModal(false);
      setMessage({ text: "Leave request submitted successfully!", type: "success" });
      setFormData({
        leave_type: leaveTypes[0]?.id || "",
        start_date: new Date().toISOString().split("T")[0],
        end_date: new Date().toISOString().split("T")[0],
        reason: "",
      });
      fetchData();
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.message || "Failed to submit leave request";
      setMessage({ text: typeof errorMsg === "string" ? errorMsg : JSON.stringify(errorMsg), type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  // Color schemes for balance cards
  const getCardTheme = (index: number) => {
    const themes = [
      { bg: "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)", iconBg: "rgba(255,255,255,0.2)" },
      { bg: "linear-gradient(135deg, #059669 0%, #047857 100%)", iconBg: "rgba(255,255,255,0.2)" },
      { bg: "linear-gradient(135deg, #d97706 0%, #b45309 100%)", iconBg: "rgba(255,255,255,0.2)" },
      { bg: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)", iconBg: "rgba(255,255,255,0.2)" },
    ];
    return themes[index % themes.length];
  };

  return (
    <div className="directory-container animate-fade-in">
      <div className="page-header modern-page-header">
        <div>
          <h2>Leave & Time Off</h2>
          <p>Annual leave entitlements, balance ledger, and leave application workflow</p>
        </div>
        <div className="header-actions">
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} /> Apply Leave
          </button>
          <button className="icon-btn" onClick={fetchData} title="Refresh" disabled={loading}>
            <RefreshCw size={17} className={loading ? "spin" : ""} />
          </button>
        </div>
      </div>

      {message && (
        <div className={`status-banner ${message.type === "success" ? "status-success" : "status-error"}`}>
          {message.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Vibrant Leave Balance Cards */}
      <div className="leave-balances-grid">
        {balances.map((b, idx) => {
          const theme = getCardTheme(idx);
          return (
            <div
              key={b.leave_type_id || idx}
              className="leave-balance-card"
              style={{ background: theme.bg }}
            >
              <div className="leave-balance-top">
                <span className="leave-type-name">{b.leave_type_name || "Annual Leave"}</span>
                <div className="leave-card-icon" style={{ background: theme.iconBg }}>
                  <Calendar size={18} color="#ffffff" />
                </div>
              </div>

              <div className="leave-balance-num">
                {b.available_balance ?? 0}
                <span className="leave-days-unit">days left</span>
              </div>

              <div className="leave-balance-footer">
                <span>Entitled: <strong>{b.entitled ?? 0}d</strong></span>
                <span className="divider">•</span>
                <span>Used: <strong>{b.used ?? 0}d</strong></span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Leave Requests Feed */}
      <div className="section-title-row" style={{ marginTop: 24 }}>
        <h3>Leave Application History</h3>
        <span className="badge-count">{requests.length} requests</span>
      </div>

      {loading ? (
        <div className="loading-state">
          <RefreshCw size={24} className="spin text-muted" />
          <p>Loading leave records...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="empty-state">
          <Calendar size={48} color="#94a3b8" />
          <h3>No Leave Requests</h3>
          <p>You have not submitted any time-off requests yet.</p>
        </div>
      ) : (
        <>
          {/* Mobile Leave Cards */}
          <div className="mobile-leave-cards-container">
            {requests.map((r) => {
              const status = (r.status || "pending").toLowerCase();
              return (
                <div key={r.id} className="mobile-leave-card">
                  <div className="mobile-leave-card-top">
                    <div className="leave-badge-type">
                      <strong>{r.leave_type}</strong>
                      <span className="leave-days-tag">{r.days_count} {r.days_count === 1 ? "day" : "days"}</span>
                    </div>
                    <span className={`status-badge status-${status}`}>
                      {status === "approved" && <CheckCircle2 size={12} />}
                      {status === "pending" && <Clock size={12} />}
                      {status === "rejected" && <XCircle size={12} />}
                      <span>{r.status || "PENDING"}</span>
                    </span>
                  </div>

                  <div className="leave-dates-row">
                    <Calendar size={14} className="text-muted" />
                    <span>{r.start_date} to {r.end_date}</span>
                  </div>

                  {r.reason && (
                    <div className="leave-reason-quote">
                      "{r.reason}"
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Desktop Table View */}
          <div className="table-responsive desktop-only-table">
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
                    <td>{r.reason || "—"}</td>
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
        </>
      )}

      {/* Apply Leave Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal-box animate-modal-pop">
            <div className="modal-header">
              <h3>Submit Leave Request</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleApplyLeave}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Leave Type</label>
                  <select
                    className="form-control"
                    required
                    value={formData.leave_type}
                    onChange={(e) => setFormData({ ...formData, leave_type: e.target.value })}
                  >
                    {leaveTypes.map((lt) => (
                      <option key={lt.id} value={lt.id}>
                        {lt.name} ({lt.annual_quota} days/yr)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Start Date</label>
                    <input
                      type="date"
                      className="form-control"
                      required
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Date</label>
                    <input
                      type="date"
                      className="form-control"
                      required
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Reason for Leave</label>
                  <textarea
                    className="form-control"
                    required
                    rows={3}
                    placeholder="Briefly explain the reason for time off..."
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  <Send size={15} />
                  <span>{submitting ? "Submitting..." : "Submit Application"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveView;

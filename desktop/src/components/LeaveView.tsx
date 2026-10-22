import React, { useEffect, useState, useCallback } from "react";
import { apiClient } from "../api/client";
import {
  Calendar,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Check,
  X,
  Search
} from "lucide-react";
import { getLocalDateString } from "../utils/timeFormat";

interface LeaveRequestItem {
  id: number;
  employee_id: number;
  employee_name: string;
  employee_code?: string;
  designation?: string;
  photo?: string | null;
  leave_type: string;
  leave_type_code?: string;
  days_count: number;
  start_date: string;
  end_date: string;
  day_type: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  created_at?: string;
}

interface LeaveTypeItem {
  id: number | string;
  name: string;
  code: string;
  annual_quota?: number;
  allow_half_day?: boolean;
}

interface EmployeeOption {
  id: number;
  employee_code: string;
  first_name: string;
  last_name: string;
  designation_name?: string;
  designation_title?: string;
}

export const LeaveView: React.FC = () => {
  const [requests, setRequests] = useState<LeaveRequestItem[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeItem[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("PENDING");
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // Record Worker Leave Modal
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const today = getLocalDateString();
  const [formData, setFormData] = useState({
    employee_id: "",
    leave_type: "",
    start_date: today,
    end_date: today,
    day_type: "FULL_DAY",
    reason: "",
    auto_approve: true,
  });

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [reqRes, typeRes, empRes] = await Promise.allSettled([
        apiClient.get("/leave/requests/"),
        apiClient.get("/leave/types/"),
        apiClient.get("/employees/"),
      ]);

      if (reqRes.status === "fulfilled") {
        const raw = reqRes.value.data;
        const list = Array.isArray(raw) ? raw : raw?.results ?? [];
        setRequests(list);
      }

      if (typeRes.status === "fulfilled") {
        const raw = typeRes.value.data;
        const list = Array.isArray(raw) ? raw : raw?.results ?? [];
        setLeaveTypes(list);
        if (list.length > 0 && !formData.leave_type) {
          setFormData((prev) => ({ ...prev, leave_type: String(list[0].id) }));
        }
      }

      if (empRes.status === "fulfilled") {
        const raw = empRes.value.data;
        const list = Array.isArray(raw) ? raw : raw?.results ?? [];
        setEmployees(list);
        if (list.length > 0 && !formData.employee_id) {
          setFormData((prev) => ({ ...prev, employee_id: String(list[0].id) }));
        }
      }
    } catch {
      showToast("Failed to load leave records", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Approve Leave Request
  const handleApprove = async (id: number) => {
    setActionLoading(id);
    try {
      await apiClient.post(`/leave/requests/${id}/approve/`, {
        comments: "Approved by Admin",
      });
      showToast("Leave request approved successfully!");
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: "APPROVED" } : r))
      );
    } catch (err: any) {
      showToast(err.response?.data?.detail || "Failed to approve leave", "error");
    } finally {
      setActionLoading(null);
    }
  };

  // Reject Leave Request
  const handleReject = async (id: number) => {
    const reasonPrompt = window.prompt("Reason for rejection (optional):", "Operational requirements on factory floor");
    if (reasonPrompt === null) return;

    setActionLoading(id);
    try {
      await apiClient.post(`/leave/requests/${id}/reject/`, {
        comments: reasonPrompt || "Rejected by Admin",
      });
      showToast("Leave request rejected.", "error");
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: "REJECTED" } : r))
      );
    } catch (err: any) {
      showToast(err.response?.data?.detail || "Failed to reject leave", "error");
    } finally {
      setActionLoading(null);
    }
  };

  // Submit Admin-Recorded Worker Leave
  const handleRecordWorkerLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employee_id) {
      showToast("Please select an employee", "error");
      return;
    }
    if (!formData.leave_type) {
      showToast("Please select a leave type", "error");
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.post("/leave/requests/", {
        employee_id: Number(formData.employee_id),
        leave_type: Number(formData.leave_type),
        start_date: formData.start_date,
        end_date: formData.end_date,
        day_type: formData.day_type,
        reason: formData.reason || "Logged by Administrator",
        auto_approve: formData.auto_approve,
      });

      setShowModal(false);
      showToast(formData.auto_approve ? "Worker leave recorded & approved!" : "Worker leave request registered!");
      setFormData({
        employee_id: employees[0] ? String(employees[0].id) : "",
        leave_type: leaveTypes[0] ? String(leaveTypes[0].id) : "",
        start_date: today,
        end_date: today,
        day_type: "FULL_DAY",
        reason: "",
        auto_approve: true,
      });
      fetchData();
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || "Failed to record leave";
      showToast(typeof msg === "string" ? msg : JSON.stringify(msg), "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Metrics
  const pendingCount = requests.filter((r) => r.status === "PENDING").length;
  const approvedCount = requests.filter((r) => r.status === "APPROVED").length;
  const rejectedCount = requests.filter((r) => r.status === "REJECTED").length;

  // Filtered requests
  const filtered = requests.filter((r) => {
    if (filterStatus !== "ALL" && r.status !== filterStatus) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.employee_name?.toLowerCase().includes(q) ||
      r.employee_code?.toLowerCase().includes(q) ||
      r.designation?.toLowerCase().includes(q) ||
      r.leave_type?.toLowerCase().includes(q) ||
      r.reason?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="directory-container animate-fade-in">
      {/* Toast Notification */}
      {toast && (
        <div className={`toast-notification ${toast.type === "error" ? "toast-error" : "toast-success"}`}>
          {toast.type === "error" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="directory-top-bar">
        <div className="directory-title-area">
          <div className="directory-title-row">
            <h2>Worker Leaves & Approvals</h2>
            {pendingCount > 0 && (
              <span className="directory-count-pill pill-late">
                {pendingCount} Pending Review
              </span>
            )}
          </div>
          <p className="directory-sub">
            Review staff leave applications, approve factory time-off, and record worker leaves
          </p>
        </div>

        <div className="directory-btn-group">
          <button
            className="icon-btn-refresh"
            onClick={fetchData}
            title="Refresh Leave Roster"
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? "spin" : ""} />
          </button>
          <button className="btn-add-staff-header" onClick={() => setShowModal(true)}>
            <Plus size={16} />
            <span>Record Worker Leave</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="metric-cards-grid" style={{ marginBottom: 14 }}>
        <div
          className={`metric-card ${filterStatus === "PENDING" ? "metric-card-selected" : ""}`}
          onClick={() => setFilterStatus("PENDING")}
          style={{ cursor: "pointer" }}
        >
          <div className="metric-header">
            <span>PENDING APPROVAL</span>
            <Clock size={16} className="metric-icon-amber" />
          </div>
          <div className="metric-value" style={{ color: "#d97706" }}>{pendingCount}</div>
          <div className="metric-footer">Needs Admin Decision</div>
        </div>

        <div
          className={`metric-card ${filterStatus === "APPROVED" ? "metric-card-selected" : ""}`}
          onClick={() => setFilterStatus("APPROVED")}
          style={{ cursor: "pointer" }}
        >
          <div className="metric-header">
            <span>APPROVED LEAVES</span>
            <CheckCircle2 size={16} className="metric-icon-emerald" />
          </div>
          <div className="metric-value" style={{ color: "#16a34a" }}>{approvedCount}</div>
          <div className="metric-footer">Logged & Sanctioned</div>
        </div>

        <div
          className={`metric-card ${filterStatus === "REJECTED" ? "metric-card-selected" : ""}`}
          onClick={() => setFilterStatus("REJECTED")}
          style={{ cursor: "pointer" }}
        >
          <div className="metric-header">
            <span>REJECTED</span>
            <XCircle size={16} className="metric-icon-rose" />
          </div>
          <div className="metric-value" style={{ color: "#dc2626" }}>{rejectedCount}</div>
          <div className="metric-footer">Declined Requests</div>
        </div>

        <div
          className={`metric-card ${filterStatus === "ALL" ? "metric-card-selected" : ""}`}
          onClick={() => setFilterStatus("ALL")}
          style={{ cursor: "pointer" }}
        >
          <div className="metric-header">
            <span>TOTAL RECORDS</span>
            <Calendar size={16} className="metric-icon-blue" />
          </div>
          <div className="metric-value">{requests.length}</div>
          <div className="metric-footer">Full Leave History</div>
        </div>
      </div>

      {/* Search Input */}
      <div className="directory-search-wrapper" style={{ marginBottom: 12 }}>
        <Search size={16} className="search-icon" />
        <input
          placeholder="Search by worker name, employee code, designation, or reason…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="directory-search-input"
        />
        {search && (
          <button className="search-clear-btn" onClick={() => setSearch("")}>
            ✕
          </button>
        )}
      </div>

      {/* Filter Chips */}
      <div className="directory-filter-chips">
        <button
          className={`filter-chip chip-late ${filterStatus === "PENDING" ? "active" : ""}`}
          onClick={() => setFilterStatus("PENDING")}
        >
          <Clock size={13} style={{ marginRight: 4 }} /> Pending Approvals ({pendingCount})
        </button>
        <button
          className={`filter-chip ${filterStatus === "ALL" ? "active" : ""}`}
          onClick={() => setFilterStatus("ALL")}
        >
          All Requests ({requests.length})
        </button>
        <button
          className={`filter-chip chip-present ${filterStatus === "APPROVED" ? "active" : ""}`}
          onClick={() => setFilterStatus("APPROVED")}
        >
          <span className="dot dot-active" /> Approved ({approvedCount})
        </button>
        <button
          className={`filter-chip chip-absent ${filterStatus === "REJECTED" ? "active" : ""}`}
          onClick={() => setFilterStatus("REJECTED")}
        >
          <span className="dot dot-inactive" /> Rejected ({rejectedCount})
        </button>
      </div>

      {/* Leave Cards List */}
      {loading ? (
        <div className="loading-spinner">
          <RefreshCw size={18} className="spin" />
          <span>Loading leave requests…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <Calendar size={48} />
          <h3>No Leave Requests Found</h3>
          <p>
            {filterStatus === "PENDING"
              ? "All staff leave requests have been reviewed and resolved!"
              : search
              ? "No leave requests match your search criteria."
              : "No leave records logged yet. Click '+ Record Worker Leave' to log leave for an employee."}
          </p>
        </div>
      ) : (
        <div className="leave-cards-container">
          {filtered.map((req) => {
            const isPending = req.status === "PENDING";
            const isApproved = req.status === "APPROVED";
            const isBusy = actionLoading === req.id;

            return (
              <div key={req.id} className={`leave-card ${isPending ? "leave-card-pending" : ""}`}>
                {/* Header Row: Employee & Status Badge */}
                <div className="leave-card-header">
                  <div className="leave-card-user">
                    <div className="leave-avatar">
                      {req.employee_name
                        ? req.employee_name
                            .split(" ")
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()
                        : "??"}
                    </div>
                    <div className="leave-user-info">
                      <strong className="leave-user-name">{req.employee_name}</strong>
                      <span className="leave-user-sub">
                        {req.employee_code && <span className="code-badge">{req.employee_code}</span>}
                        <span>{req.designation || "Staff Member"}</span>
                      </span>
                    </div>
                  </div>

                  <span
                    className={`status-pill ${
                      isApproved
                        ? "status-pill-approved"
                        : isPending
                        ? "status-pill-pending"
                        : "status-pill-rejected"
                    }`}
                  >
                    {isApproved && <CheckCircle2 size={12} />}
                    {isPending && <Clock size={12} />}
                    {!isApproved && !isPending && <XCircle size={12} />}
                    <span>{req.status}</span>
                  </span>
                </div>

                {/* Body: Dates, Type, Days Count, Reason */}
                <div className="leave-card-body">
                  <div className="leave-dates-row">
                    <div className="leave-meta-item">
                      <span className="meta-lbl">LEAVE TYPE</span>
                      <strong className="meta-val text-blue">{req.leave_type}</strong>
                    </div>
                    <div className="leave-meta-item">
                      <span className="meta-lbl">DURATION</span>
                      <strong className="meta-val">
                        {req.days_count} {req.days_count === 1 ? "Day" : "Days"} ({req.day_type.replace("_", " ")})
                      </strong>
                    </div>
                    <div className="leave-meta-item">
                      <span className="meta-lbl">TIMEFRAME</span>
                      <strong className="meta-val">
                        {req.start_date} {req.start_date !== req.end_date && `→ ${req.end_date}`}
                      </strong>
                    </div>
                  </div>

                  {req.reason && (
                    <div className="leave-reason-box">
                      <span className="reason-label">Reason:</span>
                      <span className="reason-text">"{req.reason}"</span>
                    </div>
                  )}
                </div>

                {/* Footer: Admin Action Buttons for Pending Requests */}
                {isPending && (
                  <div className="leave-card-actions">
                    <button
                      className="btn-approve-leave"
                      onClick={() => handleApprove(req.id)}
                      disabled={isBusy}
                      title="Approve Leave Application"
                    >
                      <Check size={15} />
                      <span>{isBusy ? "Approving…" : "Approve Leave"}</span>
                    </button>
                    <button
                      className="btn-reject-leave"
                      onClick={() => handleReject(req.id)}
                      disabled={isBusy}
                      title="Reject Leave Application"
                    >
                      <X size={15} />
                      <span>Reject</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Record Worker Leave Modal */}
      {showModal && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div className="modal-box modal-box-md">
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Calendar size={19} color="#2563eb" />
                <h3>Record Worker Leave (Admin Entry)</h3>
              </div>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordWorkerLeave} className="modal-form">
              {/* Select Employee */}
              <div className="form-group">
                <label className="form-label">
                  Select Employee / Factory Worker <span className="req">*</span>
                </label>
                <select
                  className="form-input"
                  value={formData.employee_id}
                  onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                  required
                >
                  <option value="">-- Choose Employee --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} ({emp.employee_code}) — {emp.designation_name || emp.designation_title || "Staff"}
                    </option>
                  ))}
                </select>
              </div>

              {/* Leave Type */}
              <div className="form-group">
                <label className="form-label">
                  Leave Category <span className="req">*</span>
                </label>
                <select
                  className="form-input"
                  value={formData.leave_type}
                  onChange={(e) => setFormData({ ...formData, leave_type: e.target.value })}
                  required
                >
                  {leaveTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Start & End Dates */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">
                    From Date <span className="req">*</span>
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    To Date <span className="req">*</span>
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Day Type */}
              <div className="form-group">
                <label className="form-label">Duration Type</label>
                <div className="radio-group-row">
                  <label className="radio-item">
                    <input
                      type="radio"
                      name="day_type"
                      value="FULL_DAY"
                      checked={formData.day_type === "FULL_DAY"}
                      onChange={(e) => setFormData({ ...formData, day_type: e.target.value })}
                    />
                    <span>Full Day</span>
                  </label>
                  <label className="radio-item">
                    <input
                      type="radio"
                      name="day_type"
                      value="FIRST_HALF"
                      checked={formData.day_type === "FIRST_HALF"}
                      onChange={(e) => setFormData({ ...formData, day_type: e.target.value })}
                    />
                    <span>First Half (0.5)</span>
                  </label>
                  <label className="radio-item">
                    <input
                      type="radio"
                      name="day_type"
                      value="SECOND_HALF"
                      checked={formData.day_type === "SECOND_HALF"}
                      onChange={(e) => setFormData({ ...formData, day_type: e.target.value })}
                    />
                    <span>Second Half (0.5)</span>
                  </label>
                </div>
              </div>

              {/* Reason */}
              <div className="form-group">
                <label className="form-label">Reason / Remarks</label>
                <textarea
                  className="form-input"
                  rows={2}
                  placeholder="e.g. Emergency medical leave, worker telephoned supervisor, etc."
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                />
              </div>

              {/* Auto Approve Checkbox */}
              <div className="form-group checkbox-group">
                <label className="checkbox-toggle-label">
                  <input
                    type="checkbox"
                    checked={formData.auto_approve}
                    onChange={(e) => setFormData({ ...formData, auto_approve: e.target.checked })}
                    className="styled-checkbox"
                  />
                  <span className="toggle-text">
                    <strong>Auto-Approve Immediately</strong> (Sanction this leave upon entry)
                  </span>
                </label>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  <Check size={16} />
                  <span>{submitting ? "Recording…" : "Save Worker Leave"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

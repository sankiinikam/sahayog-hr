import React, { useEffect, useState, useCallback, useRef } from "react";
import { ArrowLeft, RefreshCw, Edit2, Check, Upload, Trash2, User, CheckCircle2, AlertCircle, Calendar } from "lucide-react";
import { AttendanceLogger } from "./AttendanceLogger";
import { OvertimeTracker } from "./OvertimeTracker";
import { PayslipCalculator } from "./PayslipCalculator";
import { apiClient } from "../api/client";
import { to12Hour } from "../utils/timeFormat";
import { formatApiError } from "../utils/formatError";

interface Shift { id: number; name: string; start_time: string; end_time: string; }
interface EmployeeProfile {
  id: number;
  employee_code: string;
  first_name: string;
  last_name: string;
  full_name: string;
  work_email: string;
  personal_email: string;
  personal_phone: string;
  work_phone: string;
  gender: string;
  date_of_birth: string | null;
  date_of_joining: string;
  is_active: boolean;
  photo?: string;
  stats_30d: { present: number; half_day: number; absent: number; on_leave: number };
  available_shifts: Shift[];
}

interface AttHistoryRecord {
  id: number;
  attendance_date: string;
  status: string;
  first_in: string | null;
  last_out: string | null;
  worked_minutes: number;
  overtime_minutes: number;
  is_corrected: boolean;
}

interface Props {
  employeeId: number;
  onBack: () => void;
}

const initials = (name: string) =>
  name.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase() || "??";

const badge = (s: string) => {
  const map: Record<string, string> = {
    PRESENT: "badge-present",
    ABSENT: "badge-absent",
    HALF_DAY: "badge-half-day",
    ON_LEAVE: "badge-on-leave",
    HOLIDAY: "badge-holiday",
    WEEK_OFF: "badge-week-off",
    MISSED_PUNCH: "badge-missed-punch",
  };
  return `badge ${map[s] || "badge-default"}`;
};

export const AdminEmployeeProfile: React.FC<Props> = ({ employeeId, onBack }) => {
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const editPhotoInputRef = useRef<HTMLInputElement>(null);

  // History detail state for cross verification
  const [historyRecords, setHistoryRecords] = useState<AttHistoryRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<string>("ALL");
  const [verifiedMap, setVerifiedMap] = useState<Record<number, boolean>>({});
  const [historyMonth, setHistoryMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const [editForm, setEditForm] = useState({
    first_name: "",
    last_name: "",
    work_email: "",
    employee_code: "",
    date_of_joining: "",
    personal_phone: "",
    personal_email: "",
    is_active: true,
    photo: "",
  });

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/employees/${employeeId}/admin-profile/`);
      setProfile(res.data);
    } catch {
      try {
        const [empRes, shiftRes] = await Promise.all([
          apiClient.get(`/employees/${employeeId}/`),
          apiClient.get("/organization/shifts/"),
        ]);
        const d2 = empRes.data;
        const shiftsData = shiftRes.data;
        const shiftsList: Shift[] = Array.isArray(shiftsData) ? shiftsData : shiftsData.results ?? [];
        setProfile({
          id: d2.id,
          employee_code: d2.employee_code || "",
          first_name: d2.first_name || "",
          last_name: d2.last_name || "",
          full_name: `${d2.first_name || ""} ${d2.last_name || ""}`.trim(),
          work_email: d2.work_email || "",
          personal_email: d2.personal_email || "",
          personal_phone: d2.personal_phone || "",
          work_phone: d2.work_phone || "",
          gender: d2.gender || "",
          date_of_birth: d2.date_of_birth || null,
          date_of_joining: d2.date_of_joining || "",
          is_active: d2.is_active ?? true,
          photo: d2.photo || "",
          stats_30d: { present: 0, half_day: 0, absent: 0, on_leave: 0 },
          available_shifts: shiftsList,
        });
      } catch (e) {
        console.error(e);
      }
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await apiClient.get(`/attendance/records/?employee_id=${employeeId}&month=${historyMonth}`);
      const list: AttHistoryRecord[] = Array.isArray(res.data) ? res.data : res.data?.results ?? [];
      list.sort((a, b) => b.attendance_date.localeCompare(a.attendance_date));
      setHistoryRecords(list);

      // Pre-fill verified map from saved record states
      const map: Record<number, boolean> = {};
      list.forEach(r => {
        if (r.is_corrected) map[r.id] = true;
      });
      setVerifiedMap(prev => ({ ...map, ...prev }));
    } catch {
      // ignore
    } finally {
      setHistoryLoading(false);
    }
  }, [employeeId, historyMonth]);

  useEffect(() => {
    fetchProfile();
    fetchHistory();
  }, [fetchProfile, fetchHistory]);

  const handleToggleVerify = (recordId: number) => {
    setVerifiedMap(prev => {
      const updated = !prev[recordId];
      showToast(updated ? "Attendance record marked Verified ✓" : "Record unmarked");
      return { ...prev, [recordId]: updated };
    });
  };

  const handleOpenEdit = () => {
    if (!profile) return;
    setEditForm({
      first_name: profile.first_name || "",
      last_name: profile.last_name || "",
      work_email: profile.work_email || "",
      employee_code: profile.employee_code || "",
      date_of_joining: profile.date_of_joining || "",
      personal_phone: profile.personal_phone || "",
      personal_email: profile.personal_email || "",
      is_active: profile.is_active ?? true,
      photo: profile.photo || "",
    });
    setShowEditModal(true);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Please upload an image file (PNG, JPG)", "error");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast("Photo must be under 2MB", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setEditForm(f => ({ ...f, photo: dataUrl }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      await apiClient.patch(`/employees/${employeeId}/`, editForm);
      showToast("Employee profile updated!");
      setShowEditModal(false);
      fetchProfile();
    } catch (e: any) {
      showToast(`Error: ${formatApiError(e)}`, "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <RefreshCw size={18} className="spin" />
        <span>Loading employee profile…</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="empty-state">
        <h3>Profile not found</h3>
        <button className="btn btn-secondary" onClick={onBack}>Go Back</button>
      </div>
    );
  }

  const stats = profile.stats_30d;

  const filteredHistory = historyRecords.filter(r => {
    if (historyFilter === "ALL") return true;
    return r.status === historyFilter;
  });

  return (
    <div>
      {/* Profile Header */}
      <div className="profile-header">
        <button className="profile-back-btn" onClick={onBack}>
          <ArrowLeft size={16} /> Back
        </button>

        {/* Profile Avatar (Photo or Initials) */}
        <div className="profile-avatar">
          {profile.photo ? (
            <img src={profile.photo} alt={profile.full_name} className="profile-avatar-img" />
          ) : (
            initials(profile.full_name || profile.first_name)
          )}
        </div>

        <div className="profile-info">
          <div className="profile-name">{profile.full_name}</div>
          <div className="profile-tags">
            <span className="profile-tag saffron">ID: {profile.employee_code}</span>
            {profile.is_active
              ? <span className="profile-tag green">● Active</span>
              : <span className="profile-tag gray">● Inactive</span>
            }
          </div>
        </div>

        {/* Quick Info Grid */}
        <div className="profile-meta">
          <div className="profile-meta-item">
            <div className="meta-label">Work Email</div>
            <div className="meta-value" style={{ fontSize: 11 }}>{profile.work_email}</div>
          </div>
          <div className="profile-meta-item">
            <div className="meta-label">Phone</div>
            <div className="meta-value">{profile.personal_phone || profile.work_phone || "—"}</div>
          </div>
          <div className="profile-meta-item">
            <div className="meta-label">Joined</div>
            <div className="meta-value">{profile.date_of_joining}</div>
          </div>
        </div>

        {/* Edit Profile Button */}
        <button
          className="btn btn-secondary btn-sm"
          onClick={handleOpenEdit}
          style={{ background: "rgba(255,255,255,0.12)", color: "#fff", borderColor: "rgba(255,255,255,0.25)" }}
        >
          <Edit2 size={14} /> Edit Profile
        </button>
      </div>

      {/* 30-Day Stats */}
      <div className="stats-row" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 18 }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#f0fdf4" }}>
            <span style={{ fontSize: 18, color: "#16a34a" }}>✓</span>
          </div>
          <div className="stat-info">
            <div className="stat-value" style={{ color: "#16a34a" }}>{stats.present}</div>
            <div className="stat-label">Present (30d)</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#fefce8" }}>
            <span style={{ fontSize: 18, color: "#d97706" }}>½</span>
          </div>
          <div className="stat-info">
            <div className="stat-value" style={{ color: "#d97706" }}>{stats.half_day}</div>
            <div className="stat-label">Half Day (30d)</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#fef2f2" }}>
            <span style={{ fontSize: 18, color: "#dc2626" }}>✗</span>
          </div>
          <div className="stat-info">
            <div className="stat-value" style={{ color: "#dc2626" }}>{stats.absent}</div>
            <div className="stat-label">Absent (30d)</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#f5f3ff" }}>
            <span style={{ fontSize: 18, color: "#7c3aed" }}>⛱</span>
          </div>
          <div className="stat-info">
            <div className="stat-value" style={{ color: "#7c3aed" }}>{stats.on_leave}</div>
            <div className="stat-label">On Leave (30d)</div>
          </div>
        </div>
      </div>

      {/* 3-Column Work Hub */}
      <div className="workhub" style={{ marginBottom: 24 }}>
        <AttendanceLogger employeeId={profile.id} shifts={profile.available_shifts} />
        <OvertimeTracker employeeId={profile.id} standardHoursPerDay={12} />
        <PayslipCalculator
          employeeId={profile.id}
          employeeName={profile.full_name}
          employeeCode={profile.employee_code}
        />
      </div>

      {/* Comprehensive History Detail & Cross-Verification Card */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header" style={{ flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Calendar size={18} color="#2563eb" />
            <span className="card-title" style={{ fontSize: 15 }}>
              Attendance & Leave History Detail (Cross-Verification)
            </span>
          </div>

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
            {/* Status Filter Buttons */}
            <div className="history-filter-pills">
              {["ALL", "PRESENT", "HALF_DAY", "ABSENT", "ON_LEAVE"].map(st => (
                <button
                  key={st}
                  type="button"
                  className={`filter-pill ${historyFilter === st ? "active" : ""}`}
                  onClick={() => setHistoryFilter(st)}
                >
                  {st === "ALL" ? "All" : st.replace("_", " ")}
                </button>
              ))}
            </div>

            {/* Month Picker */}
            <input
              type="month"
              value={historyMonth}
              onChange={e => setHistoryMonth(e.target.value)}
              style={{ padding: "4px 8px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 12 }}
            />

            <button className="btn btn-secondary btn-xs" onClick={fetchHistory} title="Refresh History">
              <RefreshCw size={12} />
            </button>
          </div>
        </div>

        <div className="card-body" style={{ padding: 0 }}>
          {historyLoading ? (
            <div style={{ padding: "30px", textAlign: "center", color: "#64748b" }}>
              <RefreshCw size={18} className="spin" style={{ display: "inline-block", marginRight: 8 }} />
              Loading attendance history…
            </div>
          ) : filteredHistory.length === 0 ? (
            <div style={{ padding: "36px", textAlign: "center", color: "#94a3b8" }}>
              No attendance records found for {historyMonth} with status "{historyFilter}"
            </div>
          ) : (
            <table className="history-detail-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Clock In</th>
                  <th>Clock Out</th>
                  <th>Worked Time</th>
                  <th>Overtime (&gt;12h)</th>
                  <th>Cross-Verification</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map(rec => {
                  const isVerified = verifiedMap[rec.id];
                  const hasOt = (rec.overtime_minutes || 0) > 0;
                  const workedHours = (rec.worked_minutes / 60).toFixed(1);

                  return (
                    <tr key={rec.id}>
                      <td style={{ fontWeight: 600, color: "#0f172a" }}>
                        {rec.attendance_date}
                      </td>
                      <td>
                        <span className={badge(rec.status)}>
                          {rec.status.replace("_", " ")}
                        </span>
                      </td>
                      <td>
                        {rec.first_in ? to12Hour(rec.first_in) : "—"}
                      </td>
                      <td>
                        {rec.last_out ? to12Hour(rec.last_out) : "—"}
                      </td>
                      <td>
                        {rec.worked_minutes > 0 ? (
                          <span>{Math.floor(rec.worked_minutes / 60)}h {rec.worked_minutes % 60}m ({workedHours}h)</span>
                        ) : (
                          <span style={{ color: "#94a3b8" }}>—</span>
                        )}
                      </td>
                      <td>
                        {hasOt ? (
                          <span className="ot-badge-pill">
                            +{Math.floor(rec.overtime_minutes / 60)}h {rec.overtime_minutes % 60 > 0 ? `${rec.overtime_minutes % 60}m ` : ""}OT
                          </span>
                        ) : (
                          <span style={{ color: "#94a3b8", fontSize: 12 }}>None</span>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          className={`verify-toggle-btn ${isVerified ? "verified" : "pending"}`}
                          onClick={() => handleToggleVerify(rec.id)}
                          title="Click to toggle cross-verification status"
                        >
                          {isVerified ? (
                            <>
                              <CheckCircle2 size={13} color="#16a34a" />
                              <span>Verified</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle size={13} color="#d97706" />
                              <span>Verify</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setShowEditModal(false); }}>
          <div className="modal-box">
            <div className="modal-header">
              <h3>Edit Profile — {profile.full_name}</h3>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {/* Photo Upload in Profile Modal */}
              <div className="form-row photo-upload-row">
                <div className="photo-preview-circle">
                  {editForm.photo ? (
                    <img src={editForm.photo} alt="Preview" className="photo-preview-img" />
                  ) : (
                    <User size={26} color="#94a3b8" />
                  )}
                </div>
                <div className="photo-upload-actions">
                  <label className="form-label" style={{ marginBottom: 4 }}>Employee Photo</label>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      type="file"
                      ref={editPhotoInputRef}
                      style={{ display: "none" }}
                      accept="image/*"
                      onChange={handlePhotoUpload}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary btn-xs"
                      onClick={() => editPhotoInputRef.current?.click()}
                    >
                      <Upload size={12} /> {editForm.photo ? "Change Photo" : "Upload Photo"}
                    </button>
                    {editForm.photo && (
                      <button
                        type="button"
                        className="btn btn-danger btn-xs"
                        onClick={() => setEditForm(f => ({ ...f, photo: "" }))}
                      >
                        <Trash2 size={12} /> Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-row">
                  <label className="form-label">First Name *</label>
                  <input
                    className="form-control"
                    value={editForm.first_name}
                    onChange={e => setEditForm(f => ({ ...f, first_name: e.target.value }))}
                  />
                </div>
                <div className="form-row">
                  <label className="form-label">Last Name *</label>
                  <input
                    className="form-control"
                    value={editForm.last_name}
                    onChange={e => setEditForm(f => ({ ...f, last_name: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-row">
                <label className="form-label">Work Email *</label>
                <input
                  className="form-control"
                  type="email"
                  value={editForm.work_email}
                  onChange={e => setEditForm(f => ({ ...f, work_email: e.target.value }))}
                />
              </div>

              <div className="form-grid-2">
                <div className="form-row">
                  <label className="form-label">Employee Code *</label>
                  <input
                    className="form-control"
                    value={editForm.employee_code}
                    onChange={e => setEditForm(f => ({ ...f, employee_code: e.target.value }))}
                  />
                </div>
                <div className="form-row">
                  <label className="form-label">Date of Joining</label>
                  <input
                    className="form-control"
                    type="date"
                    value={editForm.date_of_joining}
                    onChange={e => setEditForm(f => ({ ...f, date_of_joining: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-row">
                  <label className="form-label">Personal Phone</label>
                  <input
                    className="form-control"
                    value={editForm.personal_phone}
                    onChange={e => setEditForm(f => ({ ...f, personal_phone: e.target.value }))}
                  />
                </div>
                <div className="form-row">
                  <label className="form-label">Personal Email</label>
                  <input
                    className="form-control"
                    type="email"
                    value={editForm.personal_email}
                    onChange={e => setEditForm(f => ({ ...f, personal_email: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-row" style={{ marginTop: 8 }}>
                <label className="form-label">Employment Status</label>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13.5 }}>
                    <input
                      type="radio"
                      name="profile_is_active"
                      checked={editForm.is_active === true}
                      onChange={() => setEditForm(f => ({ ...f, is_active: true }))}
                    />
                    Active
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13.5 }}>
                    <input
                      type="radio"
                      name="profile_is_active"
                      checked={editForm.is_active === false}
                      onChange={() => setEditForm(f => ({ ...f, is_active: false }))}
                    />
                    Inactive
                  </label>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowEditModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSaveEdit} disabled={saving}>
                <Check size={15} /> {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </div>
  );
};

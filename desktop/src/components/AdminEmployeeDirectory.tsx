import React, { useEffect, useState, useCallback, useRef } from "react";
import { Users, Plus, Search, ChevronRight, RefreshCw, Edit2, Check, Upload, Trash2, User } from "lucide-react";
import { apiClient } from "../api/client";
import { Time12Input } from "./Time12Input";
import { to12Hour, computeShiftAttendance, getLocalDateString } from "../utils/timeFormat";
import { formatApiError } from "../utils/formatError";

export interface Employee {
  id: number;
  employee_code: string;
  first_name: string;
  last_name: string;
  work_email: string;
  personal_email?: string;
  personal_phone?: string;
  work_phone?: string;
  is_active: boolean;
  date_of_joining: string;
  photo?: string;
}

interface Company {
  id: number;
  name: string;
}

interface Props {
  onSelectEmployee: (emp: Employee) => void;
}

interface TodayAttendance {
  id?: number;
  status: "PRESENT" | "ABSENT" | "HALF_DAY" | "ON_LEAVE" | "MISSED_PUNCH" | string;
  first_in: string | null;
  last_out: string | null;
  worked_minutes: number;
  overtime_minutes: number;
  clockIn12: string;
  clockOut12: string;
}

const initials = (emp: Employee) =>
  ((emp.first_name?.[0] || "") + (emp.last_name?.[0] || "")).toUpperCase() || "??";

export const AdminEmployeeDirectory: React.FC<Props> = ({ onSelectEmployee }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const addPhotoInputRef = useRef<HTMLInputElement>(null);
  const editPhotoInputRef = useRef<HTMLInputElement>(null);

  // Today's date for attendance marking (local timezone)
  const todayDate = getLocalDateString();
  const [attendanceMap, setAttendanceMap] = useState<Record<number, TodayAttendance>>({});
  const [filterStatus, setFilterStatus] = useState<"ALL" | "PRESENT" | "ABSENT">("ALL");

  // Clean Add Employee form with photo
  const [addForm, setAddForm] = useState({
    first_name: "",
    last_name: "",
    work_email: "",
    employee_code: "",
    date_of_joining: todayDate,
    personal_phone: "",
    personal_email: "",
    photo: "",
  });

  // Edit Employee form with photo
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

  const fetchTodayAttendance = useCallback(async () => {
    try {
      const res = await apiClient.get(`/attendance/records/?date_from=${todayDate}&date_to=${todayDate}`);
      const list = Array.isArray(res.data) ? res.data : res.data?.results ?? [];
      const map: Record<number, TodayAttendance> = {};
      list.forEach((r: any) => {
        map[r.employee_id] = {
          id: r.id,
          status: r.status,
          first_in: r.first_in,
          last_out: r.last_out,
          worked_minutes: r.worked_minutes || 0,
          overtime_minutes: r.overtime_minutes || 0,
          clockIn12: to12Hour(r.first_in || "08:00:00"),
          clockOut12: to12Hour(r.last_out || "20:00:00"),
        };
      });
      setAttendanceMap(map);
    } catch {
      // ignore
    }
  }, [todayDate]);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/employees/");
      const data = res.data;
      const list = Array.isArray(data) ? data : data.results ?? [];
      setEmployees(list);
    } catch {
      showToast("Failed to load employees", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCompanies = useCallback(async () => {
    try {
      const compRes = await apiClient.get("/organization/companies/");
      const comps = Array.isArray(compRes.data) ? compRes.data : compRes.data?.results ?? [];
      setCompanies(comps);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
    fetchCompanies();
    fetchTodayAttendance();
  }, [fetchEmployees, fetchCompanies, fetchTodayAttendance]);

  // Attendance Actions on Profile Bar
  const handleMarkPresent = async (empId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const existing = attendanceMap[empId];
    const clockIn12 = existing?.clockIn12 || "08:00 AM";
    const clockOut12 = existing?.clockOut12 || "08:00 PM";
    const { workedMinutes, overtimeMinutes, firstIn24, lastOut24 } = computeShiftAttendance(clockIn12, clockOut12);

    // Optimistic UI update
    setAttendanceMap(prev => ({
      ...prev,
      [empId]: {
        ...prev[empId],
        status: "PRESENT",
        first_in: firstIn24,
        last_out: lastOut24,
        clockIn12,
        clockOut12,
        worked_minutes: workedMinutes,
        overtime_minutes: overtimeMinutes,
      }
    }));

    try {
      const res = await apiClient.post("/attendance/records/", {
        employee_id: empId,
        attendance_date: todayDate,
        status: "PRESENT",
        first_in: firstIn24,
        last_out: lastOut24,
        overtime_minutes: overtimeMinutes,
      });
      if (res.data?.id) {
        setAttendanceMap(prev => ({
          ...prev,
          [empId]: {
            ...prev[empId],
            id: res.data.id,
            worked_minutes: res.data.worked_minutes,
            overtime_minutes: res.data.overtime_minutes,
          }
        }));
      }
      showToast("Marked Present (12h Shift)");
    } catch {
      showToast("Failed to record attendance", "error");
    }
  };

  const handleMarkAbsent = async (empId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    // Optimistic UI update
    setAttendanceMap(prev => ({
      ...prev,
      [empId]: {
        ...prev[empId],
        status: "ABSENT",
        first_in: null,
        last_out: null,
        clockIn12: "08:00 AM",
        clockOut12: "08:00 PM",
        worked_minutes: 0,
        overtime_minutes: 0,
      }
    }));

    try {
      await apiClient.post("/attendance/records/", {
        employee_id: empId,
        attendance_date: todayDate,
        status: "ABSENT",
        first_in: null,
        last_out: null,
        overtime_minutes: 0,
      });
      showToast("Marked Absent");
    } catch {
      showToast("Failed to record absence", "error");
    }
  };

  const handleUpdateTime = async (empId: number, newIn12: string, newOut12: string) => {
    const { workedMinutes, overtimeMinutes, firstIn24, lastOut24 } = computeShiftAttendance(newIn12, newOut12);

    setAttendanceMap(prev => ({
      ...prev,
      [empId]: {
        ...prev[empId],
        status: "PRESENT",
        clockIn12: newIn12,
        clockOut12: newOut12,
        first_in: firstIn24,
        last_out: lastOut24,
        worked_minutes: workedMinutes,
        overtime_minutes: overtimeMinutes,
      }
    }));

    try {
      await apiClient.post("/attendance/records/", {
        employee_id: empId,
        attendance_date: todayDate,
        status: "PRESENT",
        first_in: firstIn24,
        last_out: lastOut24,
        overtime_minutes: overtimeMinutes,
      });
    } catch {
      // silent
    }
  };

  // Photo handlers
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean) => {
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
      if (isEdit) {
        setEditForm(f => ({ ...f, photo: dataUrl }));
      } else {
        setAddForm(f => ({ ...f, photo: dataUrl }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleOpenAddModal = () => {
    const nextCode = `EMP-${String(employees.length + 1).padStart(3, "0")}`;
    setAddForm({
      first_name: "",
      last_name: "",
      work_email: "",
      employee_code: nextCode,
      date_of_joining: todayDate,
      personal_phone: "",
      personal_email: "",
      photo: "",
    });
    setShowAddModal(true);
  };

  const handleCreateEmployee = async () => {
    if (!addForm.first_name || !addForm.last_name || !addForm.work_email || !addForm.employee_code) {
      showToast("First name, last name, email and employee code are required", "error");
      return;
    }

    setSaving(true);
    try {
      const defaultCompanyId = companies[0]?.id || 1;
      const payload = {
        ...addForm,
        company: defaultCompanyId,
      };
      await apiClient.post("/employees/", payload);
      showToast("Employee added successfully!");
      setShowAddModal(false);
      fetchEmployees();
    } catch (e: any) {
      showToast(`Error: ${formatApiError(e)}`, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEdit = (emp: Employee, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingEmployee(emp);
    setEditForm({
      first_name: emp.first_name || "",
      last_name: emp.last_name || "",
      work_email: emp.work_email || "",
      employee_code: emp.employee_code || "",
      date_of_joining: emp.date_of_joining || "",
      personal_phone: emp.personal_phone || "",
      personal_email: emp.personal_email || "",
      is_active: emp.is_active ?? true,
      photo: emp.photo || "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editingEmployee) return;
    setSaving(true);
    try {
      await apiClient.patch(`/employees/${editingEmployee.id}/`, editForm);
      showToast("Employee details updated!");
      setEditingEmployee(null);
      fetchEmployees();
    } catch (e: any) {
      showToast(`Error: ${formatApiError(e)}`, "error");
    } finally {
      setSaving(false);
    }
  };

  const presentCount = Object.values(attendanceMap).filter(a => a.status === "PRESENT").length;
  const absentCount = Object.values(attendanceMap).filter(a => a.status === "ABSENT").length;

  const filtered = employees.filter(e => {
    const q = search.toLowerCase();
    const matchQuery = !q ||
      e.first_name?.toLowerCase().includes(q) ||
      e.last_name?.toLowerCase().includes(q) ||
      e.employee_code?.toLowerCase().includes(q) ||
      e.work_email?.toLowerCase().includes(q) ||
      e.personal_phone?.includes(q);

    if (!matchQuery) return false;

    if (filterStatus === "PRESENT") return attendanceMap[e.id]?.status === "PRESENT";
    if (filterStatus === "ABSENT") return attendanceMap[e.id]?.status === "ABSENT";
    return true;
  });

  const activeCount = employees.filter(e => e.is_active).length;

  return (
    <div className="directory-container animate-fade-in">
      {/* Page Header */}
      <div className="directory-top-bar">
        <div className="directory-title-area">
          <div className="directory-title-row">
            <h2>Staff Directory</h2>
            <span className="directory-count-pill">{activeCount} active</span>
          </div>
          <p className="directory-sub">{employees.length} total staff • 12h Shift System</p>
        </div>
        <div className="directory-btn-group">
          <button
            className="icon-btn-refresh"
            onClick={() => { fetchEmployees(); fetchTodayAttendance(); }}
            title="Refresh"
          >
            <RefreshCw size={15} />
          </button>
          <button
            className="btn-add-staff-header"
            onClick={handleOpenAddModal}
          >
            <Plus size={16} />
            <span>Add Staff</span>
          </button>
        </div>
      </div>

      {/* Full-width Search Bar */}
      <div className="directory-search-wrapper">
        <Search size={16} className="search-icon" />
        <input
          placeholder="Search by employee name or code…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="directory-search-input"
        />
        {search && (
          <button className="search-clear-btn" onClick={() => setSearch("")}>✕</button>
        )}
      </div>

      {/* Quick Filter Chips */}
      <div className="directory-filter-chips">
        <button
          className={`filter-chip ${filterStatus === "ALL" ? "active" : ""}`}
          onClick={() => setFilterStatus("ALL")}
        >
          All Staff ({employees.length})
        </button>
        <button
          className={`filter-chip chip-present ${filterStatus === "PRESENT" ? "active" : ""}`}
          onClick={() => setFilterStatus("PRESENT")}
        >
          <span className="dot dot-active" /> Present Today ({presentCount})
        </button>
        <button
          className={`filter-chip chip-absent ${filterStatus === "ABSENT" ? "active" : ""}`}
          onClick={() => setFilterStatus("ABSENT")}
        >
          <span className="dot dot-inactive" /> Absent ({absentCount})
        </button>
      </div>

      {/* Directory List — Rectangular Bars with Attendance Marking */}
      {loading ? (
        <div className="loading-spinner">
          <RefreshCw size={18} className="spin" />
          <span>Loading employees…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <Users size={48} />
          <h3>No Employees Found</h3>
          <p>{search ? "No match for your search" : "Click 'Add Employee' to register your first team member"}</p>
        </div>
      ) : (
        <div className="emp-bars-container">
          {/* Header Row */}
          <div className="emp-bars-header">
            <span className="col-sr">#</span>
            <span className="col-name">Employee</span>
            <span className="col-code">Code</span>
            <span className="col-att">Today's Attendance · {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} (12h Shift)</span>
            <span className="col-status">Status</span>
            <span className="col-actions">Actions</span>
          </div>

          {filtered.map((emp, index) => {
            const att = attendanceMap[emp.id];
            const isPresent = att?.status === "PRESENT";
            const isAbsent = att?.status === "ABSENT";

            return (
              <div
                key={emp.id}
                className="emp-bar"
                onClick={() => onSelectEmployee(emp)}
                title="Click to view workhub profile"
              >
                <div className="emp-bar-top-row">
                  <div className="emp-bar-top-left">
                    {/* Sr. No. */}
                    <div className="col-sr">
                      <span className="sr-pill">#{String(index + 1).padStart(2, "0")}</span>
                    </div>

                    {/* Avatar & Name */}
                    <div className="col-name">
                      {emp.photo ? (
                        <img src={emp.photo} alt={emp.first_name} className="emp-avatar-img" />
                      ) : (
                        <div className="emp-avatar-sm">{initials(emp)}</div>
                      )}
                      <div className="emp-name-box">
                        <span className="emp-bar-name">{emp.first_name} {emp.last_name}</span>
                      </div>
                    </div>

                    {/* Employee Code */}
                    <div className="col-code">
                      <span className="code-badge">{emp.employee_code}</span>
                    </div>
                  </div>

                  <div className="emp-bar-top-right">
                    {/* Status */}
                    <div className="col-status">
                      <span className={`status-badge-subtle ${emp.is_active ? "active" : "inactive"}`}>
                        <span className={`dot ${emp.is_active ? "dot-active" : "dot-inactive"}`} />
                        {emp.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="col-actions" onClick={e => e.stopPropagation()}>
                      <button
                        className="btn-icon-action"
                        onClick={e => handleOpenEdit(emp, e)}
                        title="Edit Employee"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        className="btn-view-profile"
                        onClick={() => onSelectEmployee(emp)}
                        title="View Profile"
                      >
                        <span>Profile</span>
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Attendance Controls: P / AB in circle + immediate right Clock In/Out */}
                <div className="col-att" onClick={e => e.stopPropagation()}>
                  <div className="att-profile-bar-controls">
                    {/* Present Button */}
                    <button
                      type="button"
                      className={`circle-att-btn p-btn ${isPresent ? "active" : ""}`}
                      onClick={(e) => handleMarkPresent(emp.id, e)}
                      title="Mark Present (P)"
                    >
                      P
                    </button>

                    {/* Absent Button */}
                    <button
                      type="button"
                      className={`circle-att-btn ab-btn ${isAbsent ? "active" : ""}`}
                      onClick={(e) => handleMarkAbsent(emp.id, e)}
                      title="Mark Absent (AB)"
                    >
                      AB
                    </button>

                    {/* Clock In / Out Box on immediate right when Present */}
                    {isPresent && (
                      <div className="clock-inout-box">
                        <Time12Input
                          label="In"
                          value={att.clockIn12 || "08:00 AM"}
                          onChange={(newIn) => handleUpdateTime(emp.id, newIn, att.clockOut12 || "08:00 PM")}
                        />
                        <span className="clock-arrow">→</span>
                        <Time12Input
                          label="Out"
                          value={att.clockOut12 || "08:00 PM"}
                          onChange={(newOut) => handleUpdateTime(emp.id, att.clockIn12 || "08:00 AM", newOut)}
                        />

                        {/* Overtime calculation badge (extra > 30m beyond 12h) */}
                        {att.overtime_minutes > 0 ? (
                          <span
                            className="ot-badge-pill"
                            title={`Exceeded 12h shift by ${att.worked_minutes - 720} mins (>30m threshold). Overtime: ${att.overtime_minutes}m`}
                          >
                            +{Math.floor(att.overtime_minutes / 60)}h {att.overtime_minutes % 60 > 0 ? `${att.overtime_minutes % 60}m ` : ""}OT
                          </span>
                        ) : (
                          <span className="shift-badge-pill" title="Standard 12h Shift (No Overtime)">
                            12h Shift
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Employee Modal (Includes Photo Upload) */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setShowAddModal(false); }}>
          <div className="modal-box">
            <div className="modal-header">
              <h3>Add New Employee</h3>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {/* Photo Upload Row */}
              <div className="form-row photo-upload-row">
                <div className="photo-preview-circle">
                  {addForm.photo ? (
                    <img src={addForm.photo} alt="Preview" className="photo-preview-img" />
                  ) : (
                    <User size={26} color="#94a3b8" />
                  )}
                </div>
                <div className="photo-upload-actions">
                  <label className="form-label" style={{ marginBottom: 4 }}>Employee Photo</label>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      type="file"
                      ref={addPhotoInputRef}
                      style={{ display: "none" }}
                      accept="image/*"
                      onChange={(e) => handlePhotoUpload(e, false)}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary btn-xs"
                      onClick={() => addPhotoInputRef.current?.click()}
                    >
                      <Upload size={12} /> {addForm.photo ? "Change Photo" : "Upload Photo"}
                    </button>
                    {addForm.photo && (
                      <button
                        type="button"
                        className="btn btn-danger btn-xs"
                        onClick={() => setAddForm(f => ({ ...f, photo: "" }))}
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
                    value={addForm.first_name}
                    onChange={e => setAddForm(f => ({ ...f, first_name: e.target.value }))}
                    placeholder="e.g. Ramesh"
                  />
                </div>
                <div className="form-row">
                  <label className="form-label">Last Name *</label>
                  <input
                    className="form-control"
                    value={addForm.last_name}
                    onChange={e => setAddForm(f => ({ ...f, last_name: e.target.value }))}
                    placeholder="e.g. Shinde"
                  />
                </div>
              </div>

              <div className="form-row">
                <label className="form-label">Work Email *</label>
                <input
                  className="form-control"
                  type="email"
                  value={addForm.work_email}
                  onChange={e => setAddForm(f => ({ ...f, work_email: e.target.value }))}
                  placeholder="ramesh.shinde@company.com"
                />
              </div>

              <div className="form-grid-2">
                <div className="form-row">
                  <label className="form-label">Employee Code *</label>
                  <input
                    className="form-control"
                    value={addForm.employee_code}
                    onChange={e => setAddForm(f => ({ ...f, employee_code: e.target.value }))}
                    placeholder="EMP-001"
                  />
                </div>
                <div className="form-row">
                  <label className="form-label">Date of Joining</label>
                  <input
                    className="form-control"
                    type="date"
                    value={addForm.date_of_joining}
                    onChange={e => setAddForm(f => ({ ...f, date_of_joining: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-row">
                  <label className="form-label">Personal Phone</label>
                  <input
                    className="form-control"
                    value={addForm.personal_phone}
                    onChange={e => setAddForm(f => ({ ...f, personal_phone: e.target.value }))}
                    placeholder="+91 98XXXXXXXX"
                  />
                </div>
                <div className="form-row">
                  <label className="form-label">Personal Email</label>
                  <input
                    className="form-control"
                    type="email"
                    value={addForm.personal_email}
                    onChange={e => setAddForm(f => ({ ...f, personal_email: e.target.value }))}
                    placeholder="personal@gmail.com"
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleCreateEmployee} disabled={saving}>
                <Check size={15} /> {saving ? "Saving…" : "Save Employee"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Employee Modal (Includes Photo Upload) */}
      {editingEmployee && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setEditingEmployee(null); }}>
          <div className="modal-box">
            <div className="modal-header">
              <h3>Edit Employee — {editingEmployee.first_name} {editingEmployee.last_name}</h3>
              <button className="modal-close" onClick={() => setEditingEmployee(null)}>✕</button>
            </div>
            <div className="modal-body">
              {/* Photo Upload Row */}
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
                      onChange={(e) => handlePhotoUpload(e, true)}
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
                      name="is_active"
                      checked={editForm.is_active === true}
                      onChange={() => setEditForm(f => ({ ...f, is_active: true }))}
                    />
                    Active
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13.5 }}>
                    <input
                      type="radio"
                      name="is_active"
                      checked={editForm.is_active === false}
                      onChange={() => setEditForm(f => ({ ...f, is_active: false }))}
                    />
                    Inactive
                  </label>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setEditingEmployee(null)}>
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

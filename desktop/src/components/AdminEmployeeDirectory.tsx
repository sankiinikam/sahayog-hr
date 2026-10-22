import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  Users,
  Plus,
  Search,
  ChevronRight,
  RefreshCw,
  Edit2,
  Check,
  Upload,
  Trash2,
  User,
  Phone,
  Briefcase,
  RotateCcw,
  Calendar,
  CreditCard,
  AlertCircle
} from "lucide-react";
import { apiClient } from "../api/client";
import { formatApiError } from "../utils/formatError";
import { getLocalDateString } from "../utils/timeFormat";

export interface Employee {
  id: number;
  employee_code: string;
  first_name: string;
  last_name: string;
  full_name?: string;
  work_email: string;
  personal_email?: string;
  personal_phone?: string;
  work_phone?: string;
  designation?: number | string | null;
  designation_name?: string;
  designation_title?: string;
  date_of_birth?: string | null;
  id_proof_type?: string;
  id_proof_number?: string;
  aadhaar_number?: string;
  pan_number?: string;
  is_active: boolean;
  is_deleted?: boolean;
  deleted_at?: string | null;
  date_of_joining: string;
  photo?: string;
}

interface Company {
  id: number;
  name: string;
}

interface DesignationOption {
  id: number;
  name: string;
}

interface Props {
  onSelectEmployee: (emp: Employee) => void;
}

const initials = (emp: Employee) =>
  ((emp.first_name?.[0] || "") + (emp.last_name?.[0] || "")).toUpperCase() || "??";

export const AdminEmployeeDirectory: React.FC<Props> = ({ onSelectEmployee }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showDeleted, setShowDeleted] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [designations, setDesignations] = useState<DesignationOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const addPhotoInputRef = useRef<HTMLInputElement>(null);
  const editPhotoInputRef = useRef<HTMLInputElement>(null);

  const todayDate = getLocalDateString();

  // Add Employee Form State
  const [addForm, setAddForm] = useState({
    first_name: "",
    last_name: "",
    work_email: "",
    employee_code: "",
    date_of_joining: todayDate,
    date_of_birth: "",
    designation: "",
    id_proof_type: "Aadhaar",
    id_proof_number: "",
    personal_phone: "",
    personal_email: "",
    photo: "",
  });

  // Edit Employee Form State
  const [editForm, setEditForm] = useState({
    first_name: "",
    last_name: "",
    work_email: "",
    employee_code: "",
    date_of_joining: "",
    date_of_birth: "",
    designation: "",
    id_proof_type: "Aadhaar",
    id_proof_number: "",
    personal_phone: "",
    personal_email: "",
    photo: "",
  });

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      // Pass show_deleted=true so we know about both active and soft-deleted records
      const res = await apiClient.get("/employees/?show_deleted=true");
      const data = res.data;
      const list = Array.isArray(data) ? data : data.results ?? [];
      setEmployees(list);
    } catch {
      showToast("Failed to load employees", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMetadata = useCallback(async () => {
    try {
      const [compRes, desigRes] = await Promise.allSettled([
        apiClient.get("/organization/companies/"),
        apiClient.get("/organization/designations/"),
      ]);
      if (compRes.status === "fulfilled") {
        const comps = Array.isArray(compRes.value.data) ? compRes.value.data : compRes.value.data?.results ?? [];
        setCompanies(comps);
      }
      if (desigRes.status === "fulfilled") {
        const desigs = Array.isArray(desigRes.value.data) ? desigRes.value.data : desigRes.value.data?.results ?? [];
        setDesignations(desigs);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
    fetchMetadata();
  }, [fetchEmployees, fetchMetadata]);

  // Photo upload helper
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
        setEditForm((f) => ({ ...f, photo: dataUrl }));
      } else {
        setAddForm((f) => ({ ...f, photo: dataUrl }));
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
      date_of_birth: "",
      designation: designations[0]?.name || "Staff Member",
      id_proof_type: "Aadhaar",
      id_proof_number: "",
      personal_phone: "",
      personal_email: "",
      photo: "",
    });
    setShowAddModal(true);
  };

  const handleCreateEmployee = async () => {
    if (!addForm.first_name || !addForm.last_name || !addForm.work_email || !addForm.employee_code) {
      showToast("First name, last name, work email and employee code are required", "error");
      return;
    }

    setSaving(true);
    try {
      const defaultCompanyId = companies[0]?.id || 1;
      const payload: any = {
        ...addForm,
        company: defaultCompanyId,
      };

      // Check if selected designation matches an ID or name
      const matchedDesig = designations.find(
        (d) => d.name.toLowerCase() === addForm.designation.toLowerCase() || String(d.id) === String(addForm.designation)
      );
      if (matchedDesig) {
        payload.designation = matchedDesig.id;
      }

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
      date_of_birth: emp.date_of_birth || "",
      designation: emp.designation_name || emp.designation_title || "",
      id_proof_type: emp.id_proof_type || "Aadhaar",
      id_proof_number: emp.id_proof_number || emp.aadhaar_number || emp.pan_number || "",
      personal_phone: emp.personal_phone || emp.work_phone || "",
      personal_email: emp.personal_email || "",
      photo: emp.photo || "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editingEmployee) return;
    setSaving(true);
    try {
      const payload: any = { ...editForm };
      const matchedDesig = designations.find(
        (d) => d.name.toLowerCase() === editForm.designation.toLowerCase() || String(d.id) === String(editForm.designation)
      );
      if (matchedDesig) {
        payload.designation = matchedDesig.id;
      }

      await apiClient.patch(`/employees/${editingEmployee.id}/`, payload);
      showToast("Employee details updated!");
      setEditingEmployee(null);
      fetchEmployees();
    } catch (e: any) {
      showToast(`Error: ${formatApiError(e)}`, "error");
    } finally {
      setSaving(false);
    }
  };

  // Soft Delete Handler
  const handleConfirmDelete = async () => {
    if (!deletingEmployee) return;
    setSaving(true);
    try {
      await apiClient.delete(`/employees/${deletingEmployee.id}/`);
      showToast(`Employee ${deletingEmployee.first_name} ${deletingEmployee.last_name} archived.`);
      setDeletingEmployee(null);
      fetchEmployees();
    } catch (e: any) {
      showToast(`Failed to archive employee: ${formatApiError(e)}`, "error");
    } finally {
      setSaving(false);
    }
  };

  // Restore Soft-Deleted Employee Handler
  const handleRestore = async (emp: Employee, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiClient.post(`/employees/${emp.id}/restore/`);
      showToast(`Restored ${emp.first_name} ${emp.last_name} to active staff!`);
      fetchEmployees();
    } catch (e: any) {
      showToast(`Failed to restore: ${formatApiError(e)}`, "error");
    }
  };

  // Filter employees
  const activeEmployees = employees.filter((e) => !e.is_deleted);
  const deletedEmployees = employees.filter((e) => e.is_deleted);

  const displayedEmployees = employees.filter((e) => {
    // Respect showDeleted toggle
    if (!showDeleted && e.is_deleted) return false;
    if (showDeleted && !e.is_deleted) return false; // When viewing deleted list, only show deleted

    const q = search.toLowerCase();
    const desigText = (e.designation_name || e.designation_title || "").toLowerCase();
    const phoneText = e.personal_phone || e.work_phone || "";

    const matchesSearch =
      !q ||
      e.first_name?.toLowerCase().includes(q) ||
      e.last_name?.toLowerCase().includes(q) ||
      e.employee_code?.toLowerCase().includes(q) ||
      e.work_email?.toLowerCase().includes(q) ||
      phoneText.includes(q) ||
      desigText.includes(q);

    return matchesSearch;
  });

  return (
    <div className="directory-container animate-fade-in">
      {/* Page Header */}
      <div className="directory-top-bar">
        <div className="directory-title-area">
          <div className="directory-title-row">
            <h2>Staff Directory</h2>
            <span className="directory-count-pill">{activeEmployees.length} Active Staff</span>
            {deletedEmployees.length > 0 && (
              <span className="directory-count-pill pill-archived">
                {deletedEmployees.length} Archived in Database
              </span>
            )}
          </div>
          <p className="directory-sub">
            Corporate employee roster with designation details, contact information, and ID records
          </p>
        </div>
        <div className="directory-btn-group">
          <button
            className="icon-btn-refresh"
            onClick={fetchEmployees}
            title="Refresh Directory"
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? "spin" : ""} />
          </button>
          <button className="btn-add-staff-header" onClick={handleOpenAddModal}>
            <Plus size={16} />
            <span>Add Staff</span>
          </button>
        </div>
      </div>

      {/* Full-width Search Bar & Deleted Users Checkbox Toggle */}
      <div className="directory-filter-row">
        <div className="directory-search-wrapper">
          <Search size={16} className="search-icon" />
          <input
            placeholder="Search by name, employee code, designation, or phone number…"
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

        {/* User-friendly Checkbox for Deleted Users */}
        <div className="deleted-filter-toggle">
          <label className="checkbox-toggle-label" title="View employees that were previously with the company">
            <input
              type="checkbox"
              checked={showDeleted}
              onChange={(e) => setShowDeleted(e.target.checked)}
              className="styled-checkbox"
            />
            <span className="toggle-text">
              Show Deleted Users {deletedEmployees.length > 0 && `(${deletedEmployees.length})`}
            </span>
          </label>
        </div>
      </div>

      {/* Notice banner when viewing deleted list */}
      {showDeleted && (
        <div className="deleted-view-banner">
          <AlertCircle size={16} />
          <span>
            Viewing <strong>Archived / Deleted Employees</strong>. These employee records and their attendance/payroll history remain safely preserved in the database.
          </span>
          <button className="btn-link-action" onClick={() => setShowDeleted(false)}>
            Back to Active Staff
          </button>
        </div>
      )}

      {/* Directory List — Rectangular Staff Bars */}
      {loading ? (
        <div className="loading-spinner">
          <RefreshCw size={18} className="spin" />
          <span>Loading staff directory…</span>
        </div>
      ) : displayedEmployees.length === 0 ? (
        <div className="empty-state">
          <Users size={48} />
          <h3>{showDeleted ? "No Deleted Employees" : "No Employees Found"}</h3>
          <p>
            {showDeleted
              ? "There are currently no archived or deleted staff members in the database."
              : search
              ? "No staff members matched your search criteria."
              : "Click '+ Add Staff' to register your first company team member."}
          </p>
        </div>
      ) : (
        <div className="emp-bars-container">
          {/* Header Row — Pure Employee Information (No Attendance, No Status) */}
          <div className="emp-directory-header">
            <span className="col-sr">#</span>
            <span className="col-emp-name">Employee</span>
            <span className="col-emp-code">Code</span>
            <span className="col-emp-desig">Designation</span>
            <span className="col-emp-contact">Contact Number</span>
            <span className="col-emp-doj">Joining Date</span>
            <span className="col-emp-actions">Actions</span>
          </div>

          {displayedEmployees.map((emp, index) => {
            const desig = emp.designation_name || emp.designation_title || "Staff Member";
            const contactPhone = emp.personal_phone || emp.work_phone || "—";
            const isArchived = Boolean(emp.is_deleted);

            return (
              <div
                key={emp.id}
                className={`emp-directory-bar ${isArchived ? "emp-bar-archived" : ""}`}
                onClick={() => onSelectEmployee(emp)}
                title="Click to view full workhub profile"
              >
                {/* 1. Sr. No */}
                <div className="col-sr">
                  <span className="sr-pill">#{String(index + 1).padStart(2, "0")}</span>
                </div>

                {/* 2. Employee Avatar & Name */}
                <div className="col-emp-name">
                  {emp.photo ? (
                    <img src={emp.photo} alt={emp.first_name} className="emp-avatar-img" />
                  ) : (
                    <div className="emp-avatar-sm">{initials(emp)}</div>
                  )}
                  <div className="emp-name-box">
                    <span className="emp-bar-name">
                      {emp.first_name} {emp.last_name}
                      {isArchived && <span className="archived-inline-tag">Archived</span>}
                    </span>
                    <span className="emp-bar-email">{emp.work_email}</span>
                  </div>
                </div>

                {/* 3. Employee Code */}
                <div className="col-emp-code">
                  <span className="code-badge">{emp.employee_code}</span>
                </div>

                {/* 4. Designation */}
                <div className="col-emp-desig">
                  <div className="desig-pill-wrapper">
                    <Briefcase size={13} className="desig-icon" />
                    <span className="desig-title-text">{desig}</span>
                  </div>
                </div>

                {/* 5. Contact Number */}
                <div className="col-emp-contact">
                  <div className="contact-pill-wrapper">
                    <Phone size={13} className="contact-icon" />
                    {contactPhone !== "—" ? (
                      <a
                        href={`tel:${contactPhone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="contact-number-text"
                        title="Tap to call worker"
                      >
                        {contactPhone}
                      </a>
                    ) : (
                      <span className="contact-number-text">{contactPhone}</span>
                    )}
                  </div>
                </div>

                {/* 6. Date of Joining */}
                <div className="col-emp-doj">
                  <span className="doj-text">{emp.date_of_joining || "—"}</span>
                </div>

                {/* 7. Actions */}
                <div className="col-emp-actions" onClick={(e) => e.stopPropagation()}>
                  {isArchived ? (
                    <button
                      className="btn-restore-action"
                      onClick={(e) => handleRestore(emp, e)}
                      title="Restore Employee to Active List"
                    >
                      <RotateCcw size={13} />
                      <span>Restore</span>
                    </button>
                  ) : (
                    <>
                      <button
                        className="btn-icon-action"
                        onClick={(e) => handleOpenEdit(emp, e)}
                        title="Edit Employee"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        className="btn-icon-action btn-danger-action"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingEmployee(emp);
                        }}
                        title="Archive / Delete Employee"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
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
            );
          })}
        </div>
      )}

      {/* Add Employee Modal (Includes DOB, Designation, ID Proof, Contact Number, Photo) */}
      {showAddModal && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddModal(false);
          }}
        >
          <div className="modal-box modal-box-lg">
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Users size={18} color="#2563eb" />
                <h3>Add New Employee</h3>
              </div>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              {/* Photo Upload Row */}
              <div className="form-row photo-upload-row">
                <div className="photo-preview-circle">
                  {addForm.photo ? (
                    <img src={addForm.photo} alt="Preview" className="photo-preview-img" />
                  ) : (
                    <User size={28} color="#94a3b8" />
                  )}
                </div>
                <div className="photo-upload-actions">
                  <label className="form-label" style={{ marginBottom: 4 }}>
                    Employee Profile Photo
                  </label>
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
                        onClick={() => setAddForm((f) => ({ ...f, photo: "" }))}
                      >
                        <Trash2 size={12} /> Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Name fields */}
              <div className="form-grid-2">
                <div className="form-row">
                  <label className="form-label">First Name *</label>
                  <input
                    className="form-control"
                    value={addForm.first_name}
                    onChange={(e) => setAddForm((f) => ({ ...f, first_name: e.target.value }))}
                    placeholder="e.g. Rahul"
                  />
                </div>
                <div className="form-row">
                  <label className="form-label">Last Name *</label>
                  <input
                    className="form-control"
                    value={addForm.last_name}
                    onChange={(e) => setAddForm((f) => ({ ...f, last_name: e.target.value }))}
                    placeholder="e.g. Deshmukh"
                  />
                </div>
              </div>

              {/* Work Email & Employee Code */}
              <div className="form-grid-2">
                <div className="form-row">
                  <label className="form-label">Work Email *</label>
                  <input
                    className="form-control"
                    type="email"
                    value={addForm.work_email}
                    onChange={(e) => setAddForm((f) => ({ ...f, work_email: e.target.value }))}
                    placeholder="rahul.deshmukh@sahayog.local"
                  />
                </div>
                <div className="form-row">
                  <label className="form-label">Employee Code *</label>
                  <input
                    className="form-control"
                    value={addForm.employee_code}
                    onChange={(e) => setAddForm((f) => ({ ...f, employee_code: e.target.value }))}
                    placeholder="EMP-001"
                  />
                </div>
              </div>

              {/* Designation & Contact Number (Personal Phone) */}
              <div className="form-grid-2">
                <div className="form-row">
                  <label className="form-label">
                    <Briefcase size={12} style={{ marginRight: 4, display: "inline" }} />
                    Designation *
                  </label>
                  <input
                    className="form-control"
                    list="designation-suggestions"
                    value={addForm.designation}
                    onChange={(e) => setAddForm((f) => ({ ...f, designation: e.target.value }))}
                    placeholder="e.g. Senior Software Engineer"
                  />
                  <datalist id="designation-suggestions">
                    {designations.map((d) => (
                      <option key={d.id} value={d.name} />
                    ))}
                  </datalist>
                </div>
                <div className="form-row">
                  <label className="form-label">
                    <Phone size={12} style={{ marginRight: 4, display: "inline" }} />
                    Contact Number *
                  </label>
                  <input
                    className="form-control"
                    value={addForm.personal_phone}
                    onChange={(e) => setAddForm((f) => ({ ...f, personal_phone: e.target.value }))}
                    placeholder="+91 98221 11223"
                  />
                </div>
              </div>

              {/* Date of Birth (DOB) & Date of Joining */}
              <div className="form-grid-2">
                <div className="form-row">
                  <label className="form-label">
                    <Calendar size={12} style={{ marginRight: 4, display: "inline" }} />
                    Date of Birth (DOB)
                  </label>
                  <input
                    className="form-control"
                    type="date"
                    value={addForm.date_of_birth}
                    onChange={(e) => setAddForm((f) => ({ ...f, date_of_birth: e.target.value }))}
                  />
                </div>
                <div className="form-row">
                  <label className="form-label">
                    <Calendar size={12} style={{ marginRight: 4, display: "inline" }} />
                    Date of Joining
                  </label>
                  <input
                    className="form-control"
                    type="date"
                    value={addForm.date_of_joining}
                    onChange={(e) => setAddForm((f) => ({ ...f, date_of_joining: e.target.value }))}
                  />
                </div>
              </div>

              {/* ID Proof Type & ID Proof Number */}
              <div className="form-grid-2">
                <div className="form-row">
                  <label className="form-label">
                    <CreditCard size={12} style={{ marginRight: 4, display: "inline" }} />
                    ID Proof Type
                  </label>
                  <select
                    className="form-control"
                    value={addForm.id_proof_type}
                    onChange={(e) => setAddForm((f) => ({ ...f, id_proof_type: e.target.value }))}
                  >
                    <option value="Aadhaar">Aadhaar Card</option>
                    <option value="PAN">PAN Card</option>
                    <option value="Passport">Passport</option>
                    <option value="Voter ID">Voter ID</option>
                    <option value="Driving License">Driving License</option>
                  </select>
                </div>
                <div className="form-row">
                  <label className="form-label">ID Proof Number</label>
                  <input
                    className="form-control"
                    value={addForm.id_proof_number}
                    onChange={(e) => setAddForm((f) => ({ ...f, id_proof_number: e.target.value }))}
                    placeholder={addForm.id_proof_type === "Aadhaar" ? "XXXX-XXXX-XXXX" : "ABCDE1234F"}
                  />
                </div>
              </div>

              {/* Personal Email */}
              <div className="form-row">
                <label className="form-label">Personal Email</label>
                <input
                  className="form-control"
                  type="email"
                  value={addForm.personal_email}
                  onChange={(e) => setAddForm((f) => ({ ...f, personal_email: e.target.value }))}
                  placeholder="personal@gmail.com"
                />
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

      {/* Edit Employee Modal */}
      {editingEmployee && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingEmployee(null);
          }}
        >
          <div className="modal-box modal-box-lg">
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Edit2 size={18} color="#2563eb" />
                <h3>
                  Edit Employee — {editingEmployee.first_name} {editingEmployee.last_name}
                </h3>
              </div>
              <button className="modal-close" onClick={() => setEditingEmployee(null)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              {/* Photo Upload in Edit Modal */}
              <div className="form-row photo-upload-row">
                <div className="photo-preview-circle">
                  {editForm.photo ? (
                    <img src={editForm.photo} alt="Preview" className="photo-preview-img" />
                  ) : (
                    <User size={28} color="#94a3b8" />
                  )}
                </div>
                <div className="photo-upload-actions">
                  <label className="form-label" style={{ marginBottom: 4 }}>
                    Employee Profile Photo
                  </label>
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
                        onClick={() => setEditForm((f) => ({ ...f, photo: "" }))}
                      >
                        <Trash2 size={12} /> Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Name fields */}
              <div className="form-grid-2">
                <div className="form-row">
                  <label className="form-label">First Name *</label>
                  <input
                    className="form-control"
                    value={editForm.first_name}
                    onChange={(e) => setEditForm((f) => ({ ...f, first_name: e.target.value }))}
                  />
                </div>
                <div className="form-row">
                  <label className="form-label">Last Name *</label>
                  <input
                    className="form-control"
                    value={editForm.last_name}
                    onChange={(e) => setEditForm((f) => ({ ...f, last_name: e.target.value }))}
                  />
                </div>
              </div>

              {/* Work Email & Employee Code */}
              <div className="form-grid-2">
                <div className="form-row">
                  <label className="form-label">Work Email *</label>
                  <input
                    className="form-control"
                    type="email"
                    value={editForm.work_email}
                    onChange={(e) => setEditForm((f) => ({ ...f, work_email: e.target.value }))}
                  />
                </div>
                <div className="form-row">
                  <label className="form-label">Employee Code *</label>
                  <input
                    className="form-control"
                    value={editForm.employee_code}
                    onChange={(e) => setEditForm((f) => ({ ...f, employee_code: e.target.value }))}
                  />
                </div>
              </div>

              {/* Designation & Contact Number */}
              <div className="form-grid-2">
                <div className="form-row">
                  <label className="form-label">
                    <Briefcase size={12} style={{ marginRight: 4, display: "inline" }} />
                    Designation
                  </label>
                  <input
                    className="form-control"
                    list="edit-designation-suggestions"
                    value={editForm.designation}
                    onChange={(e) => setEditForm((f) => ({ ...f, designation: e.target.value }))}
                  />
                  <datalist id="edit-designation-suggestions">
                    {designations.map((d) => (
                      <option key={d.id} value={d.name} />
                    ))}
                  </datalist>
                </div>
                <div className="form-row">
                  <label className="form-label">
                    <Phone size={12} style={{ marginRight: 4, display: "inline" }} />
                    Contact Number
                  </label>
                  <input
                    className="form-control"
                    value={editForm.personal_phone}
                    onChange={(e) => setEditForm((f) => ({ ...f, personal_phone: e.target.value }))}
                  />
                </div>
              </div>

              {/* Date of Birth & Joining Date */}
              <div className="form-grid-2">
                <div className="form-row">
                  <label className="form-label">
                    <Calendar size={12} style={{ marginRight: 4, display: "inline" }} />
                    Date of Birth (DOB)
                  </label>
                  <input
                    className="form-control"
                    type="date"
                    value={editForm.date_of_birth}
                    onChange={(e) => setEditForm((f) => ({ ...f, date_of_birth: e.target.value }))}
                  />
                </div>
                <div className="form-row">
                  <label className="form-label">
                    <Calendar size={12} style={{ marginRight: 4, display: "inline" }} />
                    Date of Joining
                  </label>
                  <input
                    className="form-control"
                    type="date"
                    value={editForm.date_of_joining}
                    onChange={(e) => setEditForm((f) => ({ ...f, date_of_joining: e.target.value }))}
                  />
                </div>
              </div>

              {/* ID Proof Type & Number */}
              <div className="form-grid-2">
                <div className="form-row">
                  <label className="form-label">
                    <CreditCard size={12} style={{ marginRight: 4, display: "inline" }} />
                    ID Proof Type
                  </label>
                  <select
                    className="form-control"
                    value={editForm.id_proof_type}
                    onChange={(e) => setEditForm((f) => ({ ...f, id_proof_type: e.target.value }))}
                  >
                    <option value="Aadhaar">Aadhaar Card</option>
                    <option value="PAN">PAN Card</option>
                    <option value="Passport">Passport</option>
                    <option value="Voter ID">Voter ID</option>
                    <option value="Driving License">Driving License</option>
                  </select>
                </div>
                <div className="form-row">
                  <label className="form-label">ID Proof Number</label>
                  <input
                    className="form-control"
                    value={editForm.id_proof_number}
                    onChange={(e) => setEditForm((f) => ({ ...f, id_proof_number: e.target.value }))}
                  />
                </div>
              </div>

              {/* Personal Email */}
              <div className="form-row">
                <label className="form-label">Personal Email</label>
                <input
                  className="form-control"
                  type="email"
                  value={editForm.personal_email}
                  onChange={(e) => setEditForm((f) => ({ ...f, personal_email: e.target.value }))}
                />
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

      {/* Soft Delete Confirmation Modal */}
      {deletingEmployee && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeletingEmployee(null);
          }}
        >
          <div className="modal-box modal-box-confirm">
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Trash2 size={18} color="#dc2626" />
                <h3>Archive / Delete Employee</h3>
              </div>
              <button className="modal-close" onClick={() => setDeletingEmployee(null)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 14, color: "#1e293b", lineHeight: 1.5 }}>
                Are you sure you want to archive <strong>{deletingEmployee.first_name} {deletingEmployee.last_name}</strong> (Code: <code>{deletingEmployee.employee_code}</code>)?
              </p>
              <div className="archive-info-box">
                <AlertCircle size={16} color="#d97706" />
                <div style={{ fontSize: 12.5, color: "#92400e" }}>
                  <strong>Data Safety Guarantee:</strong> The employee will be hidden from the active roster, but all historical records (attendance, payslips, leaves, and documents) will remain permanently stored in the database. You can view or restore them at any time by checking <em>"Show Deleted Users"</em>.
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeletingEmployee(null)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleConfirmDelete} disabled={saving}>
                <Trash2 size={14} /> {saving ? "Archiving…" : "Confirm Archive"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </div>
  );
};

export default AdminEmployeeDirectory;

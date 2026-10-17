import React, { useEffect, useState } from "react";
import { apiClient } from "../api/client";
import { Users, Search, Plus, RefreshCw, X, Building2, UserPlus } from "lucide-react";

export const EmployeeDirectory: React.FC = () => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [departments, setDepartments] = useState<any[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);

  // New employee form state
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    work_email: "",
    employee_code: "",
    department: "",
    designation: "",
    company: "",
    date_of_joining: new Date().toISOString().split("T")[0],
    employment_type: "FULL_TIME",
    employment_status: "PROBATION",
  });

  // Quick company creation form state
  const [newCompanyData, setNewCompanyData] = useState({
    name: "",
    registration_number: "",
    city: "Pune",
    state: "Maharashtra",
  });

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/employees/", {
        params: search ? { search } : {},
      });
      const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
      setEmployees(data);
    } catch (err) {
      console.error("Failed to load employees", err);
    } finally {
      setLoading(false);
    }
  };

  const loadMetadata = async () => {
    try {
      const [deptRes, desigRes, compRes] = await Promise.all([
        apiClient.get("/organization/departments/"),
        apiClient.get("/organization/designations/"),
        apiClient.get("/organization/companies/"),
      ]);
      const depts = Array.isArray(deptRes.data) ? deptRes.data : (deptRes.data.results || []);
      const desigs = Array.isArray(desigRes.data) ? desigRes.data : (desigRes.data.results || []);
      const comps = Array.isArray(compRes.data) ? compRes.data : (compRes.data.results || []);

      setDepartments(depts);
      setDesignations(desigs);
      setCompanies(comps);

      if (comps.length > 0) {
        setFormData((prev) => ({
          ...prev,
          company: prev.company || comps[0].id,
          department: prev.department || (depts[0]?.id || ""),
          designation: prev.designation || (desigs[0]?.id || ""),
        }));
      }
    } catch (err) {
      console.error("Failed to load metadata", err);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [search]);

  useEffect(() => {
    loadMetadata();
  }, []);

  const handleOpenAddModal = () => {
    if (companies.length > 0 && !formData.company) {
      setFormData((prev) => ({
        ...prev,
        company: companies[0].id,
        department: prev.department || (departments[0]?.id || ""),
        designation: prev.designation || (designations[0]?.id || ""),
      }));
    }
    setShowModal(true);
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiClient.post("/organization/companies/", newCompanyData);
      const createdComp = res.data;
      setCompanies((prev) => [...prev, createdComp]);
      setFormData((prev) => ({ ...prev, company: createdComp.id }));
      setShowCompanyModal(false);
      setNewCompanyData({ name: "", registration_number: "", city: "Pune", state: "Maharashtra" });
      loadMetadata();
    } catch (err: any) {
      alert("Error creating company: " + JSON.stringify(err.response?.data || err.message));
    }
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiClient.post("/employees/", formData);
      setShowModal(false);
      setFormData({
        first_name: "",
        last_name: "",
        work_email: "",
        employee_code: "",
        department: departments[0]?.id || "",
        designation: designations[0]?.id || "",
        company: companies[0]?.id || "",
        date_of_joining: new Date().toISOString().split("T")[0],
        employment_type: "FULL_TIME",
        employment_status: "PROBATION",
      });
      fetchEmployees();
    } catch (err: any) {
      alert("Error creating employee: " + JSON.stringify(err.response?.data || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="directory-container">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h2>Employee Directory</h2>
          <p>Manage, onboard, and oversee organization employee records</p>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={fetchEmployees}>
            <RefreshCw size={16} /> Refresh
          </button>
          <button className="btn-primary" onClick={handleOpenAddModal}>
            <UserPlus size={16} /> Add Employee
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <div className="search-box">
          <Search size={18} color="#475569" />
          <input
            type="text"
            placeholder="Search by name, employee code or work email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div style={{ marginLeft: "auto", fontSize: "0.88rem", fontWeight: 700, color: "var(--text-heading)" }}>
          {employees.length} {employees.length === 1 ? "Employee" : "Employees"} Found
        </div>
      </div>

      {/* Employee List Table */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "48px", background: "#fff", borderRadius: "14px", border: "1px solid var(--border)" }}>
          <RefreshCw className="spin" size={32} color="#2563eb" style={{ margin: "0 auto 12px" }} />
          <p style={{ color: "var(--text-heading)", fontWeight: 700 }}>Loading employee records...</p>
        </div>
      ) : employees.length === 0 ? (
        <div style={{ textAlign: "center", padding: "64px 24px", background: "#fff", borderRadius: "14px", border: "1px solid var(--border)" }}>
          <Users size={56} color="#94a3b8" style={{ margin: "0 auto 16px" }} />
          <h3 style={{ marginBottom: "6px" }}>No employee records found</h3>
          <p style={{ color: "var(--text-muted)", marginBottom: "20px" }}>Get started by onboarding the first team member to Sahayog HR.</p>
          <button className="btn-primary" onClick={handleOpenAddModal}>
            <Plus size={16} /> Onboard First Employee
          </button>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Employee Name</th>
                <th>Department</th>
                <th>Designation</th>
                <th>Status</th>
                <th>Joining Date</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id}>
                  <td>
                    <span style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--primary)" }}>
                      {emp.employee_code}
                    </span>
                  </td>
                  <td>
                    <div className="emp-name-cell">
                      <strong>{emp.first_name} {emp.last_name}</strong>
                      <small>{emp.work_email}</small>
                    </div>
                  </td>
                  <td style={{ fontWeight: 600, color: "var(--text-heading)" }}>{emp.department_name || "—"}</td>
                  <td style={{ fontWeight: 600, color: "var(--text-heading)" }}>{emp.designation_name || "—"}</td>
                  <td>
                    <span className={`status-badge status-${(emp.employment_status || "PROBATION").toLowerCase()}`}>
                      {emp.employment_status}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600, color: "var(--text-heading)" }}>{emp.date_of_joining}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Add Employee */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <div>
                <h3>Onboard New Employee</h3>
                <p>Enter personal details and assign organizational placement</p>
              </div>
              <button className="btn-close" onClick={() => setShowModal(false)} type="button">
                <X size={18} />
              </button>
            </div>

            {companies.length === 0 && (
              <div style={{ background: "#FEF3C7", border: "1.5px solid #FDE68A", padding: "14px 16px", borderRadius: "10px", marginBottom: "18px" }}>
                <p style={{ color: "#92400E", fontWeight: 700, fontSize: "0.88rem" }}>
                  No companies exist in the system yet.
                </p>
                <button
                  type="button"
                  className="btn-primary btn-saffron"
                  style={{ marginTop: "8px", padding: "6px 12px", fontSize: "0.82rem" }}
                  onClick={() => setShowCompanyModal(true)}
                >
                  <Plus size={14} /> Quick Add Company
                </button>
              </div>
            )}

            <form onSubmit={handleCreateEmployee}>
              <div className="form-row">
                <div className="form-group">
                  <label>First Name <span style={{ color: "#ef4444" }}>*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Last Name <span style={{ color: "#ef4444" }}>*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Deshmukh"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Employee Code <span style={{ color: "#ef4444" }}>*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. EMP-001"
                    value={formData.employee_code}
                    onChange={(e) => setFormData({ ...formData, employee_code: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Work Email <span style={{ color: "#ef4444" }}>*</span></label>
                  <input
                    type="email"
                    required
                    placeholder="rahul.deshmukh@sahayog.local"
                    value={formData.work_email}
                    onChange={(e) => setFormData({ ...formData, work_email: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>
                    Company <span style={{ color: "#ef4444" }}>*</span>
                    {companies.length > 0 && (
                      <span
                        style={{ fontSize: "0.78rem", color: "var(--primary)", cursor: "pointer", fontWeight: 700 }}
                        onClick={() => setShowCompanyModal(true)}
                      >
                        + Add New
                      </span>
                    )}
                  </label>
                  <select
                    required
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  >
                    <option value="">Select Company</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Department</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  >
                    <option value="">Select Department</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Designation</label>
                  <select
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  >
                    <option value="">Select Designation</option>
                    {designations.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Joining Date</label>
                  <input
                    type="date"
                    required
                    value={formData.date_of_joining}
                    onChange={(e) => setFormData({ ...formData, date_of_joining: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Employment Type</label>
                  <select
                    value={formData.employment_type}
                    onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })}
                  >
                    <option value="FULL_TIME">Full Time</option>
                    <option value="PART_TIME">Part Time</option>
                    <option value="CONTRACT">Contract</option>
                    <option value="INTERN">Intern</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Employment Status</label>
                  <select
                    value={formData.employment_status}
                    onChange={(e) => setFormData({ ...formData, employment_status: e.target.value })}
                  >
                    <option value="PROBATION">Probation</option>
                    <option value="CONFIRMED">Confirmed</option>
                    <option value="NOTICE_PERIOD">Notice Period</option>
                  </select>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  <UserPlus size={16} /> {submitting ? "Onboarding..." : "Onboard Employee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Quick Create Company */}
      {showCompanyModal && (
        <div className="modal-backdrop" style={{ zIndex: 1100 }}>
          <div className="modal-card" style={{ width: "460px" }}>
            <div className="modal-header">
              <div>
                <h3>Add Company / Subsidiary</h3>
                <p>Register a company entity under Sahayog HR</p>
              </div>
              <button className="btn-close" onClick={() => setShowCompanyModal(false)} type="button">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateCompany}>
              <div className="form-group">
                <label>Company Legal Name <span style={{ color: "#ef4444" }}>*</span></label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sahayog Tech Solutions Pvt. Ltd."
                  value={newCompanyData.name}
                  onChange={(e) => setNewCompanyData({ ...newCompanyData, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Registration / CIN Number <span style={{ color: "#ef4444" }}>*</span></label>
                <input
                  type="text"
                  required
                  placeholder="e.g. U72900MH2026PTC998877"
                  value={newCompanyData.registration_number}
                  onChange={(e) => setNewCompanyData({ ...newCompanyData, registration_number: e.target.value })}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>City</label>
                  <input
                    type="text"
                    value={newCompanyData.city}
                    onChange={(e) => setNewCompanyData({ ...newCompanyData, city: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>State</label>
                  <input
                    type="text"
                    value={newCompanyData.state}
                    onChange={(e) => setNewCompanyData({ ...newCompanyData, state: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowCompanyModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  <Building2 size={16} /> Save Company
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

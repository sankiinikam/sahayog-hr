import React, { useEffect, useState, useCallback, useRef } from "react";
import { Building2, Edit2, Upload, Trash2, Mail, Phone, Globe, MapPin, FileText, Check, RefreshCw } from "lucide-react";
import { apiClient } from "../api/client";
import { formatApiError } from "../utils/formatError";

interface Company {
  id: number;
  name: string;
  registration_number: string;
  pan_number?: string;
  gst_number?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  phone?: string;
  email?: string;
  website?: string;
  currency_code?: string;
  financial_year_start?: string;
}

export const CompanyProfile: React.FC = () => {
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Logo stored persistently in localStorage
  const [logoUrl, setLogoUrl] = useState<string>(() => {
    return localStorage.getItem("company_logo") || "";
  });

  const [form, setForm] = useState({
    name: "",
    registration_number: "",
    pan_number: "",
    gst_number: "",
    address: "",
    city: "",
    state: "",
    country: "India",
    postal_code: "",
    phone: "",
    email: "",
    website: "",
    currency_code: "INR",
  });

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchCompany = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/organization/companies/");
      const list: Company[] = Array.isArray(res.data) ? res.data : res.data?.results ?? [];
      if (list.length > 0) {
        setCompany(list[0]);
        setForm({
          name: list[0].name || "",
          registration_number: list[0].registration_number || "",
          pan_number: list[0].pan_number || "",
          gst_number: list[0].gst_number || "",
          address: list[0].address || "",
          city: list[0].city || "",
          state: list[0].state || "",
          country: list[0].country || "India",
          postal_code: list[0].postal_code || "",
          phone: list[0].phone || "",
          email: list[0].email || "",
          website: list[0].website || "",
          currency_code: list[0].currency_code || "INR",
        });
      }
    } catch {
      showToast("Failed to load company profile", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompany();
  }, [fetchCompany]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Please upload an image file (PNG, JPG, SVG)", "error");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showToast("Logo size should be under 2MB", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setLogoUrl(result);
      localStorage.setItem("company_logo", result);
      showToast("Company logo updated!");
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoUrl("");
    localStorage.removeItem("company_logo");
    if (fileInputRef.current) fileInputRef.current.value = "";
    showToast("Logo removed");
  };

  const handleSaveCompany = async () => {
    if (!form.name.trim()) {
      showToast("Company name is required", "error");
      return;
    }
    setSaving(true);
    try {
      if (company?.id) {
        const res = await apiClient.patch(`/organization/companies/${company.id}/`, form);
        setCompany(res.data);
      } else {
        const res = await apiClient.post("/organization/companies/", form);
        setCompany(res.data);
      }
      setShowEditModal(false);
      showToast("Company profile updated successfully!");
    } catch (e: any) {
      showToast(`Error: ${formatApiError(e)}`, "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <RefreshCw size={20} className="spin" />
        <span>Loading company profile…</span>
      </div>
    );
  }

  return (
    <div className="company-profile-page">
      {/* Top Banner Header */}
      <div className="company-header-card">
        <div className="company-header-main">
          {/* Logo Showcase */}
          <div className="company-logo-box">
            {logoUrl ? (
              <img src={logoUrl} alt="Company Logo" className="company-logo-img" />
            ) : (
              <div className="company-logo-placeholder">
                <Building2 size={36} color="#64748b" />
              </div>
            )}
          </div>

          {/* Company Details Title */}
          <div className="company-title-info">
            <h1 className="company-title">{company?.name || "Sahayog Technologies Pvt. Ltd."}</h1>
            <div className="company-tags">
              <span className="profile-tag saffron">
                Reg: {company?.registration_number || "SAHAYOG-001"}
              </span>
              <span className="profile-tag blue">
                Currency: {company?.currency_code || "INR"}
              </span>
              <span className="profile-tag green">● Active Enterprise</span>
            </div>
            <p className="company-location-text">
              <MapPin size={14} color="#64748b" />
              {[company?.city, company?.state, company?.country].filter(Boolean).join(", ") || "Pune, Maharashtra, India"}
            </p>
          </div>
        </div>

        <button className="btn btn-primary" onClick={() => setShowEditModal(true)}>
          <Edit2 size={15} /> Edit Profile
        </button>
      </div>

      {/* Grid of Profile Sections */}
      <div className="company-grid">
        {/* General & Legal Details */}
        <div className="card">
          <div className="card-header">
            <FileText size={16} color="#2563eb" />
            <span className="card-title">Registration & Tax Information</span>
          </div>
          <div className="card-body">
            <div className="info-grid">
              <div className="info-item">
                <label className="info-label">Company Legal Name</label>
                <div className="info-value">{company?.name || "—"}</div>
              </div>
              <div className="info-item">
                <label className="info-label">Registration / CIN</label>
                <div className="info-value">{company?.registration_number || "—"}</div>
              </div>
              <div className="info-item">
                <label className="info-label">PAN Number</label>
                <div className="info-value">{company?.pan_number || "—"}</div>
              </div>
              <div className="info-item">
                <label className="info-label">GST Number</label>
                <div className="info-value">{company?.gst_number || "—"}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="card">
          <div className="card-header">
            <Mail size={16} color="#0ea5e9" />
            <span className="card-title">Contact & Web</span>
          </div>
          <div className="card-body">
            <div className="info-grid">
              <div className="info-item">
                <label className="info-label"><Mail size={12} /> Official Email</label>
                <div className="info-value">{company?.email || "contact@sahayog.local"}</div>
              </div>
              <div className="info-item">
                <label className="info-label"><Phone size={12} /> Phone Number</label>
                <div className="info-value">{company?.phone || "+91 20 2567 8900"}</div>
              </div>
              <div className="info-item">
                <label className="info-label"><Globe size={12} /> Website</label>
                <div className="info-value">
                  {company?.website ? (
                    <a href={company.website} target="_blank" rel="noreferrer" style={{ color: "var(--blue)" }}>
                      {company.website}
                    </a>
                  ) : "—"}
                </div>
              </div>
              <div className="info-item">
                <label className="info-label">Financial Year Start</label>
                <div className="info-value">{company?.financial_year_start || "April"}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Office Address */}
        <div className="card" style={{ gridColumn: "1 / -1" }}>
          <div className="card-header">
            <MapPin size={16} color="#10b981" />
            <span className="card-title">Headquarters Address</span>
          </div>
          <div className="card-body">
            <div className="info-grid" style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr" }}>
              <div className="info-item">
                <label className="info-label">Street / Office Address</label>
                <div className="info-value">{company?.address || "Sahayog Business Park, Shivaji Nagar"}</div>
              </div>
              <div className="info-item">
                <label className="info-label">City</label>
                <div className="info-value">{company?.city || "Pune"}</div>
              </div>
              <div className="info-item">
                <label className="info-label">State</label>
                <div className="info-value">{company?.state || "Maharashtra"}</div>
              </div>
              <div className="info-item">
                <label className="info-label">PIN / Postal Code</label>
                <div className="info-value">{company?.postal_code || "411005"}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Company Modal */}
      {showEditModal && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setShowEditModal(false); }}>
          <div className="modal-box" style={{ maxWidth: 580 }}>
            <div className="modal-header">
              <h3>Edit Company Profile</h3>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {/* Company Logo Setting in Edit Modal */}
              <div className="form-row" style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                <div style={{ width: 64, height: 64, borderRadius: 8, background: "#fff", border: "1px solid #cbd5e1", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                  ) : (
                    <Building2 size={28} color="#94a3b8" />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 2 }}>Company Logo</div>
                  <div style={{ fontSize: 11.5, color: "#64748b", marginBottom: 8 }}>PNG, JPG or SVG (Max 2MB)</div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      type="file"
                      ref={fileInputRef}
                      style={{ display: "none" }}
                      accept="image/*"
                      onChange={handleLogoUpload}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary btn-xs"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload size={13} /> {logoUrl ? "Change Logo" : "Upload Logo"}
                    </button>
                    {logoUrl && (
                      <button
                        type="button"
                        className="btn btn-danger btn-xs"
                        onClick={handleRemoveLogo}
                      >
                        <Trash2 size={13} /> Remove Logo
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="form-row">
                <label className="form-label">Company Name *</label>
                <input
                  className="form-control"
                  value={form.name}
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Sahayog Technologies Pvt. Ltd."
                />
              </div>

              <div className="form-grid-2">
                <div className="form-row">
                  <label className="form-label">Registration / CIN *</label>
                  <input
                    className="form-control"
                    value={form.registration_number}
                    onChange={(e) => setForm(f => ({ ...f, registration_number: e.target.value }))}
                    placeholder="U72900MH2026PTC123456"
                  />
                </div>
                <div className="form-row">
                  <label className="form-label">PAN Number</label>
                  <input
                    className="form-control"
                    value={form.pan_number}
                    onChange={(e) => setForm(f => ({ ...f, pan_number: e.target.value }))}
                    placeholder="AAACS1234F"
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-row">
                  <label className="form-label">GST Number</label>
                  <input
                    className="form-control"
                    value={form.gst_number}
                    onChange={(e) => setForm(f => ({ ...f, gst_number: e.target.value }))}
                    placeholder="27AAACS1234F1Z5"
                  />
                </div>
                <div className="form-row">
                  <label className="form-label">Currency Code</label>
                  <input
                    className="form-control"
                    value={form.currency_code}
                    onChange={(e) => setForm(f => ({ ...f, currency_code: e.target.value }))}
                    placeholder="INR"
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-row">
                  <label className="form-label">Official Email</label>
                  <input
                    className="form-control"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="contact@sahayog.local"
                  />
                </div>
                <div className="form-row">
                  <label className="form-label">Phone Number</label>
                  <input
                    className="form-control"
                    value={form.phone}
                    onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="+91 20 2567 8900"
                  />
                </div>
              </div>

              <div className="form-row">
                <label className="form-label">Website</label>
                <input
                  className="form-control"
                  value={form.website}
                  onChange={(e) => setForm(f => ({ ...f, website: e.target.value }))}
                  placeholder="https://sahayog-hr.local"
                />
              </div>

              <div className="form-row">
                <label className="form-label">Address</label>
                <input
                  className="form-control"
                  value={form.address}
                  onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="Building No, Street, Area"
                />
              </div>

              <div className="form-grid-2">
                <div className="form-row">
                  <label className="form-label">City</label>
                  <input
                    className="form-control"
                    value={form.city}
                    onChange={(e) => setForm(f => ({ ...f, city: e.target.value }))}
                    placeholder="Pune"
                  />
                </div>
                <div className="form-row">
                  <label className="form-label">State</label>
                  <input
                    className="form-control"
                    value={form.state}
                    onChange={(e) => setForm(f => ({ ...f, state: e.target.value }))}
                    placeholder="Maharashtra"
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-row">
                  <label className="form-label">PIN Code</label>
                  <input
                    className="form-control"
                    value={form.postal_code}
                    onChange={(e) => setForm(f => ({ ...f, postal_code: e.target.value }))}
                    placeholder="411005"
                  />
                </div>
                <div className="form-row">
                  <label className="form-label">Country</label>
                  <input
                    className="form-control"
                    value={form.country}
                    onChange={(e) => setForm(f => ({ ...f, country: e.target.value }))}
                    placeholder="India"
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowEditModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSaveCompany} disabled={saving}>
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

export default CompanyProfile;


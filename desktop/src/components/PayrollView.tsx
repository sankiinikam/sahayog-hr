import React, { useEffect, useState } from "react";
import { apiClient } from "../api/client";
import { IndianRupee, FileText, ShieldCheck, RefreshCw, Printer, X } from "lucide-react";

export const PayrollView: React.FC = () => {
  const [payslips, setPayslips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayslip, setSelectedPayslip] = useState<any | null>(null);

  const fetchPayrollData = async () => {
    setLoading(true);
    try {
      const sRes = await apiClient.get("/payroll/payslips/");
      const data = Array.isArray(sRes.data) ? sRes.data : (sRes.data.results || []);
      setPayslips(data);
    } catch (err) {
      console.error("Failed to load payroll records", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayrollData();
  }, []);

  const viewPayslipDetail = async (id: number) => {
    try {
      const res = await apiClient.get(`/payroll/payslips/${id}/`);
      setSelectedPayslip(res.data);
    } catch {
      alert("Could not load payslip details.");
    }
  };

  return (
    <div className="directory-container animate-fade-in">
      <div className="page-header modern-page-header">
        <div>
          <h2>Payroll & Statutory Pay</h2>
          <p>Indian compliance, EPF/ESI statutory calculations, and itemized monthly payslips</p>
        </div>
        <div className="header-actions">
          <button className="icon-btn" onClick={fetchPayrollData} title="Refresh Payroll" disabled={loading}>
            <RefreshCw size={17} className={loading ? "spin" : ""} />
          </button>
        </div>
      </div>

      {/* Statutory Compliances Card */}
      <div className="payroll-statutory-card">
        <div className="statutory-header">
          <div className="statutory-title">
            <ShieldCheck size={20} className="text-emerald" />
            <strong>Statutory Compliance Rules Configured</strong>
          </div>
          <span className="compliance-pill">Indian Labor Code Active</span>
        </div>

        <div className="statutory-chips-grid">
          <div className="statutory-chip">
            <span className="stat-code">EPF (12%)</span>
            <small>Employee Provident Fund on Basic</small>
          </div>
          <div className="statutory-chip">
            <span className="stat-code">ESI (0.75%)</span>
            <small>Employees' State Insurance (&le; ₹21,000)</small>
          </div>
          <div className="statutory-chip">
            <span className="stat-code">PT (₹200)</span>
            <small>Professional Tax State Slab</small>
          </div>
          <div className="statutory-chip">
            <span className="stat-code">Gratuity & Bonus</span>
            <small>Statutory provisions accrued</small>
          </div>
        </div>
      </div>

      <div className="section-title-row" style={{ marginTop: 24 }}>
        <h3>Published Monthly Payslips</h3>
        <span className="badge-count">{payslips.length} slips</span>
      </div>

      {loading ? (
        <div className="loading-state">
          <RefreshCw size={24} className="spin text-muted" />
          <p>Loading payslip archives...</p>
        </div>
      ) : payslips.length === 0 ? (
        <div className="empty-state">
          <IndianRupee size={48} color="#94a3b8" />
          <h3>No Finalized Payslips</h3>
          <p>Published monthly salary slips will appear here once payroll is processed.</p>
        </div>
      ) : (
        <>
          {/* Mobile Payslip Cards Feed */}
          <div className="mobile-payslip-cards-container">
            {payslips.map((ps) => (
              <div key={ps.id} className="mobile-payslip-card">
                <div className="mobile-payslip-header">
                  <div>
                    <span className="payslip-period-pill">{ps.period}</span>
                    <h4 className="payslip-number">{ps.payslip_number}</h4>
                  </div>
                  <button
                    className="btn-view-slip"
                    onClick={() => viewPayslipDetail(ps.id)}
                  >
                    <FileText size={15} />
                    <span>View Slip</span>
                  </button>
                </div>

                <div className="payslip-figures-grid">
                  <div className="figure-box">
                    <span className="fig-lbl">Gross Earnings</span>
                    <strong className="fig-val">₹{Number(ps.gross_earnings || 0).toLocaleString("en-IN")}</strong>
                  </div>
                  <div className="figure-box">
                    <span className="fig-lbl">Deductions</span>
                    <strong className="fig-val text-danger">-₹{Number(ps.total_deductions || 0).toLocaleString("en-IN")}</strong>
                  </div>
                  <div className="figure-box highlight-net">
                    <span className="fig-lbl">Net Take-Home</span>
                    <strong className="fig-val text-emerald">₹{Number(ps.net_pay || 0).toLocaleString("en-IN")}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="table-responsive desktop-only-table">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Payslip #</th>
                  <th>Period</th>
                  <th>Gross Earnings</th>
                  <th>Deductions</th>
                  <th>Net Take-Home</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payslips.map((ps) => (
                  <tr key={ps.id}>
                    <td><strong>{ps.payslip_number}</strong></td>
                    <td>{ps.period}</td>
                    <td>₹{Number(ps.gross_earnings || 0).toLocaleString("en-IN")}</td>
                    <td style={{ color: "#dc2626" }}>-₹{Number(ps.total_deductions || 0).toLocaleString("en-IN")}</td>
                    <td style={{ color: "#16a34a", fontWeight: "700" }}>₹{Number(ps.net_pay || 0).toLocaleString("en-IN")}</td>
                    <td>
                      <button className="btn-secondary btn-xs" onClick={() => viewPayslipDetail(ps.id)}>
                        <FileText size={14} /> View Slip
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Itemized Payslip Modal */}
      {selectedPayslip && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setSelectedPayslip(null); }}>
          <div className="modal-box payslip-modal-box animate-modal-pop">
            <div className="modal-header">
              <div style={{ flex: 1 }}>
                <h3>Salary Voucher & Payslip</h3>
                <small className="text-muted">{selectedPayslip.payslip_number} • {selectedPayslip.period}</small>
              </div>
              <button className="btn-secondary btn-xs" onClick={() => window.print()} title="Print or Save PDF">
                <Printer size={14} /> Print / PDF
              </button>
              <button className="modal-close" onClick={() => setSelectedPayslip(null)}>
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              {/* Employee & Org info */}
              <div className="payslip-emp-meta">
                <div>
                  <span className="meta-lbl">Employee</span>
                  <strong>{selectedPayslip.employee?.name} ({selectedPayslip.employee?.code})</strong>
                </div>
                <div>
                  <span className="meta-lbl">Department</span>
                  <span>{selectedPayslip.employee?.department || "Operations"}</span>
                </div>
                <div>
                  <span className="meta-lbl">Designation</span>
                  <span>{selectedPayslip.employee?.designation || "Staff"}</span>
                </div>
                <div>
                  <span className="meta-lbl">Paid Days</span>
                  <span>{selectedPayslip.days?.paid_days ?? 30} days</span>
                </div>
              </div>

              {/* Earnings & Deductions Breakdown */}
              <div className="payslip-breakdown-grid">
                <div className="breakdown-card earnings-card">
                  <h4 className="breakdown-title text-emerald">Earnings</h4>
                  <div className="breakdown-row"><span>Basic Salary:</span> <strong>₹{selectedPayslip.earnings?.basic || "0.00"}</strong></div>
                  <div className="breakdown-row"><span>House Rent (HRA):</span> <strong>₹{selectedPayslip.earnings?.hra || "0.00"}</strong></div>
                  <div className="breakdown-row"><span>Special Allowance:</span> <strong>₹{selectedPayslip.earnings?.special_allowance || "0.00"}</strong></div>
                  <div className="breakdown-row total-row"><span>Total Gross:</span> <strong className="text-emerald">₹{selectedPayslip.earnings?.total_gross || "0.00"}</strong></div>
                </div>

                <div className="breakdown-card deductions-card">
                  <h4 className="breakdown-title text-danger">Statutory Deductions</h4>
                  <div className="breakdown-row"><span>EPF (12%):</span> <strong>₹{selectedPayslip.deductions?.pf || "0.00"}</strong></div>
                  <div className="breakdown-row"><span>ESI (0.75%):</span> <strong>₹{selectedPayslip.deductions?.esi || "0.00"}</strong></div>
                  <div className="breakdown-row"><span>Prof Tax (PT):</span> <strong>₹{selectedPayslip.deductions?.professional_tax || "0.00"}</strong></div>
                  <div className="breakdown-row total-row"><span>Total Deductions:</span> <strong className="text-danger">-₹{selectedPayslip.deductions?.total_deductions || "0.00"}</strong></div>
                </div>
              </div>

              {/* Net Take-Home Pay Banner */}
              <div className="net-pay-banner">
                <div>
                  <span className="net-pay-label">Net Take-Home Salary</span>
                  <small className="text-muted">Direct Bank Transfer</small>
                </div>
                <div className="net-pay-figure">
                  ₹{Number(selectedPayslip.net_pay || 0).toLocaleString("en-IN")}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setSelectedPayslip(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollView;

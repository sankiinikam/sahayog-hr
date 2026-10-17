import React, { useEffect, useState } from "react";
import { apiClient } from "../api/client";
import { DollarSign, FileText, Download } from "lucide-react";

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
    } catch (err) {
      alert("Could not load payslip details.");
    }
  };

  return (
    <div className="directory-container">
      <div className="page-header">
        <div>
          <h2>Payroll & Compensation</h2>
          <p>Controlled statutory runs, salary processing, and employee payslips</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px", marginBottom: "20px" }}>
        <div className="stat-card">
          <h4 className="stat-card-title">Statutory Deductions Configured</h4>
          <p style={{ marginTop: "8px", fontSize: "0.92rem", color: "var(--text-body)", fontWeight: 500, lineHeight: 1.6 }}>
            <strong style={{ color: "var(--text-heading)" }}>• Provident Fund (PF):</strong> 12% (Basic)<br />
            <strong style={{ color: "var(--text-heading)" }}>• ESI:</strong> 0.75% (&lt;= ₹21k gross)<br />
            <strong style={{ color: "var(--text-heading)" }}>• Professional Tax (PT):</strong> ₹200.00
          </p>
        </div>
      </div>

      <h3 style={{ marginBottom: "14px" }}>My Published Payslips</h3>
      {loading ? (
        <div className="loading-state">Loading payslips...</div>
      ) : payslips.length === 0 ? (
        <div className="empty-state">
          <DollarSign size={48} color="#94a3b8" />
          <p>No finalized payslips available for download yet.</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Payslip #</th>
                <th>Period</th>
                <th>Gross Earnings</th>
                <th>Total Deductions</th>
                <th>Net Pay</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {payslips.map((ps) => (
                <tr key={ps.id}>
                  <td><strong>{ps.payslip_number}</strong></td>
                  <td>{ps.period}</td>
                  <td>₹{ps.gross_earnings}</td>
                  <td style={{ color: "#dc2626" }}>-₹{ps.total_deductions}</td>
                  <td style={{ color: "#16a34a", fontWeight: "700" }}>₹{ps.net_pay}</td>
                  <td>
                    <button className="btn-secondary" style={{ padding: "4px 8px", fontSize: "0.8rem" }} onClick={() => viewPayslipDetail(ps.id)}>
                      <FileText size={14} /> View Slip
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedPayslip && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ width: "600px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border)", paddingBottom: "12px", marginBottom: "16px" }}>
              <div>
                <h3>Payslip Details</h3>
                <small style={{ color: "var(--text-muted)" }}>{selectedPayslip.payslip_number} • {selectedPayslip.period}</small>
              </div>
              <button className="btn-secondary" onClick={() => window.print()}>
                <Download size={14} /> Print
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px", fontSize: "0.85rem" }}>
              <div><strong>Employee:</strong> {selectedPayslip.employee.name} ({selectedPayslip.employee.code})</div>
              <div><strong>Department:</strong> {selectedPayslip.employee.department}</div>
              <div><strong>Designation:</strong> {selectedPayslip.employee.designation}</div>
              <div><strong>Paid Days:</strong> {selectedPayslip.days.paid_days}</div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", background: "#f8fafc", padding: "14px", borderRadius: "6px" }}>
              <div>
                <strong style={{ display: "block", marginBottom: "8px", color: "var(--primary)" }}>Earnings</strong>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}><span>Basic:</span> <span>₹{selectedPayslip.earnings.basic}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}><span>HRA:</span> <span>₹{selectedPayslip.earnings.hra}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}><span>Special:</span> <span>₹{selectedPayslip.earnings.special_allowance}</span></div>
                <hr style={{ margin: "8px 0" }} />
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "700" }}><span>Gross:</span> <span>₹{selectedPayslip.earnings.total_gross}</span></div>
              </div>

              <div>
                <strong style={{ display: "block", marginBottom: "8px", color: "#dc2626" }}>Deductions</strong>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}><span>PF (12%):</span> <span>₹{selectedPayslip.deductions.pf}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}><span>ESI:</span> <span>₹{selectedPayslip.deductions.esi}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}><span>Prof Tax:</span> <span>₹{selectedPayslip.deductions.professional_tax}</span></div>
                <hr style={{ margin: "8px 0" }} />
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "700" }}><span>Deductions:</span> <span>₹{selectedPayslip.deductions.total_deductions}</span></div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px", padding: "12px", background: "#ecfdf5", borderRadius: "6px" }}>
              <span style={{ fontWeight: "700", color: "#065f46" }}>Net Take-Home Pay:</span>
              <span style={{ fontSize: "1.4rem", fontWeight: "800", color: "#065f46" }}>₹{selectedPayslip.net_pay}</span>
            </div>

            <div className="modal-actions">
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

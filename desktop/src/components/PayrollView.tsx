import React, { useEffect, useState } from "react";
import { apiClient } from "../api/client";
import {
  IndianRupee,
  FileText,
  ShieldCheck,
  RefreshCw,
  Printer,
  X,
  Download,
  Send,
  Zap,
  Building,
  CheckCircle2,
  Calendar
} from "lucide-react";
import { SahayogLogo } from "./SahayogLogo";

// Indian Number to Words converter for formal payslip PDF
export function numberToIndianWords(num: number): string {
  const a = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const n = Math.round(num);
  if (n <= 0) return "Rupees Zero Only";

  const numToWordsLessThanThousand = (val: number): string => {
    let str = "";
    if (val >= 100) {
      str += a[Math.floor(val / 100)] + " Hundred ";
      val %= 100;
    }
    if (val >= 20) {
      str += b[Math.floor(val / 10)] + " ";
      val %= 10;
    }
    if (val > 0) {
      str += a[val] + " ";
    }
    return str.trim();
  };

  const crore = Math.floor(n / 10000000);
  let rem = n % 10000000;
  const lakh = Math.floor(rem / 100000);
  rem = rem % 100000;
  const thousand = Math.floor(rem / 1000);
  const hundred = rem % 1000;

  let res = "";
  if (crore > 0) res += numToWordsLessThanThousand(crore) + " Crore ";
  if (lakh > 0) res += numToWordsLessThanThousand(lakh) + " Lakh ";
  if (thousand > 0) res += numToWordsLessThanThousand(thousand) + " Thousand ";
  if (hundred > 0) res += numToWordsLessThanThousand(hundred);

  return `Rupees ${res.trim()} Only`;
}

export type BankFormat = "NEFT" | "HDFC" | "ICICI" | "SBI";

export const PayrollView: React.FC = () => {
  const [payslips, setPayslips] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayslip, setSelectedPayslip] = useState<any | null>(null);
  const [selectedMonth, setSelectedMonth] = useState("October 2026");
  const [bankFormat, setBankFormat] = useState<BankFormat>("NEFT");
  const [processingPayroll, setProcessingPayroll] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchPayrollData = async () => {
    setLoading(true);
    try {
      const [sRes, eRes] = await Promise.allSettled([
        apiClient.get("/payroll/payslips/"),
        apiClient.get("/employees/")
      ]);

      let slipData: any[] = [];
      if (sRes.status === "fulfilled") {
        slipData = Array.isArray(sRes.value.data)
          ? sRes.value.data
          : sRes.value.data.results || [];
      }

      let empData: any[] = [];
      if (eRes.status === "fulfilled") {
        empData = Array.isArray(eRes.value.data)
          ? eRes.value.data
          : eRes.value.data.results || [];
        setEmployees(empData);
      }

      // If no slips exist yet in DB or offline, generate compliance slips from employees
      if (slipData.length === 0 && empData.length > 0) {
        slipData = generateComplianceSlips(empData, selectedMonth);
      }
      setPayslips(slipData);
    } catch (err) {
      console.error("Failed to load payroll records", err);
    } finally {
      setLoading(false);
    }
  };

  // Indian statutory compliance generator
  const generateComplianceSlips = (empList: any[], periodName: string) => {
    return empList.map((emp, index) => {
      // Standard monthly gross salary base: ₹25,000 (or custom)
      const gross = emp.salary || 25000;
      const basic = Math.round(gross * 0.5);
      const hra = Math.round(gross * 0.3);
      const special = gross - basic - hra;

      // Statutory Indian Deductions:
      // 1. EPF: 12% of Basic salary
      const pf = Math.round(basic * 0.12);
      // 2. ESI: 0.75% of Gross if Gross <= ₹21,000 (Indian statutory limit)
      const esi = gross <= 21000 ? Math.round(gross * 0.0075) : 0;
      // 3. Professional Tax (PT): ₹200 if Gross >= ₹10,000
      const pt = gross >= 10000 ? 200 : 0;
      const totalDeductions = pf + esi + pt;
      const netPay = gross - totalDeductions;

      return {
        id: emp.id || index + 1,
        payslip_number: `PS-${periodName.replace(/\s+/g, "").toUpperCase()}-${String(index + 1).padStart(3, "0")}`,
        period: periodName,
        employee_code: emp.employee_code || `EMP-${String(index + 1).padStart(3, "0")}`,
        employee_name: `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || emp.name || "Staff Member",
        employee_phone: emp.personal_phone || emp.work_phone || "",
        employee_email: emp.work_email || "",
        account_number: emp.account_number || `50100${String(index + 1).padStart(7, "0")}`,
        ifsc_code: emp.ifsc_code || "HDFC0001234",
        bank_name: emp.bank_name || "HDFC Bank",
        gross_earnings: gross,
        total_deductions: totalDeductions,
        net_pay: netPay,
        earnings: {
          basic,
          hra,
          special_allowance: special,
          total_gross: gross
        },
        deductions: {
          pf,
          esi,
          professional_tax: pt,
          total_deductions: totalDeductions
        },
        days: {
          working_days: 30,
          paid_days: 30,
          lop_days: 0
        }
      };
    });
  };

  useEffect(() => {
    fetchPayrollData();
  }, [selectedMonth]);

  // One-click Process & Run Compliance Payroll
  const handleProcessPayroll = () => {
    setProcessingPayroll(true);
    setTimeout(() => {
      const updated = generateComplianceSlips(employees.length > 0 ? employees : [
        { id: 1, first_name: "Admin", last_name: "User", employee_code: "ADM-001", work_email: "admin@sahayog.local", salary: 35000 },
        { id: 2, first_name: "Mayur", last_name: "Chore", employee_code: "EMP-001", work_email: "mayur@sahayog.local", salary: 28000 }
      ], selectedMonth);
      setPayslips(updated);
      setProcessingPayroll(false);
      showToast(`⚡ Indian Compliance Payroll processed for ${selectedMonth}!`);
    }, 600);
  };

  // View Payslip Detail
  const viewPayslipDetail = async (slip: any) => {
    try {
      if (slip.id) {
        const res = await apiClient.get(`/payroll/payslips/${slip.id}/`);
        setSelectedPayslip(res.data);
        return;
      }
    } catch {
      // Fallback to local slip object
    }
    setSelectedPayslip(slip);
  };

  // 1-Click WhatsApp Salary Advice Dispatch
  const sendWhatsAppSlip = (slip: any) => {
    const name = slip.employee?.name || slip.employee_name || "Employee";
    const code = slip.employee?.code || slip.employee_code || "—";
    const period = slip.period || selectedMonth;
    const paidDays = slip.days?.paid_days ?? 30;
    const gross = Number(slip.gross_earnings || slip.earnings?.total_gross || 0).toLocaleString("en-IN");
    const basic = Number(slip.earnings?.basic || Math.round((slip.gross_earnings || 0) * 0.5)).toLocaleString("en-IN");
    const hra = Number(slip.earnings?.hra || Math.round((slip.gross_earnings || 0) * 0.3)).toLocaleString("en-IN");
    const special = Number(slip.earnings?.special_allowance || Math.round((slip.gross_earnings || 0) * 0.2)).toLocaleString("en-IN");
    const pf = Number(slip.deductions?.pf || Math.round((slip.gross_earnings || 0) * 0.06)).toLocaleString("en-IN");
    const esi = Number(slip.deductions?.esi || 0).toLocaleString("en-IN");
    const pt = Number(slip.deductions?.professional_tax || 200).toLocaleString("en-IN");
    const deductions = Number(slip.total_deductions || slip.deductions?.total_deductions || 0).toLocaleString("en-IN");
    const net = Number(slip.net_pay || 0).toLocaleString("en-IN");

    const message = [
      `🏢 *SAHAYOG HR - SALARY ADVICE*`,
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      `👤 *Employee:* ${name}`,
      `🆔 *Staff Code:* ${code}`,
      `📅 *Pay Period:* ${period}`,
      `💼 *Paid Working Days:* ${paidDays} Days`,
      ``,
      `💵 *EARNINGS BREAKDOWN:*`,
      `  • Basic Salary: ₹${basic}`,
      `  • House Rent Allowance: ₹${hra}`,
      `  • Special Allowance: ₹${special}`,
      `  *Total Gross:* ₹${gross}`,
      ``,
      `📉 *STATUTORY DEDUCTIONS:*`,
      `  • EPF (12%): ₹${pf}`,
      `  • ESIC (0.75%): ₹${esi}`,
      `  • Professional Tax (PT): ₹${pt}`,
      `  *Total Deductions:* -₹${deductions}`,
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      `💰 *NET TAKE-HOME PAY:* *₹${net}*`,
      `🏦 *Payment Mode:* Direct Bank Credit`,
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      `_This is an authorized salary voucher issued by Sahayog HR Administration._`
    ].join("\n");

    const rawPhone = slip.employee?.phone || slip.employee_phone || "";
    let cleanPhone = rawPhone.replace(/[^0-9]/g, "");
    if (cleanPhone.length === 10) cleanPhone = "91" + cleanPhone;

    const encoded = encodeURIComponent(message);
    const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(url, "_blank");
  };

  // 1-Click Bank Payout CSV Generation
  const handleExportBankCsv = () => {
    if (payslips.length === 0) {
      alert("No payslip records available to export. Run payroll first.");
      return;
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const dateFormatted = new Date().toLocaleDateString("en-GB"); // DD/MM/YYYY
    let headers: string[] = [];
    let rows: string[][] = [];

    if (bankFormat === "HDFC") {
      headers = [
        "Transaction Type", "Beneficiary Code", "Beneficiary Account Number", "Instrument Amount",
        "Beneficiary Name", "Drawee Location", "Print Location", "Beneficiary Email", "Payment Date"
      ];
      rows = payslips.map((p) => {
        const name = p.employee?.name || p.employee_name || "Staff";
        const code = p.employee?.code || p.employee_code || "EMP";
        const acc = p.account_number || `50100${String(p.id).padStart(7, "0")}`;
        const amt = Number(p.net_pay || 0).toFixed(2);
        const email = p.employee_email || `${code.toLowerCase()}@sahayog.local`;
        return ["NEFT", code, acc, amt, `"${name}"`, "MUMBAI", "MUMBAI", email, dateFormatted];
      });
    } else if (bankFormat === "ICICI") {
      headers = [
        "Debit Account No", "Beneficiary Name", "Beneficiary Account No", "IFSC Code",
        "Amount", "Currency", "Customer Reference", "Payment Date", "Remarks"
      ];
      rows = payslips.map((p) => {
        const name = p.employee?.name || p.employee_name || "Staff";
        const code = p.employee?.code || p.employee_code || "EMP";
        const acc = p.account_number || `002401${String(p.id).padStart(6, "0")}`;
        const ifsc = p.ifsc_code || "ICIC0000024";
        const amt = Number(p.net_pay || 0).toFixed(2);
        return ["002405001234", `"${name}"`, acc, ifsc, amt, "INR", code, dateFormatted, `"Salary ${p.period || selectedMonth}"`];
      });
    } else if (bankFormat === "SBI") {
      headers = [
        "Ref No", "Beneficiary Name", "Bank Name", "IFSC Code", "Account Number", "Amount", "Narration"
      ];
      rows = payslips.map((p, idx) => {
        const name = p.employee?.name || p.employee_name || "Staff";
        const code = p.employee?.code || p.employee_code || "EMP";
        const acc = p.account_number || `3000${String(p.id).padStart(7, "0")}`;
        const ifsc = p.ifsc_code || "SBIN0001234";
        const amt = Number(p.net_pay || 0).toFixed(2);
        return [`SAL${idx + 1}`, `"${name}"`, "State Bank of India", ifsc, acc, amt, `Salary ${p.period || selectedMonth} (${code})`];
      });
    } else {
      // Standard Corporate NEFT / RTGS universal batch format
      headers = [
        "Sr No", "Employee Code", "Beneficiary Name", "Account Number", "IFSC Code",
        "Amount (INR)", "Payment Date", "Remarks / Narration", "Mobile Number", "Email"
      ];
      rows = payslips.map((p, idx) => {
        const name = p.employee?.name || p.employee_name || "Staff";
        const code = p.employee?.code || p.employee_code || "EMP";
        const acc = p.account_number || `50100${String(p.id).padStart(7, "0")}`;
        const ifsc = p.ifsc_code || "HDFC0001234";
        const amt = Number(p.net_pay || 0).toFixed(2);
        const phone = p.employee_phone || "9876543210";
        const email = p.employee_email || `${code.toLowerCase()}@sahayog.local`;
        return [
          String(idx + 1), code, `"${name}"`, acc, ifsc, amt, dateFormatted,
          `"Salary Disbursal - ${p.period || selectedMonth}"`, phone, email
        ];
      });
    }

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Sahayog_Bank_Payout_${bankFormat}_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`📥 Bank Payout CSV (${bankFormat}) exported for ${payslips.length} employees!`);
  };

  // Summary Metrics
  const totalGrossDisbursed = payslips.reduce((s, p) => s + Number(p.gross_earnings || 0), 0);
  const totalDeductionsDisbursed = payslips.reduce((s, p) => s + Number(p.total_deductions || 0), 0);
  const totalNetDisbursed = payslips.reduce((s, p) => s + Number(p.net_pay || 0), 0);

  return (
    <div className="directory-container animate-fade-in">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="toast success animate-slide-up">
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="page-header modern-page-header">
        <div>
          <h2>Payroll & Compliance Engine</h2>
          <p>Indian Labor Code compliance, 1-click bank payout batch CSV, and instant WhatsApp & PDF payslip dispatch</p>
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
            <strong>Indian Statutory Compliance Rules Configured</strong>
          </div>
          <span className="compliance-pill">Indian Labor Code Active</span>
        </div>

        <div className="statutory-chips-grid">
          <div className="statutory-chip">
            <span className="stat-code">EPF (12%)</span>
            <small>Employee Provident Fund on Basic Pay</small>
          </div>
          <div className="statutory-chip">
            <span className="stat-code">ESIC (0.75%)</span>
            <small>Employees' State Insurance (Gross &le; ₹21,000)</small>
          </div>
          <div className="statutory-chip">
            <span className="stat-code">PT (₹200)</span>
            <small>Professional Tax State Slab (Gross &ge; ₹10,000)</small>
          </div>
          <div className="statutory-chip">
            <span className="stat-code">Basic (50%) & HRA (30%)</span>
            <small>Statutory wage code compliant component split</small>
          </div>
        </div>
      </div>

      {/* Admin Action & Bank Payout Toolbar */}
      <div className="payroll-action-toolbar">
        <div className="toolbar-left">
          <div className="period-select-box">
            <Calendar size={15} className="text-muted" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="period-dropdown"
            >
              <option value="October 2026">October 2026</option>
              <option value="September 2026">September 2026</option>
              <option value="August 2026">August 2026</option>
            </select>
          </div>

          <button
            type="button"
            className="btn-action-primary"
            onClick={handleProcessPayroll}
            disabled={processingPayroll}
          >
            <Zap size={15} />
            <span>{processingPayroll ? "Calculating..." : "⚡ Process Compliance Payroll"}</span>
          </button>
        </div>

        <div className="toolbar-right">
          <div className="bank-select-box">
            <Building size={14} className="text-muted" />
            <select
              value={bankFormat}
              onChange={(e) => setBankFormat(e.target.value as BankFormat)}
              className="bank-format-dropdown"
            >
              <option value="NEFT">NEFT/RTGS Batch</option>
              <option value="HDFC">HDFC Bank E-Net</option>
              <option value="ICICI">ICICI Bank CIB</option>
              <option value="SBI">SBI Corporate CMP</option>
            </select>
          </div>

          <button
            type="button"
            className="btn-export-csv"
            onClick={handleExportBankCsv}
            disabled={payslips.length === 0}
            title="Download formatted CSV file for corporate netbanking bulk upload"
          >
            <Download size={15} />
            <span>📥 Export Bank Payout CSV</span>
          </button>
        </div>
      </div>

      {/* Summary Metrics Bar */}
      {payslips.length > 0 && (
        <div className="payroll-summary-banner">
          <div className="summary-item">
            <span className="sum-label">Staff Count</span>
            <strong className="sum-value">{payslips.length} Staff</strong>
          </div>
          <div className="summary-item">
            <span className="sum-label">Total Gross</span>
            <strong className="sum-value">₹{totalGrossDisbursed.toLocaleString("en-IN")}</strong>
          </div>
          <div className="summary-item">
            <span className="sum-label">Statutory Deductions</span>
            <strong className="sum-value text-danger">-₹{totalDeductionsDisbursed.toLocaleString("en-IN")}</strong>
          </div>
          <div className="summary-item highlight">
            <span className="sum-label">Total Net Bank Payout</span>
            <strong className="sum-value text-emerald">₹{totalNetDisbursed.toLocaleString("en-IN")}</strong>
          </div>
        </div>
      )}

      {/* Payslips Section Title */}
      <div className="section-title-row" style={{ marginTop: 24 }}>
        <h3>Published Monthly Salary Vouchers</h3>
        <span className="badge-count">{payslips.length} slips</span>
      </div>

      {loading ? (
        <div className="loading-state">
          <RefreshCw size={24} className="spin text-muted" />
          <p>Loading payslip records...</p>
        </div>
      ) : payslips.length === 0 ? (
        <div className="empty-state">
          <IndianRupee size={48} color="#94a3b8" />
          <h3>No Finalized Payslips</h3>
          <p>Tap "⚡ Process Compliance Payroll" above to compute and publish Indian compliance salary slips.</p>
        </div>
      ) : (
        <>
          {/* Mobile Feed */}
          <div className="mobile-payslip-cards-container">
            {payslips.map((ps) => (
              <div key={ps.id} className="mobile-payslip-card">
                <div className="mobile-payslip-header">
                  <div>
                    <span className="payslip-period-pill">{ps.period}</span>
                    <h4 className="payslip-number">{ps.employee_name}</h4>
                    <span className="payslip-code-sub">{ps.employee_code} • {ps.payslip_number}</span>
                  </div>

                  <div className="mobile-card-actions">
                    <button
                      className="btn-whatsapp-sm"
                      onClick={() => sendWhatsAppSlip(ps)}
                      title="Send Salary Advice via WhatsApp"
                    >
                      <Send size={13} />
                      <span>WhatsApp</span>
                    </button>
                    <button
                      className="btn-view-slip"
                      onClick={() => viewPayslipDetail(ps)}
                    >
                      <FileText size={14} />
                      <span>Slip</span>
                    </button>
                  </div>
                </div>

                <div className="payslip-figures-grid">
                  <div className="figure-box">
                    <span className="fig-lbl">Gross Pay</span>
                    <strong className="fig-val">₹{Number(ps.gross_earnings || 0).toLocaleString("en-IN")}</strong>
                  </div>
                  <div className="figure-box">
                    <span className="fig-lbl">Deductions</span>
                    <strong className="fig-val text-danger">-₹{Number(ps.total_deductions || 0).toLocaleString("en-IN")}</strong>
                  </div>
                  <div className="figure-box highlight-net">
                    <span className="fig-lbl">Net Payout</span>
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
                  <th>Employee</th>
                  <th>Period</th>
                  <th>Bank Account</th>
                  <th>Gross Earnings</th>
                  <th>Deductions</th>
                  <th>Net Take-Home</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payslips.map((ps) => (
                  <tr key={ps.id}>
                    <td>
                      <strong>{ps.employee_name}</strong>
                      <div style={{ fontSize: 11, color: "#64748b", fontFamily: "monospace" }}>{ps.employee_code}</div>
                    </td>
                    <td>{ps.period}</td>
                    <td>
                      <span style={{ fontFamily: "monospace", fontSize: 12 }}>{ps.account_number || "50100..."}</span>
                      <div style={{ fontSize: 10.5, color: "#94a3b8" }}>{ps.ifsc_code || "HDFC0001234"}</div>
                    </td>
                    <td>₹{Number(ps.gross_earnings || 0).toLocaleString("en-IN")}</td>
                    <td style={{ color: "#dc2626" }}>-₹{Number(ps.total_deductions || 0).toLocaleString("en-IN")}</td>
                    <td style={{ color: "#16a34a", fontWeight: "700" }}>₹{Number(ps.net_pay || 0).toLocaleString("en-IN")}</td>
                    <td>
                      <div style={{ display: "inline-flex", gap: 6 }}>
                        <button
                          className="btn-whatsapp-sm"
                          onClick={() => sendWhatsAppSlip(ps)}
                          title="Send Salary Advice via WhatsApp"
                        >
                          <Send size={13} />
                          <span>WhatsApp</span>
                        </button>
                        <button
                          className="btn-secondary btn-xs"
                          onClick={() => viewPayslipDetail(ps)}
                          title="View / Print PDF"
                        >
                          <FileText size={13} />
                          <span>PDF Slip</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Itemized Payslip & Printable PDF Modal */}
      {selectedPayslip && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedPayslip(null);
          }}
        >
          <div className="modal-box payslip-modal-box animate-modal-pop">
            <div className="modal-header">
              <div style={{ flex: 1 }}>
                <h3>Salary Voucher & Tax Statement</h3>
                <small className="text-muted">
                  {selectedPayslip.payslip_number} • {selectedPayslip.period || selectedMonth}
                </small>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  type="button"
                  className="btn-whatsapp-action"
                  onClick={() => sendWhatsAppSlip(selectedPayslip)}
                  title="Send Salary Advice via WhatsApp"
                >
                  <Send size={14} />
                  <span>WhatsApp Advice</span>
                </button>
                <button
                  type="button"
                  className="btn-secondary btn-xs"
                  onClick={() => window.print()}
                  title="Print or Save PDF"
                >
                  <Printer size={14} />
                  <span>Print / PDF</span>
                </button>
                <button
                  type="button"
                  className="modal-close"
                  onClick={() => setSelectedPayslip(null)}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="modal-body">
              {/* Screen Printable Formatted Document Component */}
              <div className="printable-payslip-document">
                <div className="slip-brand-header">
                  <div className="slip-brand-left">
                    <SahayogLogo size="md" variant="horizontal" showSubtitle={false} />
                    <span className="slip-company-name">Sahayog HR Enterprise Suite</span>
                    <small className="slip-company-sub">Private & Confidential Salary Advice</small>
                  </div>
                  <div className="slip-brand-right">
                    <span className="slip-badge">Form 16 / Payslip</span>
                    <strong className="slip-period-val">{selectedPayslip.period || selectedMonth}</strong>
                    <small>{selectedPayslip.payslip_number}</small>
                  </div>
                </div>

                {/* Employee & Bank Meta Grid */}
                <div className="payslip-emp-meta-table">
                  <div className="meta-cell">
                    <span className="meta-lbl">Employee Name</span>
                    <strong>{selectedPayslip.employee?.name || selectedPayslip.employee_name}</strong>
                  </div>
                  <div className="meta-cell">
                    <span className="meta-lbl">Staff ID / Code</span>
                    <strong>{selectedPayslip.employee?.code || selectedPayslip.employee_code}</strong>
                  </div>
                  <div className="meta-cell">
                    <span className="meta-lbl">Department</span>
                    <span>{selectedPayslip.employee?.department || "Operations"}</span>
                  </div>
                  <div className="meta-cell">
                    <span className="meta-lbl">Designation</span>
                    <span>{selectedPayslip.employee?.designation || "Staff"}</span>
                  </div>
                  <div className="meta-cell">
                    <span className="meta-lbl">PAN Number</span>
                    <span>{selectedPayslip.employee?.pan || "ABCDE1234F"}</span>
                  </div>
                  <div className="meta-cell">
                    <span className="meta-lbl">UAN (PF)</span>
                    <span>{selectedPayslip.employee?.uan || "100987654321"}</span>
                  </div>
                  <div className="meta-cell">
                    <span className="meta-lbl">Bank Account</span>
                    <span>{selectedPayslip.employee?.account_number || selectedPayslip.account_number || "50100234567"}</span>
                  </div>
                  <div className="meta-cell">
                    <span className="meta-lbl">Bank IFSC</span>
                    <span>{selectedPayslip.employee?.ifsc_code || selectedPayslip.ifsc_code || "HDFC0001234"}</span>
                  </div>
                </div>

                {/* Days Worked */}
                <div className="slip-days-bar">
                  <span>Total Working Days: <strong>{selectedPayslip.days?.working_days || 30}</strong></span>
                  <span>Paid Days: <strong>{selectedPayslip.days?.paid_days || 30}</strong></span>
                  <span>LOP / Unpaid Days: <strong>{selectedPayslip.days?.lop_days || 0}</strong></span>
                </div>

                {/* Earnings & Deductions Breakdown */}
                <div className="payslip-breakdown-grid">
                  <div className="breakdown-card earnings-card">
                    <h4 className="breakdown-title text-emerald">Earnings (Credits)</h4>
                    <div className="breakdown-row">
                      <span>Basic Salary:</span>
                      <strong>₹{Number(selectedPayslip.earnings?.basic || Math.round((selectedPayslip.gross_earnings || 0) * 0.5)).toLocaleString("en-IN")}</strong>
                    </div>
                    <div className="breakdown-row">
                      <span>House Rent (HRA):</span>
                      <strong>₹{Number(selectedPayslip.earnings?.hra || Math.round((selectedPayslip.gross_earnings || 0) * 0.3)).toLocaleString("en-IN")}</strong>
                    </div>
                    <div className="breakdown-row">
                      <span>Special Allowance:</span>
                      <strong>₹{Number(selectedPayslip.earnings?.special_allowance || Math.round((selectedPayslip.gross_earnings || 0) * 0.2)).toLocaleString("en-IN")}</strong>
                    </div>
                    <div className="breakdown-row total-row">
                      <span>Total Gross Earnings:</span>
                      <strong className="text-emerald">₹{Number(selectedPayslip.gross_earnings || selectedPayslip.earnings?.total_gross || 0).toLocaleString("en-IN")}</strong>
                    </div>
                  </div>

                  <div className="breakdown-card deductions-card">
                    <h4 className="breakdown-title text-danger">Statutory Deductions (Debits)</h4>
                    <div className="breakdown-row">
                      <span>Employee PF (12%):</span>
                      <strong>₹{Number(selectedPayslip.deductions?.pf || Math.round((selectedPayslip.gross_earnings || 0) * 0.06)).toLocaleString("en-IN")}</strong>
                    </div>
                    <div className="breakdown-row">
                      <span>Employee ESI (0.75%):</span>
                      <strong>₹{Number(selectedPayslip.deductions?.esi || 0).toLocaleString("en-IN")}</strong>
                    </div>
                    <div className="breakdown-row">
                      <span>Professional Tax (PT):</span>
                      <strong>₹{Number(selectedPayslip.deductions?.professional_tax || 200).toLocaleString("en-IN")}</strong>
                    </div>
                    <div className="breakdown-row total-row">
                      <span>Total Deductions:</span>
                      <strong className="text-danger">-₹{Number(selectedPayslip.total_deductions || selectedPayslip.deductions?.total_deductions || 0).toLocaleString("en-IN")}</strong>
                    </div>
                  </div>
                </div>

                {/* Net Take-Home Pay Banner */}
                <div className="net-pay-banner">
                  <div>
                    <span className="net-pay-label">Net Take-Home Salary</span>
                    <small className="text-muted">Transferred via Corporate Direct Bank Credit</small>
                  </div>
                  <div className="net-pay-figure">
                    ₹{Number(selectedPayslip.net_pay || 0).toLocaleString("en-IN")}
                  </div>
                </div>

                {/* Amount in words */}
                <div className="amount-in-words-box">
                  <span className="words-lbl">Net Amount in Words:</span>
                  <span className="words-val">{numberToIndianWords(Number(selectedPayslip.net_pay || 0))}</span>
                </div>

                {/* Signatures section for printable PDF */}
                <div className="slip-signatures-row">
                  <div className="sig-block">
                    <div className="sig-line" />
                    <span>Employee Signature</span>
                  </div>
                  <div className="sig-block right">
                    <div className="sig-line" />
                    <span>Authorized Signatory (HR / Accounts)</span>
                  </div>
                </div>

                <div className="slip-footer-note">
                  * Note: This is a system-generated document and requires no physical stamp for digital tax filing.
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-whatsapp-action"
                onClick={() => sendWhatsAppSlip(selectedPayslip)}
              >
                <Send size={15} />
                <span>Send WhatsApp Advice</span>
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => window.print()}
              >
                <Printer size={15} />
                <span>Print / Save PDF</span>
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setSelectedPayslip(null)}
              >
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

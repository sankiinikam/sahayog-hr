import React, { useState, useEffect, useCallback } from "react";
import { FileText, RefreshCw, Printer, Calendar, Banknote } from "lucide-react";
import { apiClient } from "../api/client";
import { numberToIndianWords } from "./PayrollView";

interface AttRecord {
  id?: number;
  attendance_date: string;
  status: string;
  worked_minutes: number;
  overtime_minutes: number;
  is_late?: boolean;
}

interface Props {
  employeeId: number;
  employeeName: string;
  employeeCode: string;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export const PayslipCalculator: React.FC<Props> = ({ employeeId, employeeName, employeeCode }) => {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const firstDayOfMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;

  const [dateFrom, setDateFrom] = useState(firstDayOfMonth);
  const [dateTo, setDateTo] = useState(todayStr);
  const [monthlyGross, setMonthlyGross] = useState<number>(25000);
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<AttRecord[]>([]);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Fetch employee's assigned salary if available
  useEffect(() => {
    let isMounted = true;
    const fetchSalary = async () => {
      try {
        const res = await apiClient.get(`/employees/${employeeId}/salary/`);
        if (isMounted && res.data?.monthly_gross && res.data.monthly_gross > 0) {
          setMonthlyGross(Number(res.data.monthly_gross));
        }
      } catch {
        // use default 25000
      }
    };
    fetchSalary();
    return () => {
      isMounted = false;
    };
  }, [employeeId]);

  // Fetch Attendance Records Till Date & Calculate
  const fetchAndCalc = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(
        `/attendance/records/?employee_id=${employeeId}&date_from=${dateFrom}&date_to=${dateTo}`
      );
      const d = res.data;
      const list: AttRecord[] = Array.isArray(d) ? d : d.results ?? [];
      setRecords(list);
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  }, [employeeId, dateFrom, dateTo]);

  // Auto calculate on load
  useEffect(() => {
    fetchAndCalc();
  }, [fetchAndCalc]);

  // Total calendar days and working days in range till date
  const from = new Date(dateFrom);
  const to = new Date(dateTo);
  let totalDaysTillDate = 0;
  let workingDaysTillDate = 0;

  for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    totalDaysTillDate++;
    if (d.getDay() !== 0) workingDaysTillDate++; // Mon-Sat
  }
  if (totalDaysTillDate === 0) totalDaysTillDate = 1;
  if (workingDaysTillDate === 0) workingDaysTillDate = 1;

  // Actual Attendance Counts logged till date
  const presentDays = records.filter((r) => r.status === "PRESENT").length;
  const halfDays = records.filter((r) => r.status === "HALF_DAY").length;
  const absentDays = records.filter((r) => r.status === "ABSENT").length;
  const leaveDays = records.filter((r) => r.status === "ON_LEAVE").length;
  const lateCount = records.filter((r) => r.is_late).length;
  const totalOtMin = records.reduce((s, r) => s + (r.overtime_minutes || 0), 0);
  const totalOtHours = (totalOtMin / 60);

  // Salary breakdown calculations based on attendance till date
  const effectivePresentDays = presentDays + halfDays * 0.5 + leaveDays;
  const totalMonthDays = 30; // standard commercial calendar month
  const perDayGross = monthlyGross / totalMonthDays;
  
  // Prorated Gross Earned till date
  const earnedGross = Math.round(effectivePresentDays * perDayGross);
  const basic = Math.round(earnedGross * 0.5);
  const hra = Math.round(earnedGross * 0.3);
  const specialAllowance = Math.max(0, earnedGross - basic - hra);

  // Overtime pay (calculated at ₹100/hr or 1.5x hourly rate)
  const hourlyRate = Math.round(perDayGross / 12);
  const otPay = Math.round(totalOtHours * Math.max(80, hourlyRate * 1.25));

  // Indian statutory deductions till date
  const pfDeduction = Math.round(basic * 0.12);
  const ptDeduction = earnedGross >= 10000 ? 200 : 0;
  const totalDeductions = pfDeduction + ptDeduction;

  // Final Net Salary Payable Till Date
  const netSalaryTillDate = Math.max(0, earnedGross + otPay - totalDeductions);

  return (
    <div className="card" id="payslip-card">
      <div className="card-header">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Banknote size={16} color="#16a34a" />
          <span className="card-title" style={{ fontSize: 14 }}>
            Payslip (Based on Attendance Till Date)
          </span>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <button
            className="btn btn-secondary btn-xs"
            onClick={fetchAndCalc}
            title="Recalculate Till Date"
            disabled={loading}
          >
            <RefreshCw size={12} className={loading ? "spin" : ""} /> Recalculate
          </button>
          <button
            className="btn btn-primary btn-xs"
            onClick={() => setShowPrintModal(true)}
            title="Print Official Slip"
          >
            <Printer size={12} /> Print Slip
          </button>
        </div>
      </div>

      <div className="card-body">
        {/* Attendance Range Till Date Controls */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>From Date</label>
            <input
              type="date"
              className="form-control"
              style={{ padding: "4px 8px", fontSize: 12 }}
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>Till Date</label>
            <input
              type="date"
              className="form-control"
              style={{ padding: "4px 8px", fontSize: 12 }}
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>

        <div className="payslip-range-banner">
          <Calendar size={14} color="#2563eb" />
          <span>
            Period Till Date: <strong>{dateFrom}</strong> to <strong>{dateTo}</strong> ({totalDaysTillDate} days)
          </span>
        </div>

        {/* Attendance Summary Grid (Total Attendance Logged Till Date) */}
        <div style={{ margin: "12px 0" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 8 }}>
            Total Attendance Logged Till Date
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
            <div className="att-stat-mini-pill">
              <strong style={{ color: "#16a34a" }}>{presentDays}</strong>
              <small>Present Days</small>
            </div>
            <div className="att-stat-mini-pill">
              <strong style={{ color: "#dc2626" }}>{absentDays}</strong>
              <small>Absent Days</small>
            </div>
            <div className="att-stat-mini-pill">
              <strong style={{ color: "#d97706" }}>{lateCount}</strong>
              <small>Late Arrivals</small>
            </div>
            <div className="att-stat-mini-pill">
              <strong style={{ color: "#2563eb" }}>{effectivePresentDays.toFixed(1)}</strong>
              <small>Paid Days</small>
            </div>
            <div className="att-stat-mini-pill">
              <strong style={{ color: "#7c3aed" }}>{totalOtHours.toFixed(1)}h</strong>
              <small>Overtime</small>
            </div>
            <div className="att-stat-mini-pill">
              <strong style={{ color: "#0f172a" }}>{fmt(Math.round(perDayGross))}</strong>
              <small>Daily Rate</small>
            </div>
          </div>
        </div>

        {/* Calculated Results Box */}
        <div className="payslip-result" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", borderRadius: 8, padding: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>
            {employeeName} · {employeeCode} (Base: {fmt(monthlyGross)}/mo)
          </div>

          <div className="result-row">
            <span className="label">Earned Basic Salary</span>
            <span className="value">{fmt(basic)}</span>
          </div>
          <div className="result-row">
            <span className="label">House Rent Allowance (HRA)</span>
            <span className="value">{fmt(hra)}</span>
          </div>
          <div className="result-row">
            <span className="label">Special Allowance</span>
            <span className="value">{fmt(specialAllowance)}</span>
          </div>
          {otPay > 0 && (
            <div className="result-row">
              <span className="label">Overtime Pay ({totalOtHours.toFixed(1)}h logged)</span>
              <span className="value" style={{ color: "#86efac" }}>+{fmt(otPay)}</span>
            </div>
          )}
          {pfDeduction > 0 && (
            <div className="result-row">
              <span className="label">EPF Deduction (12%)</span>
              <span className="value" style={{ color: "#fca5a5" }}>-{fmt(pfDeduction)}</span>
            </div>
          )}
          {ptDeduction > 0 && (
            <div className="result-row">
              <span className="label">Professional Tax (PT)</span>
              <span className="value" style={{ color: "#fca5a5" }}>-{fmt(ptDeduction)}</span>
            </div>
          )}

          <div
            className="result-row total"
            style={{
              marginTop: 10,
              paddingTop: 10,
              borderTop: "1px solid rgba(255,255,255,0.2)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}
          >
            <span className="label" style={{ fontWeight: 700, fontSize: 13, color: "#fff" }}>
              NET PAYABLE TILL DATE
            </span>
            <span className="value" style={{ fontSize: 18, fontWeight: 800, color: "#38bdf8" }}>
              {fmt(netSalaryTillDate)}
            </span>
          </div>
        </div>
      </div>

      {/* Official Printable Payslip Modal */}
      {showPrintModal && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPrintModal(false);
          }}
        >
          <div className="modal-box modal-box-lg" style={{ maxWidth: 680 }}>
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <FileText size={18} color="#16a34a" />
                <h3>Official Salary Payslip (Till Date Attendance)</h3>
              </div>
              <button className="modal-close" onClick={() => setShowPrintModal(false)}>
                ✕
              </button>
            </div>

            <div className="modal-body printable-payslip-sheet" style={{ background: "#fff", padding: 24 }}>
              {/* Slip Header */}
              <div style={{ textAlign: "center", borderBottom: "2px solid #0f172a", paddingBottom: 12, marginBottom: 16 }}>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#0f172a" }}>
                  SAHAYOG HR SOLUTIONS PVT. LTD.
                </h2>
                <div style={{ fontSize: 12, color: "#64748b" }}>
                  Maharashtra, India • Corporate Payroll Statement
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4, color: "#2563eb" }}>
                  ATTENDANCE-BASED SALARY SLIP (TILL DATE: {dateTo})
                </div>
              </div>

              {/* Employee Meta Row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 13, marginBottom: 16 }}>
                <div>
                  <strong>Employee:</strong> {employeeName}
                </div>
                <div>
                  <strong>Employee Code:</strong> {employeeCode}
                </div>
                <div>
                  <strong>Attendance Period:</strong> {dateFrom} to {dateTo}
                </div>
                <div>
                  <strong>Present Days Logged:</strong> {presentDays} days ({effectivePresentDays.toFixed(1)} paid)
                </div>
                <div>
                  <strong>Late Arrivals:</strong> {lateCount}
                </div>
                <div>
                  <strong>Overtime Logged:</strong> {totalOtHours.toFixed(1)} hours
                </div>
              </div>

              {/* Breakdown Table */}
              <table className="data-table" style={{ width: "100%", fontSize: 13, marginBottom: 16 }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    <th style={{ textAlign: "left" }}>Earnings (Till Date)</th>
                    <th style={{ textAlign: "right" }}>Amount</th>
                    <th style={{ textAlign: "left" }}>Deductions</th>
                    <th style={{ textAlign: "right" }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Basic Salary</td>
                    <td style={{ textAlign: "right" }}>{fmt(basic)}</td>
                    <td>Employee PF (12%)</td>
                    <td style={{ textAlign: "right" }}>{fmt(pfDeduction)}</td>
                  </tr>
                  <tr>
                    <td>HRA</td>
                    <td style={{ textAlign: "right" }}>{fmt(hra)}</td>
                    <td>Professional Tax (PT)</td>
                    <td style={{ textAlign: "right" }}>{fmt(ptDeduction)}</td>
                  </tr>
                  <tr>
                    <td>Special Allowance</td>
                    <td style={{ textAlign: "right" }}>{fmt(specialAllowance)}</td>
                    <td>Loss of Pay (LOP)</td>
                    <td style={{ textAlign: "right" }}>₹0</td>
                  </tr>
                  {otPay > 0 && (
                    <tr>
                      <td>Overtime Pay ({totalOtHours.toFixed(1)}h)</td>
                      <td style={{ textAlign: "right" }}>{fmt(otPay)}</td>
                      <td>—</td>
                      <td style={{ textAlign: "right" }}>—</td>
                    </tr>
                  )}
                  <tr style={{ fontWeight: 800, background: "#f1f5f9" }}>
                    <td>Total Earnings</td>
                    <td style={{ textAlign: "right" }}>{fmt(earnedGross + otPay)}</td>
                    <td>Total Deductions</td>
                    <td style={{ textAlign: "right" }}>{fmt(totalDeductions)}</td>
                  </tr>
                </tbody>
              </table>

              {/* Net Pay Box */}
              <div style={{ background: "#f8fafc", padding: 14, borderRadius: 8, border: "1.5px solid #cbd5e1" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>NET SALARY PAYABLE:</span>
                  <span style={{ fontSize: 20, fontWeight: 800, color: "#16a34a" }}>{fmt(netSalaryTillDate)}</span>
                </div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 4, fontStyle: "italic" }}>
                  Amount in words: {numberToIndianWords(netSalaryTillDate)}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24, paddingTop: 16, borderTop: "1px dashed #cbd5e1", fontSize: 11, color: "#94a3b8" }}>
                <span>Generated automatically via Sahayog HRMS Till-Date Attendance Engine</span>
                <span>Authorized Signatory</span>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowPrintModal(false)}>
                Close
              </button>
              <button className="btn btn-primary" onClick={() => window.print()}>
                <Printer size={14} /> Print Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayslipCalculator;

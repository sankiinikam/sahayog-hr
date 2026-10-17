import React, { useState, useCallback } from "react";
import { FileText, RefreshCw, Printer } from "lucide-react";

import { apiClient } from "../api/client";

interface AttRecord {
  attendance_date: string;
  status: string;
  worked_minutes: number;
  overtime_minutes: number;
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
  const firstDay = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split("T")[0];

  const [dateFrom, setDateFrom] = useState(firstDay);
  const [dateTo, setDateTo] = useState(lastDay);
  const [monthlyGross, setMonthlyGross] = useState<number>(0);
  const [otRatePerHour, setOtRatePerHour] = useState<number>(0);
  const [pfDeduction, setPfDeduction] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<AttRecord[] | null>(null);
  const [calcDone, setCalcDone] = useState(false);

  const fetchAndCalc = useCallback(async () => {
    if (!monthlyGross) { alert("Please enter monthly gross salary"); return; }
    setLoading(true);
    setCalcDone(false);
    try {
      const res = await apiClient.get(
        `/attendance/records/?employee_id=${employeeId}&date_from=${dateFrom}&date_to=${dateTo}`
      );
      const d = res.data;
      const list: AttRecord[] = Array.isArray(d) ? d : d.results ?? [];
      setRecords(list);
      setCalcDone(true);
    } catch {
      alert("Failed to fetch attendance data");
    } finally {
      setLoading(false);
    }
  }, [employeeId, dateFrom, dateTo, monthlyGross]);

  // Calculations
  let totalDays = 0, presentDays = 0, halfDays = 0, absentDays = 0, leaveDays = 0, lwpDays = 0, totalOtMin = 0;
  if (records) {
    // Working days in range (Mon–Sat, exclude Sunday)
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      if (d.getDay() !== 0) totalDays++; // exclude Sundays
    }
    presentDays = records.filter(r => r.status === "PRESENT").length;
    halfDays = records.filter(r => r.status === "HALF_DAY").length;
    absentDays = records.filter(r => r.status === "ABSENT").length;
    leaveDays = records.filter(r => r.status === "ON_LEAVE").length;
    lwpDays = records.filter(r => r.status === "MISSED_PUNCH").length;
    totalOtMin = records.reduce((s, r) => s + (r.overtime_minutes || 0), 0);
  }

  const effectivePresentDays = presentDays + halfDays * 0.5;
  const perDaySalary = totalDays > 0 ? monthlyGross / totalDays : 0;
  const lwpDeduction = (lwpDays + absentDays) * perDaySalary; // absent not on approved leave = LWP
  const earnedBasic = effectivePresentDays * perDaySalary;
  const otPay = otRatePerHour > 0 ? (totalOtMin / 60) * otRatePerHour : 0;
  const grossEarned = earnedBasic + otPay;
  const netSalary = Math.max(0, grossEarned - pfDeduction);

  const handlePrint = () => window.print();

  return (
    <div className="card" id="payslip-card">
      <div className="card-header">
        <FileText size={16} color="#f59e0b" />
        <span className="card-title">Custom Payslip</span>
        {calcDone && (
          <button className="btn btn-secondary btn-xs" style={{ marginLeft: "auto" }} onClick={handlePrint}>
            <Printer size={12} /> Print
          </button>
        )}
      </div>
      <div className="card-body">
        {/* Date Range */}
        <div className="payslip-calc-row">
          <div className="form-field">
            <label>From Date</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div className="form-field">
            <label>To Date</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
        </div>

        {/* Salary inputs */}
        <div className="form-field" style={{ marginBottom: 10 }}>
          <label>Monthly Gross Salary (₹)</label>
          <input
            type="number"
            min={0}
            placeholder="e.g. 30000"
            value={monthlyGross || ""}
            onChange={e => setMonthlyGross(Number(e.target.value))}
          />
        </div>
        <div className="payslip-calc-row">
          <div className="form-field">
            <label>OT Rate (₹/hr)</label>
            <input type="number" min={0} placeholder="0" value={otRatePerHour || ""} onChange={e => setOtRatePerHour(Number(e.target.value))} />
          </div>
          <div className="form-field">
            <label>PF / Deduction (₹)</label>
            <input type="number" min={0} placeholder="0" value={pfDeduction || ""} onChange={e => setPfDeduction(Number(e.target.value))} />
          </div>
        </div>

        <button
          className="btn btn-primary"
          style={{ width: "100%", marginBottom: 16 }}
          onClick={fetchAndCalc}
          disabled={loading}
        >
          {loading ? <><RefreshCw size={14} /> Calculating…</> : <><FileText size={14} /> Calculate Payslip</>}
        </button>

        {calcDone && records && (
          <>
            {/* Attendance Summary */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 8 }}>Attendance Summary</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                {[{l:"Working Days",v:totalDays},{l:"Present",v:presentDays},{l:"Half Day",v:halfDays},{l:"Absent/LWP",v:absentDays+lwpDays},{l:"On Leave",v:leaveDays},{l:"OT Hours",v:(totalOtMin/60).toFixed(1)+"h"}].map(item => (
                  <div key={item.l} style={{ background: "#f8fafc", borderRadius: 8, padding: "8px 10px", border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#1e293b" }}>{item.v}</div>
                    <div style={{ fontSize: 10.5, color: "#64748b", marginTop: 1 }}>{item.l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Result */}
            <div className="payslip-result">
              <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>
                {employeeName} · {employeeCode}
              </div>
              <div className="result-row">
                <span className="label">Effective Days Worked</span>
                <span className="value">{effectivePresentDays.toFixed(1)} / {totalDays}</span>
              </div>
              <div className="result-row">
                <span className="label">Per Day Salary</span>
                <span className="value">{fmt(Math.round(perDaySalary))}</span>
              </div>
              <div className="result-row">
                <span className="label">Earned Salary</span>
                <span className="value">{fmt(Math.round(earnedBasic))}</span>
              </div>
              {otPay > 0 && (
                <div className="result-row">
                  <span className="label">OT Pay ({(totalOtMin/60).toFixed(1)}h × ₹{otRatePerHour})</span>
                  <span className="value">{fmt(Math.round(otPay))}</span>
                </div>
              )}
              {pfDeduction > 0 && (
                <div className="result-row">
                  <span className="label">PF / Deductions</span>
                  <span className="value" style={{ color: "#fca5a5" }}>- {fmt(pfDeduction)}</span>
                </div>
              )}
              {lwpDeduction > 0 && (
                <div className="result-row">
                  <span className="label">LWP Deduction ({absentDays + lwpDays} days)</span>
                  <span className="value" style={{ color: "#fca5a5" }}>- {fmt(Math.round(lwpDeduction))}</span>
                </div>
              )}
              <div className="result-row total" style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.2)" }}>
                <span className="label">NET SALARY</span>
                <span className="value">{fmt(Math.round(netSalary))}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

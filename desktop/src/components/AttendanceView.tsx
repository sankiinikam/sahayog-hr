import React, { useEffect, useState, useCallback, useMemo } from "react";
import { apiClient } from "../api/client";
import {
  Clock,
  Play,
  Square,
  Calendar,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Search,
  ChevronLeft,
  ChevronRight,
  Download,
  Check,
  Printer,
  Banknote,
  Users
} from "lucide-react";
import { Time12Input } from "./Time12Input";
import { to12Hour, computeShiftAttendance, getLocalDateString } from "../utils/timeFormat";
import { formatApiError } from "../utils/formatError";
import { numberToIndianWords } from "./PayrollView";

interface Employee {
  id: number;
  employee_code: string;
  first_name: string;
  last_name: string;
  work_email: string;
  personal_phone?: string;
  designation_name?: string;
  designation_title?: string;
  is_active: boolean;
  is_deleted?: boolean;
  photo?: string;
}

interface AttendanceEntry {
  id?: number;
  status: "PRESENT" | "ABSENT" | "HALF_DAY" | "ON_LEAVE" | "MISSED_PUNCH" | string;
  first_in: string | null;
  last_out: string | null;
  worked_minutes: number;
  overtime_minutes: number;
  is_late: boolean;
  late_minutes: number;
  clockIn12: string;
  clockOut12: string;
}

const initials = (emp: Employee) =>
  ((emp.first_name?.[0] || "") + (emp.last_name?.[0] || "")).toUpperCase() || "??";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export const AttendanceView: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "PRESENT" | "ABSENT" | "LATE">("ALL");

  // Selected date for attendance sheet (defaults to today's local date)
  const [selectedDate, setSelectedDate] = useState<string>(() => getLocalDateString());
  const [attendanceMap, setAttendanceMap] = useState<Record<number, AttendanceEntry>>({});

  // Hero Clock state
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showLiveClockHero, setShowLiveClockHero] = useState(false);

  // Payslip Modal State (Calculated on Total Attendance Till Date)
  const [payslipEmployee, setPayslipEmployee] = useState<Employee | null>(null);
  const [payslipRecords, setPayslipRecords] = useState<any[]>([]);
  const [payslipLoading, setPayslipLoading] = useState(false);

  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Real-time clock update
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch employees
  const fetchEmployees = useCallback(async () => {
    try {
      const res = await apiClient.get("/employees/");
      const data = res.data;
      const list: Employee[] = Array.isArray(data) ? data : data.results ?? [];
      // Only show active, non-deleted employees in attendance roster
      setEmployees(list.filter((e) => !e.is_deleted));
    } catch {
      showToast("Failed to load staff list", "error");
    }
  }, []);

  // Fetch attendance records for the selected date
  const fetchDateAttendance = useCallback(async (dateStr: string) => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/attendance/records/?date_from=${dateStr}&date_to=${dateStr}`);
      const raw = res.data;
      const list = Array.isArray(raw) ? raw : raw?.results ?? [];

      const map: Record<number, AttendanceEntry> = {};
      list.forEach((r: any) => {
        const empId = r.employee_id || r.employee;
        map[empId] = {
          id: r.id,
          status: r.status,
          first_in: r.first_in,
          last_out: r.last_out,
          worked_minutes: r.worked_minutes || 0,
          overtime_minutes: r.overtime_minutes || 0,
          is_late: Boolean(r.is_late),
          late_minutes: r.late_minutes || 0,
          clockIn12: to12Hour(r.first_in || "08:00:00"),
          clockOut12: to12Hour(r.last_out || "20:00:00"),
        };
      });
      setAttendanceMap(map);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    fetchDateAttendance(selectedDate);
  }, [selectedDate, fetchDateAttendance]);

  // Date Navigator Helpers
  const handleShiftDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    const newDateStr = d.toISOString().split("T")[0];
    setSelectedDate(newDateStr);
  };

  const handleJumpToToday = () => {
    setSelectedDate(getLocalDateString());
  };

  // Mark Present Handler
  const handleMarkPresent = async (empId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const existing = attendanceMap[empId];
    const clockIn12 = existing?.clockIn12 || "08:00 AM";
    const clockOut12 = existing?.clockOut12 || "08:00 PM";
    const { workedMinutes, overtimeMinutes, firstIn24, lastOut24 } = computeShiftAttendance(clockIn12, clockOut12);

    // Optimistic update
    setAttendanceMap((prev) => ({
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
        is_late: false,
        late_minutes: 0,
      },
    }));

    try {
      const res = await apiClient.post("/attendance/records/", {
        employee_id: empId,
        attendance_date: selectedDate,
        status: "PRESENT",
        first_in: firstIn24,
        last_out: lastOut24,
        overtime_minutes: overtimeMinutes,
        is_late: false,
      });
      if (res.data?.id) {
        setAttendanceMap((prev) => ({
          ...prev,
          [empId]: {
            ...prev[empId],
            id: res.data.id,
            worked_minutes: res.data.worked_minutes,
            overtime_minutes: res.data.overtime_minutes,
          },
        }));
      }
      showToast("Marked Present (12h Shift)");
    } catch {
      showToast("Failed to record attendance", "error");
    }
  };

  // Mark Absent Handler
  const handleMarkAbsent = async (empId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setAttendanceMap((prev) => ({
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
        is_late: false,
        late_minutes: 0,
      },
    }));

    try {
      await apiClient.post("/attendance/records/", {
        employee_id: empId,
        attendance_date: selectedDate,
        status: "ABSENT",
        first_in: null,
        last_out: null,
        overtime_minutes: 0,
        is_late: false,
      });
      showToast("Marked Absent");
    } catch {
      showToast("Failed to record absence", "error");
    }
  };

  // Mark Late Handler (NEW: User requested Late Marker!)
  const handleMarkLate = async (empId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const existing = attendanceMap[empId];
    // Default late check-in timestamp: 09:45 AM (or existing)
    const lateClockIn12 = existing?.is_late && existing?.clockIn12 ? existing.clockIn12 : "09:45 AM";
    const clockOut12 = existing?.clockOut12 || "08:00 PM";
    const { workedMinutes, overtimeMinutes, firstIn24, lastOut24 } = computeShiftAttendance(lateClockIn12, clockOut12);

    setAttendanceMap((prev) => ({
      ...prev,
      [empId]: {
        ...prev[empId],
        status: "PRESENT",
        first_in: firstIn24,
        last_out: lastOut24,
        clockIn12: lateClockIn12,
        clockOut12,
        worked_minutes: workedMinutes,
        overtime_minutes: overtimeMinutes,
        is_late: true,
        late_minutes: 45,
      },
    }));

    try {
      await apiClient.post("/attendance/records/", {
        employee_id: empId,
        attendance_date: selectedDate,
        status: "PRESENT",
        first_in: firstIn24,
        last_out: lastOut24,
        overtime_minutes: overtimeMinutes,
        is_late: true,
        late_minutes: 45,
      });
      showToast("Marked Late Arrival (⏰ Late)");
    } catch {
      showToast("Failed to mark late", "error");
    }
  };

  // Time update handler
  const handleUpdateTime = async (empId: number, newIn12: string, newOut12: string) => {
    const { workedMinutes, overtimeMinutes, firstIn24, lastOut24 } = computeShiftAttendance(newIn12, newOut12);

    // Auto detect late: if in-time is past 09:30 AM
    let autoLate = false;
    let lateMins = 0;
    try {
      const parts = firstIn24.split(":");
      const inMins = Number(parts[0]) * 60 + Number(parts[1]);
      if (inMins > 9 * 60 + 30) {
        autoLate = true;
        lateMins = inMins - (9 * 60 + 30);
      }
    } catch {
      // ignore
    }

    setAttendanceMap((prev) => ({
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
        is_late: autoLate,
        late_minutes: lateMins,
      },
    }));

    try {
      await apiClient.post("/attendance/records/", {
        employee_id: empId,
        attendance_date: selectedDate,
        status: "PRESENT",
        first_in: firstIn24,
        last_out: lastOut24,
        overtime_minutes: overtimeMinutes,
        is_late: autoLate,
        late_minutes: lateMins,
      });
    } catch {
      // silent
    }
  };

  // Batch Super Action: Mark All Remaining Unpunched Employees Present
  const handleMarkAllRemainingPresent = async () => {
    const unpunched = employees.filter((e) => !attendanceMap[e.id]?.status || attendanceMap[e.id]?.status === "ABSENT");
    if (unpunched.length === 0) {
      showToast("All employees already marked Present!");
      return;
    }

    setActionLoading(true);
    try {
      const ids = unpunched.map((e) => e.id);
      await apiClient.post("/attendance/records/batch-mark/", {
        employee_ids: ids,
        attendance_date: selectedDate,
        status: "PRESENT",
        first_in: "08:00:00",
        last_out: "20:00:00",
      });
      showToast(`⚡ Batch marked ${ids.length} employees as Present!`);
      fetchDateAttendance(selectedDate);
    } catch (err: any) {
      showToast(`Batch mark failed: ${formatApiError(err)}`, "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Export Attendance CSV
  const handleExportCSV = () => {
    const rows = [
      ["Employee Code", "Full Name", "Designation", "Date", "Status", "First In", "Last Out", "Worked Hours", "Overtime (min)", "Late Marker"],
    ];

    employees.forEach((emp) => {
      const att = attendanceMap[emp.id];
      const status = att?.status || "NOT_LOGGED";
      const inTime = att?.first_in || "—";
      const outTime = att?.last_out || "—";
      const workedH = att?.worked_minutes ? (att.worked_minutes / 60).toFixed(1) : "0";
      const ot = att?.overtime_minutes || 0;
      const lateStr = att?.is_late ? `Late (${att.late_minutes}m)` : "On Time";

      rows.push([
        emp.employee_code,
        `"${emp.first_name} ${emp.last_name}"`,
        `"${emp.designation_name || emp.designation_title || "Staff"}"`,
        selectedDate,
        status,
        inTime,
        outTime,
        workedH,
        String(ot),
        lateStr,
      ]);
    });

    const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Sahayog_Attendance_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Attendance CSV exported successfully!");
  };

  // Open Payslip on Total Attendance Till Date for an Employee
  const handleOpenTillDatePayslip = async (emp: Employee, e: React.MouseEvent) => {
    e.stopPropagation();
    setPayslipEmployee(emp);
    setPayslipLoading(true);

    try {
      const today = new Date();
      const firstOfMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
      const curToday = getLocalDateString();

      const res = await apiClient.get(
        `/attendance/records/?employee_id=${emp.id}&date_from=${firstOfMonth}&date_to=${curToday}`
      );
      const raw = res.data;
      const list = Array.isArray(raw) ? raw : raw?.results ?? [];
      setPayslipRecords(list);
    } catch {
      setPayslipRecords([]);
    } finally {
      setPayslipLoading(false);
    }
  };

  // Summary Metrics
  const presentCount = Object.values(attendanceMap).filter((a) => a.status === "PRESENT").length;
  const absentCount = Object.values(attendanceMap).filter((a) => a.status === "ABSENT").length;
  const lateCount = Object.values(attendanceMap).filter((a) => a.is_late).length;
  const totalOtMins = Object.values(attendanceMap).reduce((s, a) => s + (a.overtime_minutes || 0), 0);

  // Filtered employees
  const filtered = employees.filter((e) => {
    const q = search.toLowerCase();
    const desigText = (e.designation_name || e.designation_title || "").toLowerCase();
    const matchQuery =
      !q ||
      e.first_name?.toLowerCase().includes(q) ||
      e.last_name?.toLowerCase().includes(q) ||
      e.employee_code?.toLowerCase().includes(q) ||
      e.work_email?.toLowerCase().includes(q) ||
      desigText.includes(q);

    if (!matchQuery) return false;

    const att = attendanceMap[e.id];
    if (filterStatus === "PRESENT") return att?.status === "PRESENT";
    if (filterStatus === "ABSENT") return att?.status === "ABSENT";
    if (filterStatus === "LATE") return Boolean(att?.is_late);
    return true;
  });

  // Calculate Till-Date Payslip numbers for modal
  const payslipMetrics = useMemo(() => {
    if (!payslipEmployee) return null;
    const today = new Date();
    const curMonthName = today.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    const curToday = getLocalDateString();
    const firstOfMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;

    const fromD = new Date(firstOfMonth);
    const toD = new Date(curToday);
    let totalDaysTillDate = 0;
    for (let d = new Date(fromD); d <= toD; d.setDate(d.getDate() + 1)) {
      totalDaysTillDate++;
    }
    if (totalDaysTillDate === 0) totalDaysTillDate = 1;

    const pDays = payslipRecords.filter((r) => r.status === "PRESENT").length;
    const hDays = payslipRecords.filter((r) => r.status === "HALF_DAY").length;
    const aDays = payslipRecords.filter((r) => r.status === "ABSENT").length;
    const lDays = payslipRecords.filter((r) => r.status === "ON_LEAVE").length;
    const lateC = payslipRecords.filter((r) => r.is_late).length;
    const otMins = payslipRecords.reduce((s, r) => s + (r.overtime_minutes || 0), 0);
    const otHours = (otMins / 60);

    const paidDays = pDays + hDays * 0.5 + lDays;
    const monthlyGross = 25000;
    const perDaySalary = monthlyGross / 30;
    const earnedGross = Math.round(paidDays * perDaySalary);
    const basic = Math.round(earnedGross * 0.5);
    const hra = Math.round(earnedGross * 0.3);
    const special = Math.max(0, earnedGross - basic - hra);
    const otPay = Math.round(otHours * 120);
    const pf = Math.round(basic * 0.12);
    const pt = earnedGross >= 10000 ? 200 : 0;
    const totalDeductions = pf + pt;
    const netSalary = Math.max(0, earnedGross + otPay - totalDeductions);

    return {
      curMonthName,
      firstOfMonth,
      curToday,
      totalDaysTillDate,
      pDays,
      hDays,
      aDays,
      lDays,
      lateC,
      paidDays,
      otHours,
      monthlyGross,
      earnedGross,
      basic,
      hra,
      special,
      otPay,
      pf,
      pt,
      totalDeductions,
      netSalary,
    };
  }, [payslipEmployee, payslipRecords]);

  // Formatted date string for display
  const selectedDateFormatted = new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="directory-container animate-fade-in">
      {/* Page Header */}
      <div className="directory-top-bar">
        <div className="directory-title-area">
          <div className="directory-title-row">
            <h2>Attendance & Shifts</h2>
            <span className="directory-count-pill">{presentCount} Present Today</span>
            {lateCount > 0 && (
              <span className="directory-count-pill pill-late">
                {lateCount} Late Arrivals
              </span>
            )}
          </div>
          <p className="directory-sub">
            Shift logging, 12h attendance tracking, automated overtime, and late arrival management
          </p>
        </div>

        <div className="directory-btn-group">
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowLiveClockHero((prev) => !prev)}
            title="Toggle Live Clock Punch Hero"
          >
            <Clock size={15} />
            <span>{showLiveClockHero ? "Hide Live Clock" : "My Live Clock"}</span>
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleExportCSV}
            title="Export Attendance Sheet as CSV"
          >
            <Download size={15} />
            <span>Export CSV</span>
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleMarkAllRemainingPresent}
            disabled={actionLoading}
            title="Mark all unpunched employees Present for this date"
          >
            <Check size={15} />
            <span>Mark All Present</span>
          </button>
        </div>
      </div>

      {/* Optional Hero Clock Card for Current User Punch */}
      {showLiveClockHero && (
        <div className="attendance-hero-card animate-fade-in" style={{ marginBottom: 16 }}>
          <div className="att-hero-left">
            <div className="live-clock-badge">
              <span className="live-pulse-dot" />
              <span>LIVE PUNCH CLOCK</span>
            </div>
            <div className="live-clock-time">
              {currentTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}
            </div>
            <div className="live-clock-date">
              {currentTime.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </div>
          </div>
          <div className="att-hero-actions">
            <button
              className="btn-punch-in-hero"
              disabled={actionLoading}
              onClick={async () => {
                setActionLoading(true);
                try {
                  const res = await apiClient.post("/attendance/punch/", { punch_type: "IN" });
                  showToast(res.data?.detail || "Punched IN successfully!");
                  fetchDateAttendance(selectedDate);
                } catch (e: any) {
                  showToast(formatApiError(e), "error");
                } finally {
                  setActionLoading(false);
                }
              }}
            >
              <div className="punch-icon-circle">
                <Play size={20} fill="currentColor" />
              </div>
              <div className="punch-btn-copy">
                <strong>Clock In</strong>
                <small>Log Shift Start</small>
              </div>
            </button>
            <button
              className="btn-punch-out-hero"
              disabled={actionLoading}
              onClick={async () => {
                setActionLoading(true);
                try {
                  const res = await apiClient.post("/attendance/punch/", { punch_type: "OUT" });
                  showToast(res.data?.detail || "Punched OUT successfully!");
                  fetchDateAttendance(selectedDate);
                } catch (e: any) {
                  showToast(formatApiError(e), "error");
                } finally {
                  setActionLoading(false);
                }
              }}
            >
              <div className="punch-icon-circle punch-out-circle">
                <Square size={18} fill="currentColor" />
              </div>
              <div className="punch-btn-copy">
                <strong>Clock Out</strong>
                <small>Record Departure</small>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Date Navigator Bar & Calendar Selector (Admin Superpower) */}
      <div className="attendance-date-nav-bar">
        <div className="date-nav-controls">
          <button
            className="icon-btn-date"
            onClick={() => handleShiftDate(-1)}
            title="Previous Day"
          >
            <ChevronLeft size={16} />
          </button>

          <div className="date-display-box">
            <Calendar size={16} color="#2563eb" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="date-picker-input"
            />
            <span className="date-display-label">{selectedDateFormatted}</span>
          </div>

          <button
            className="icon-btn-date"
            onClick={() => handleShiftDate(1)}
            title="Next Day"
          >
            <ChevronRight size={16} />
          </button>

          {selectedDate !== getLocalDateString() && (
            <button className="btn-today-shortcut" onClick={handleJumpToToday}>
              Jump to Today
            </button>
          )}
        </div>

        <button
          className="icon-btn-refresh"
          onClick={() => fetchDateAttendance(selectedDate)}
          title="Refresh Attendance"
          disabled={loading}
        >
          <RefreshCw size={15} className={loading ? "spin" : ""} />
        </button>
      </div>

      {/* Summary Metric Cards */}
      <div className="metric-cards-grid" style={{ marginBottom: 14 }}>
        <div className="metric-card">
          <div className="metric-header">
            <span>TOTAL STAFF</span>
            <Users size={16} className="metric-icon-blue" />
          </div>
          <div className="metric-value">{employees.length}</div>
          <div className="metric-footer">Active Roster</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span>PRESENT TODAY</span>
            <CheckCircle2 size={16} className="metric-icon-emerald" />
          </div>
          <div className="metric-value">{presentCount}</div>
          <div className="metric-footer">Logged on {selectedDateFormatted}</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span>LATE ARRIVALS</span>
            <Clock size={16} className="metric-icon-amber" />
          </div>
          <div className="metric-value" style={{ color: lateCount > 0 ? "#d97706" : undefined }}>
            {lateCount}
          </div>
          <div className="metric-footer">Arrived past cutoff</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span>OVERTIME</span>
            <Sparkles size={16} className="metric-icon-blue" />
          </div>
          <div className="metric-value">
            +{Math.floor(totalOtMins / 60)}h {totalOtMins % 60}m
          </div>
          <div className="metric-footer">&gt;12h Shift Extra</div>
        </div>
      </div>

      {/* Full-width Search Bar */}
      <div className="directory-search-wrapper" style={{ marginBottom: 12 }}>
        <Search size={16} className="search-icon" />
        <input
          placeholder="Search staff by name, employee code, or designation…"
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

      {/* Quick Filter Chips (Including Late Arrivals!) */}
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
          <span className="dot dot-active" /> Present ({presentCount})
        </button>
        <button
          className={`filter-chip chip-absent ${filterStatus === "ABSENT" ? "active" : ""}`}
          onClick={() => setFilterStatus("ABSENT")}
        >
          <span className="dot dot-inactive" /> Absent ({absentCount})
        </button>
        <button
          className={`filter-chip chip-late ${filterStatus === "LATE" ? "active" : ""}`}
          onClick={() => setFilterStatus("LATE")}
        >
          <Clock size={13} style={{ marginRight: 4 }} /> Late Arrivals ({lateCount})
        </button>
      </div>

      {/* Rectangular Attendance Bars (Exact same working & look as previous Employee Directory!) */}
      {loading ? (
        <div className="loading-spinner">
          <RefreshCw size={18} className="spin" />
          <span>Loading attendance roster for {selectedDate}…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <Clock size={48} />
          <h3>No Records Found</h3>
          <p>{search ? "No staff members match your search." : "No attendance recorded yet for this date."}</p>
        </div>
      ) : (
        <div className="emp-bars-container">
          {/* Header Row */}
          <div className="att-sheet-header">
            <span className="col-sr">#</span>
            <span className="col-name">Employee</span>
            <span className="col-code">Code</span>
            <span className="col-att">
              Attendance · {selectedDateFormatted} (12h Shift System)
            </span>
            <span className="col-actions">Actions</span>
          </div>

          {filtered.map((emp, index) => {
            const att = attendanceMap[emp.id];
            const isPresent = att?.status === "PRESENT";
            const isAbsent = att?.status === "ABSENT";
            const isLate = Boolean(att?.is_late);

            return (
              <div key={emp.id} className="emp-bar att-roster-bar">
                <div className="emp-bar-top-row">
                  <div className="emp-bar-top-left">
                    {/* Sr. No */}
                    <div className="col-sr desktop-only-col">
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
                        <span className="emp-bar-name">
                          {emp.first_name} {emp.last_name}
                        </span>
                        <span className="emp-bar-desig-sub">
                          {emp.designation_name || emp.designation_title || "Staff Member"}
                        </span>
                      </div>
                    </div>

                    {/* Employee Code */}
                    <div className="col-code desktop-only-col">
                      <span className="code-badge">{emp.employee_code}</span>
                    </div>
                  </div>

                  <div className="emp-bar-top-right">
                    {/* 1-Click Payslip on Total Attendance Till Date */}
                    <div className="col-actions">
                      <button
                        className="btn-payslip-till-date"
                        onClick={(e) => handleOpenTillDatePayslip(emp, e)}
                        title="Generate Official Payslip Based on Total Attendance Till Date"
                      >
                        <Banknote size={13} />
                        <span>Payslip (Till Date)</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Attendance Controls: P / AB / L (Late Marker) + Immediate In/Out Timepickers */}
                <div className="col-att">
                  <div className="att-profile-bar-controls">
                    {/* Present Button */}
                    <button
                      type="button"
                      className={`circle-att-btn p-btn ${isPresent && !isLate ? "active" : ""}`}
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

                    {/* LATE BUTTON (Late Marker requested by user!) */}
                    <button
                      type="button"
                      className={`circle-att-btn late-btn ${isLate ? "active" : ""}`}
                      onClick={(e) => handleMarkLate(emp.id, e)}
                      title="Mark Late Arrival (L)"
                    >
                      L
                    </button>

                    {/* Clock In / Out Time Picker & Overtime Badges */}
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

                        {/* Late Badge Indicator */}
                        {isLate && (
                          <span
                            className="late-badge-pill"
                            title={`Late Arrival recorded (>9:30 AM). Flagged: ${att.late_minutes}m`}
                          >
                            <Clock size={11} /> Late ({att.late_minutes > 0 ? `${att.late_minutes}m` : "Arrival"})
                          </span>
                        )}

                        {/* Overtime calculation badge (>30m beyond 12h) */}
                        {att.overtime_minutes > 0 ? (
                          <span
                            className="ot-badge-pill"
                            title={`Overtime recorded: ${att.overtime_minutes} minutes`}
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

      {/* Generate Payslip on Total Attendance Till Date Modal */}
      {payslipEmployee && payslipMetrics && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPayslipEmployee(null);
          }}
        >
          <div className="modal-box modal-box-lg" style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Banknote size={19} color="#16a34a" />
                <h3>
                  Salary Payslip on Total Attendance Till Date — {payslipEmployee.first_name} {payslipEmployee.last_name}
                </h3>
              </div>
              <button className="modal-close" onClick={() => setPayslipEmployee(null)}>
                ✕
              </button>
            </div>

            <div className="modal-body printable-payslip-sheet" style={{ background: "#fff", padding: 24 }}>
              {payslipLoading ? (
                <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>
                  <RefreshCw size={24} className="spin" style={{ display: "inline-block", marginRight: 8 }} />
                  Calculating salary based on total attendance records till date…
                </div>
              ) : (
                <>
                  {/* Company Header */}
                  <div style={{ textAlign: "center", borderBottom: "2px solid #0f172a", paddingBottom: 14, marginBottom: 16 }}>
                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#0f172a" }}>
                      SAHAYOG HR SOLUTIONS PVT. LTD.
                    </h2>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                      Enterprise Human Resource & Payroll System
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, marginTop: 6, color: "#2563eb" }}>
                      ATTENDANCE-BASED SALARY SLIP (TILL DATE: {payslipMetrics.curToday})
                    </div>
                  </div>

                  {/* Employee & Attendance Aggregation Meta */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 13, marginBottom: 16, background: "#f8fafc", padding: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}>
                    <div>
                      <strong>Employee Name:</strong> {payslipEmployee.first_name} {payslipEmployee.last_name}
                    </div>
                    <div>
                      <strong>Employee Code:</strong> {payslipEmployee.employee_code}
                    </div>
                    <div>
                      <strong>Designation:</strong> {payslipEmployee.designation_name || "Staff Member"}
                    </div>
                    <div>
                      <strong>Period Till Date:</strong> {payslipMetrics.firstOfMonth} to {payslipMetrics.curToday}
                    </div>
                    <div>
                      <strong>Present Days Logged:</strong> <span style={{ color: "#16a34a", fontWeight: 700 }}>{payslipMetrics.pDays} days</span>
                    </div>
                    <div>
                      <strong>Late Arrivals Logged:</strong> <span style={{ color: "#d97706", fontWeight: 700 }}>{payslipMetrics.lateC}</span>
                    </div>
                    <div>
                      <strong>Absent Days:</strong> <span style={{ color: "#dc2626", fontWeight: 700 }}>{payslipMetrics.aDays} days</span>
                    </div>
                    <div>
                      <strong>Total Overtime Logged:</strong> <span style={{ color: "#7c3aed", fontWeight: 700 }}>{payslipMetrics.otHours.toFixed(1)} hours</span>
                    </div>
                  </div>

                  {/* Earnings & Deductions Breakdown Table */}
                  <table className="data-table" style={{ width: "100%", fontSize: 13, marginBottom: 16 }}>
                    <thead>
                      <tr style={{ background: "#f1f5f9" }}>
                        <th style={{ textAlign: "left" }}>Earnings (Based on {payslipMetrics.paidDays.toFixed(1)} Paid Days)</th>
                        <th style={{ textAlign: "right" }}>Amount</th>
                        <th style={{ textAlign: "left" }}>Statutory Deductions</th>
                        <th style={{ textAlign: "right" }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Basic Salary</td>
                        <td style={{ textAlign: "right" }}>{fmt(payslipMetrics.basic)}</td>
                        <td>EPF Deduction (12%)</td>
                        <td style={{ textAlign: "right" }}>{fmt(payslipMetrics.pf)}</td>
                      </tr>
                      <tr>
                        <td>House Rent Allowance (HRA)</td>
                        <td style={{ textAlign: "right" }}>{fmt(payslipMetrics.hra)}</td>
                        <td>Professional Tax (PT)</td>
                        <td style={{ textAlign: "right" }}>{fmt(payslipMetrics.pt)}</td>
                      </tr>
                      <tr>
                        <td>Special Allowance</td>
                        <td style={{ textAlign: "right" }}>{fmt(payslipMetrics.special)}</td>
                        <td>Loss of Pay (LOP)</td>
                        <td style={{ textAlign: "right" }}>₹0</td>
                      </tr>
                      {payslipMetrics.otPay > 0 && (
                        <tr>
                          <td>Overtime Pay ({payslipMetrics.otHours.toFixed(1)}h extra)</td>
                          <td style={{ textAlign: "right" }}>{fmt(payslipMetrics.otPay)}</td>
                          <td>—</td>
                          <td style={{ textAlign: "right" }}>—</td>
                        </tr>
                      )}
                      <tr style={{ fontWeight: 800, background: "#f8fafc" }}>
                        <td>Gross Earnings Till Date</td>
                        <td style={{ textAlign: "right" }}>{fmt(payslipMetrics.earnedGross + payslipMetrics.otPay)}</td>
                        <td>Total Deductions</td>
                        <td style={{ textAlign: "right" }}>{fmt(payslipMetrics.totalDeductions)}</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Net Pay Amount in Words */}
                  <div style={{ background: "#f0fdf4", padding: 14, borderRadius: 8, border: "1.5px solid #86efac" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#166534" }}>NET PAYABLE SALARY TILL DATE:</span>
                      <span style={{ fontSize: 22, fontWeight: 800, color: "#15803d" }}>{fmt(payslipMetrics.netSalary)}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "#15803d", marginTop: 4, fontStyle: "italic" }}>
                      Amount in words: {numberToIndianWords(payslipMetrics.netSalary)}
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24, paddingTop: 14, borderTop: "1px dashed #cbd5e1", fontSize: 11, color: "#94a3b8" }}>
                    <span>Generated automatically based on actual punch timestamps till date</span>
                    <span>Sahayog HR Admin Signatory</span>
                  </div>
                </>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setPayslipEmployee(null)}>
                Close
              </button>
              <button className="btn btn-primary" onClick={() => window.print()}>
                <Printer size={14} /> Print Formal Slip
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </div>
  );
};

export default AttendanceView;

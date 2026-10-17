import React, { useEffect, useState, useCallback } from "react";
import { Clock, Save, RefreshCw, Calendar } from "lucide-react";

import { apiClient } from "../api/client";
import { getLocalDateString } from "../utils/timeFormat";

type AttStatus = "PRESENT" | "HALF_DAY" | "ABSENT" | "ON_LEAVE" | "MISSED_PUNCH";

interface Shift { id: number; name: string; start_time: string; end_time: string; }
interface AttRecord {
  id?: number;
  attendance_date: string;
  status: AttStatus;
  first_in: string | null;
  last_out: string | null;
  worked_minutes: number;
  overtime_minutes: number;
  shift_id: number | null;
  shift_name: string | null;
}

interface Props {
  employeeId: number;
  shifts: Shift[];
}

const STATUS_OPTIONS: { key: AttStatus; label: string; cls: string }[] = [
  { key: "PRESENT", label: "✓ Present", cls: "present" },
  { key: "HALF_DAY", label: "½ Half Day", cls: "half-day" },
  { key: "ABSENT", label: "✗ Absent", cls: "absent" },
  { key: "ON_LEAVE", label: "⛱ Leave", cls: "leave" },
  { key: "MISSED_PUNCH", label: "⚠ LWP", cls: "lwp" },
];

const badge = (s: string) => {
  const map: Record<string, string> = {
    PRESENT: "badge-present", ABSENT: "badge-absent",
    HALF_DAY: "badge-half-day", ON_LEAVE: "badge-on-leave",
    HOLIDAY: "badge-holiday", WEEK_OFF: "badge-week-off",
    MISSED_PUNCH: "badge-missed-punch",
  };
  return `badge ${map[s] || "badge-default"}`;
};

const fmt = (s: string | null) => {
  if (!s) return "—";
  return s.substring(0, 5);
};

export const AttendanceLogger: React.FC<Props> = ({ employeeId, shifts }) => {
  const today = getLocalDateString();
  const [selDate, setSelDate] = useState(today);
  const [selStatus, setSelStatus] = useState<AttStatus>("PRESENT");
  const [firstIn, setFirstIn] = useState("");
  const [lastOut, setLastOut] = useState("");
  const [selShift, setSelShift] = useState<string>(shifts[0] ? String(shifts[0].id) : "");
  const [overtimeMin, setOvertimeMin] = useState(0);
  const [history, setHistory] = useState<AttRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const yearMonth = selDate.substring(0, 7);
      const res = await apiClient.get(
        `/attendance/records/?employee_id=${employeeId}&date_from=${yearMonth}-01&date_to=${yearMonth}-31`
      );
      const d = res.data;
      const list: AttRecord[] = Array.isArray(d) ? d : d.results ?? [];
      list.sort((a, b) => b.attendance_date.localeCompare(a.attendance_date));
      setHistory(list);

      // Pre-fill if record exists for selected date
      const existing = list.find(r => r.attendance_date === selDate);
      if (existing) {
        setSelStatus(existing.status as AttStatus);
        setFirstIn(existing.first_in ? existing.first_in.substring(0, 5) : "");
        setLastOut(existing.last_out ? existing.last_out.substring(0, 5) : "");
        setSelShift(existing.shift_id ? String(existing.shift_id) : "");
        setOvertimeMin(existing.overtime_minutes || 0);
      } else {
        setSelStatus("PRESENT");
        setFirstIn("");
        setLastOut("");
        setOvertimeMin(0);
      }
    } catch {
      showToast("Failed to load attendance", "error");
    } finally {
      setLoading(false);
    }
  }, [employeeId, selDate]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const autoCalculateOt = (inVal: string, outVal: string) => {
    if (!inVal || !outVal) return;
    try {
      const [inH, inM] = inVal.split(":").map(Number);
      const [outH, outM] = outVal.split(":").map(Number);
      const inMin = inH * 60 + inM;
      const outMin = outH * 60 + outM;
      const worked = outMin >= inMin ? outMin - inMin : (24 * 60 - inMin) + outMin;
      const extra = worked - 720; // 12-hour shift = 720 min
      if (extra > 30) {
        setOvertimeMin(extra);
      } else {
        setOvertimeMin(0);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (shifts.length > 0 && !selShift) setSelShift(String(shifts[0].id));
  }, [shifts, selShift]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        employee_id: employeeId,
        attendance_date: selDate,
        status: selStatus,
        first_in: firstIn || null,
        last_out: lastOut || null,
        shift_id: selShift ? Number(selShift) : null,
        overtime_minutes: overtimeMin,
      };
      await apiClient.post("/attendance/records/", payload);
      showToast(`Marked ${selStatus} for ${selDate}`);
      fetchHistory();
    } catch (e: any) {
      showToast(`Error: ${e.response?.data?.detail || e.message}`, "error");
    } finally {
      setSaving(false);
    }
  };

  const loadRecord = (rec: AttRecord) => {
    setSelDate(rec.attendance_date);
    setSelStatus(rec.status as AttStatus);
    setFirstIn(rec.first_in ? rec.first_in.substring(0, 5) : "");
    setLastOut(rec.last_out ? rec.last_out.substring(0, 5) : "");
    setSelShift(rec.shift_id ? String(rec.shift_id) : "");
    setOvertimeMin(rec.overtime_minutes || 0);
  };

  return (
    <div className="card">
      <div className="card-header">
        <Clock size={16} color="#f97316" />
        <span className="card-title">Attendance & Shift</span>
        <button className="btn btn-secondary btn-xs" style={{ marginLeft: "auto" }} onClick={fetchHistory} title="Refresh">
          <RefreshCw size={12} />
        </button>
      </div>
      <div className="card-body">
        {/* Date Picker */}
        <div className="att-date-picker">
          <Calendar size={15} color="#64748b" />
          <input type="date" value={selDate} onChange={e => setSelDate(e.target.value)} max={today} />
        </div>

        {/* Status Buttons */}
        <div className="status-buttons">
          {STATUS_OPTIONS.map(opt => (
            <button
              key={opt.key}
              type="button"
              className={`status-btn ${opt.cls}${selStatus === opt.key ? " active" : ""}`}
              onClick={() => setSelStatus(opt.key)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Shift */}
        <div className="form-field" style={{ marginBottom: 12 }}>
          <label>Shift</label>
          <select value={selShift} onChange={e => setSelShift(e.target.value)}>
            <option value="">No Shift</option>
            {shifts.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({fmt(s.start_time)} – {fmt(s.end_time)})</option>
            ))}
          </select>
        </div>

        {/* Time Row */}
        <div className="time-row">
          <div className="form-field">
            <label>Check-In</label>
            <input
              type="time"
              value={firstIn}
              onChange={e => {
                setFirstIn(e.target.value);
                autoCalculateOt(e.target.value, lastOut);
              }}
            />
          </div>
          <div className="form-field">
            <label>Check-Out</label>
            <input
              type="time"
              value={lastOut}
              onChange={e => {
                setLastOut(e.target.value);
                autoCalculateOt(firstIn, e.target.value);
              }}
            />
          </div>
        </div>

        {/* Overtime */}
        <div className="form-field" style={{ marginBottom: 16 }}>
          <label>Overtime (minutes)</label>
          <input type="number" min={0} value={overtimeMin} onChange={e => setOvertimeMin(Number(e.target.value))} />
        </div>

        <button className="btn btn-primary" style={{ width: "100%" }} onClick={handleSave} disabled={saving}>
          <Save size={14} /> {saving ? "Saving…" : "Save Attendance"}
        </button>

        {/* Monthly History */}
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 8 }}>This Month</div>
          {loading ? (
            <div style={{ textAlign: "center", color: "#94a3b8", padding: "12px 0", fontSize: 13 }}>Loading…</div>
          ) : history.length === 0 ? (
            <div style={{ textAlign: "center", color: "#94a3b8", padding: "12px 0", fontSize: 13 }}>No records yet</div>
          ) : (
            <table className="att-history-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Status</th>
                  <th>In</th>
                  <th>Out</th>
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 15).map(rec => (
                  <tr key={rec.attendance_date} style={{ cursor: "pointer" }} onClick={() => loadRecord(rec)}>
                    <td>{rec.attendance_date}</td>
                    <td><span className={badge(rec.status)}>{rec.status.replace("_", " ")}</span></td>
                    <td>{fmt(rec.first_in)}</td>
                    <td>{fmt(rec.last_out)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </div>
  );
};


import React, { useEffect, useState, useCallback } from "react";
import { TrendingUp, RefreshCw, Edit2, Check, X } from "lucide-react";
import { apiClient } from "../api/client";

interface AttRecord {
  id?: number;
  attendance_date: string;
  status: string;
  worked_minutes: number;
  overtime_minutes: number;
  first_in: string | null;
  last_out: string | null;
}

interface Props {
  employeeId: number;
  standardHoursPerDay?: number;
}

const fmtHours = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
};

export const OvertimeTracker: React.FC<Props> = ({ employeeId, standardHoursPerDay = 12 }) => {
  const [records, setRecords] = useState<AttRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editMinutes, setEditMinutes] = useState<number>(0);
  const [savingId, setSavingId] = useState<number | null>(null);

  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(
        `/attendance/records/?employee_id=${employeeId}&month=${month}`
      );
      const d = res.data;
      const list: AttRecord[] = Array.isArray(d) ? d : d.results ?? [];
      setRecords(list);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [employeeId, month]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleStartEdit = (r: AttRecord) => {
    if (r.id) {
      setEditingId(r.id);
      setEditMinutes(r.overtime_minutes || 0);
    }
  };

  const handleSaveOt = async (recordId: number) => {
    setSavingId(recordId);
    try {
      await apiClient.patch(`/attendance/records/${recordId}/`, {
        overtime_minutes: editMinutes,
      });
      setRecords(prev => prev.map(r => r.id === recordId ? { ...r, overtime_minutes: editMinutes } : r));
      setEditingId(null);
    } catch (e) {
      console.error("Failed to update overtime", e);
    } finally {
      setSavingId(null);
    }
  };

  const presentDays = records.filter(r => r.status === "PRESENT" || r.status === "HALF_DAY").length;
  const halfDays = records.filter(r => r.status === "HALF_DAY").length;
  const standardMin = (presentDays - halfDays * 0.5) * standardHoursPerDay * 60;
  const actualWorkedMin = records.reduce((s, r) => s + (r.worked_minutes || 0), 0);
  const recordedOtMin = records.reduce((s, r) => s + (r.overtime_minutes || 0), 0);
  const calcOtMin = Math.max(0, actualWorkedMin - standardMin);
  const totalOtMin = Math.max(recordedOtMin, calcOtMin);

  // Show any records with overtime or that worked over standard
  const overtimeDays = records.filter(r => (r.overtime_minutes || 0) > 0 || (r.worked_minutes || 0) > 720);

  return (
    <div className="card">
      <div className="card-header">
        <TrendingUp size={16} color="#2563eb" />
        <span className="card-title">Overtime Tracking (12h Shift)</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="month"
            value={month}
            onChange={e => setMonth(e.target.value)}
            style={{ padding: "4px 8px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12 }}
          />
          <button className="btn btn-secondary btn-xs" onClick={fetchData}>
            <RefreshCw size={12} />
          </button>
        </div>
      </div>
      <div className="card-body">
        {/* Summary Stats */}
        <div className="ot-summary">
          <div className="ot-stat">
            <div className="ot-val">{presentDays}</div>
            <div className="ot-lbl">Working Days</div>
          </div>
          <div className="ot-stat">
            <div className="ot-val">{fmtHours(actualWorkedMin)}</div>
            <div className="ot-lbl">Actual Hours</div>
          </div>
          <div className="ot-stat">
            <div className="ot-val" style={{ color: standardMin > actualWorkedMin ? "#dc2626" : "#16a34a" }}>
              {fmtHours(Math.round(standardMin))}
            </div>
            <div className="ot-lbl">Standard ({standardHoursPerDay}h)</div>
          </div>
          <div className="ot-stat">
            <div className="ot-val" style={{ color: totalOtMin > 0 ? "#2563eb" : "#64748b" }}>
              {fmtHours(totalOtMin)}
            </div>
            <div className="ot-lbl">Total OT</div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#64748b", marginBottom: 4 }}>
            <span>Hours worked vs standard 12h shifts</span>
            <span>{standardMin > 0 ? Math.round((actualWorkedMin / standardMin) * 100) : 0}%</span>
          </div>
          <div style={{ height: 8, background: "#f1f5f9", borderRadius: 4, overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${Math.min(100, standardMin > 0 ? (actualWorkedMin / standardMin) * 100 : 0)}%`,
              background: actualWorkedMin >= standardMin ? "#22c55e" : "#f59e0b",
              borderRadius: 4,
              transition: "width 0.4s ease",
            }} />
          </div>
        </div>

        {/* OT Details — Editable */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.4px" }}>
            Overtime Log (Editable)
          </div>
          <span style={{ fontSize: 11, color: "#94a3b8" }}>Condition: Extra time &gt; 30m</span>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", color: "#94a3b8", padding: "12px 0", fontSize: 13 }}>Loading…</div>
        ) : overtimeDays.length === 0 ? (
          <div style={{ textAlign: "center", color: "#94a3b8", padding: "12px 0", fontSize: 13 }}>
            No overtime logged (&gt;30m over 12h shift)
          </div>
        ) : (
          <table className="att-history-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Worked</th>
                <th>Overtime</th>
                <th style={{ textAlign: "right" }}>Edit</th>
              </tr>
            </thead>
            <tbody>
              {overtimeDays.map(r => (
                <tr key={r.attendance_date}>
                  <td>{r.attendance_date}</td>
                  <td>{fmtHours(r.worked_minutes)}</td>
                  <td>
                    {editingId === r.id ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <input
                          type="number"
                          min={0}
                          value={editMinutes}
                          onChange={e => setEditMinutes(Number(e.target.value))}
                          style={{ width: 60, padding: "2px 6px", fontSize: 12, border: "1px solid #3b82f6", borderRadius: 4 }}
                        />
                        <span style={{ fontSize: 11, color: "#64748b" }}>min</span>
                      </div>
                    ) : (
                      <span style={{ color: "#2563eb", fontWeight: 700 }}>
                        {fmtHours(r.overtime_minutes || 0)} ({r.overtime_minutes || 0}m)
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {editingId === r.id ? (
                      <div style={{ display: "inline-flex", gap: 4 }}>
                        <button
                          type="button"
                          className="btn btn-primary btn-xs"
                          style={{ padding: "2px 6px" }}
                          onClick={() => r.id && handleSaveOt(r.id)}
                          disabled={savingId === r.id}
                          title="Save OT"
                        >
                          <Check size={12} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-xs"
                          style={{ padding: "2px 6px" }}
                          onClick={() => setEditingId(null)}
                          title="Cancel"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="btn-icon-action"
                        style={{ width: 24, height: 24, display: "inline-flex" }}
                        onClick={() => handleStartEdit(r)}
                        title="Edit Overtime"
                      >
                        <Edit2 size={12} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Configured rate notice */}
        <div style={{ marginTop: 14, padding: "10px 12px", background: "#eff6ff", borderRadius: 8, borderLeft: "3px solid #2563eb" }}>
          <div style={{ fontSize: 12, color: "#1d4ed8", fontWeight: 600 }}>Standard Shift: 12 Hours</div>
          <div style={{ fontSize: 11, color: "#3b82f6", marginTop: 2 }}>
            Overtime activates only when worked time exceeds 12 hours by more than 30 minutes. Values are directly editable.
          </div>
        </div>
      </div>
    </div>
  );
};

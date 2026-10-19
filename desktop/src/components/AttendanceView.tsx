import React, { useEffect, useState } from "react";
import { apiClient } from "../api/client";
import { Clock, Play, Square, Calendar, CheckCircle2, AlertCircle, RefreshCw, Sparkles, Timer } from "lucide-react";

export const AttendanceView: React.FC = () => {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Real-time clock update
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/attendance/records/");
      const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
      setRecords(data);
    } catch (err) {
      console.error("Failed to load attendance records", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  // Determine today's latest punch status
  const todayStr = new Date().toISOString().split("T")[0];
  const todayRecord = records.find(r => r.attendance_date === todayStr);
  const isCurrentlyIn = Boolean(todayRecord && todayRecord.first_in && !todayRecord.last_out);

  const handlePunch = async (punchType: "IN" | "OUT") => {
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await apiClient.post("/attendance/punch/", { punch_type: punchType });
      setMessage({ text: res.data.detail, type: "success" });
      fetchAttendance();
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || "Action failed. Check connection.";
      setMessage({ text: errorMsg, type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  // Format time in 12-hour AM/PM
  const timeFormatted = currentTime.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  const dateFormatted = currentTime.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Calculate summary stats
  const totalWorkedMins = records.reduce((acc, r) => acc + (r.worked_minutes || 0), 0);
  const totalOtMins = records.reduce((acc, r) => acc + (r.overtime_minutes || 0), 0);
  const presentDays = records.filter(r => r.status === "PRESENT").length;

  return (
    <div className="directory-container animate-fade-in">
      {/* Top Header */}
      <div className="page-header modern-page-header">
        <div>
          <h2>Attendance & Shifts</h2>
          <p>Live punch logging, biometric timestamps, and automated overtime tracking</p>
        </div>
        <div className="header-actions">
          <button
            className="icon-btn"
            onClick={fetchAttendance}
            title="Refresh Attendance"
            disabled={loading}
          >
            <RefreshCw size={17} className={loading ? "spin" : ""} />
          </button>
        </div>
      </div>

      {message && (
        <div className={`status-banner ${message.type === "success" ? "status-success" : "status-error"}`}>
          {message.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Hero Attendance Punch Card */}
      <div className="attendance-hero-card">
        <div className="att-hero-left">
          <div className="live-clock-badge">
            <span className="live-pulse-dot" />
            <span>LIVE CLOCK</span>
          </div>
          <div className="live-clock-time">{timeFormatted}</div>
          <div className="live-clock-date">{dateFormatted}</div>

          <div className="current-shift-status">
            <span className="status-label">Today's Status:</span>
            {isCurrentlyIn ? (
              <span className="shift-chip shift-chip-active">
                <span className="dot dot-active" /> Currently Punched In
              </span>
            ) : todayRecord?.last_out ? (
              <span className="shift-chip shift-chip-done">
                <CheckCircle2 size={14} /> Completed for Today
              </span>
            ) : (
              <span className="shift-chip shift-chip-idle">
                <Clock size={14} /> Not Clocked In Yet
              </span>
            )}
          </div>
        </div>

        <div className="att-hero-actions">
          {!isCurrentlyIn ? (
            <button
              className="btn-punch-in-hero"
              disabled={actionLoading}
              onClick={() => handlePunch("IN")}
            >
              <div className="punch-icon-circle">
                <Play size={24} fill="currentColor" />
              </div>
              <div className="punch-btn-copy">
                <strong>Clock In</strong>
                <small>Log Shift Start Timestamp</small>
              </div>
            </button>
          ) : (
            <button
              className="btn-punch-out-hero"
              disabled={actionLoading}
              onClick={() => handlePunch("OUT")}
            >
              <div className="punch-icon-circle punch-out-circle">
                <Square size={22} fill="currentColor" />
              </div>
              <div className="punch-btn-copy">
                <strong>Clock Out</strong>
                <small>Record Shift Departure</small>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Quick Summary Metric Cards */}
      <div className="metric-cards-grid">
        <div className="metric-card">
          <div className="metric-header">
            <span>PRESENT DAYS</span>
            <CheckCircle2 size={17} className="metric-icon-emerald" />
          </div>
          <div className="metric-value">{presentDays}</div>
          <div className="metric-footer">Logged This Month</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span>TOTAL HOURS</span>
            <Timer size={17} className="metric-icon-blue" />
          </div>
          <div className="metric-value">
            {Math.floor(totalWorkedMins / 60)}h {totalWorkedMins % 60}m
          </div>
          <div className="metric-footer">Active Working Time</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span>OVERTIME</span>
            <Sparkles size={17} className="metric-icon-amber" />
          </div>
          <div className="metric-value">
            +{Math.floor(totalOtMins / 60)}h {totalOtMins % 60}m
          </div>
          <div className="metric-footer">&gt;12h Shift Extra</div>
        </div>
      </div>

      <div className="section-title-row">
        <h3>Shift Activity History</h3>
        <span className="badge-count">{records.length} records</span>
      </div>

      {loading ? (
        <div className="loading-state">
          <RefreshCw size={24} className="spin text-muted" />
          <p>Fetching attendance records...</p>
        </div>
      ) : records.length === 0 ? (
        <div className="empty-state">
          <Clock size={48} color="#94a3b8" />
          <h3>No Records Logged Yet</h3>
          <p>Tap "Clock In" above to start logging your shift.</p>
        </div>
      ) : (
        <>
          {/* Mobile Attendance Cards Feed */}
          <div className="mobile-att-cards-container">
            {records.map((r) => (
              <div key={r.id} className="mobile-att-card">
                <div className="mobile-att-card-top">
                  <div className="mobile-att-date">
                    <Calendar size={15} />
                    <span>{r.attendance_date}</span>
                  </div>
                  <span className={`status-badge status-${(r.status || "present").toLowerCase()}`}>
                    {r.status}
                  </span>
                </div>

                <div className="mobile-att-times-row">
                  <div className="time-col">
                    <span className="time-lbl">First In</span>
                    <strong className="time-val">{r.first_in || "—"}</strong>
                  </div>
                  <span className="time-separator">→</span>
                  <div className="time-col">
                    <span className="time-lbl">Last Out</span>
                    <strong className="time-val">{r.last_out || "—"}</strong>
                  </div>
                  <div className="time-col duration-col">
                    <span className="time-lbl">Worked</span>
                    <strong className="time-val duration-val">
                      {r.worked_minutes ? `${Math.floor(r.worked_minutes / 60)}h ${r.worked_minutes % 60}m` : "—"}
                    </strong>
                  </div>
                </div>

                {r.overtime_minutes > 0 && (
                  <div className="mobile-att-ot-badge">
                    <Sparkles size={13} />
                    <span>+{Math.floor(r.overtime_minutes / 60)}h {r.overtime_minutes % 60}m Overtime</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Wide Screen Responsive Table */}
          <div className="table-responsive desktop-only-table">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Status</th>
                  <th>First In</th>
                  <th>Last Out</th>
                  <th>Total Worked</th>
                  <th>Overtime</th>
                  <th>Late Flag</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id}>
                    <td><strong>{r.attendance_date}</strong></td>
                    <td>
                      <span className={`status-badge status-${(r.status || "present").toLowerCase()}`}>
                        {r.status}
                      </span>
                    </td>
                    <td>{r.first_in || "—"}</td>
                    <td>{r.last_out || "—"}</td>
                    <td>{r.worked_minutes ? `${Math.floor(r.worked_minutes / 60)}h ${r.worked_minutes % 60}m` : "—"}</td>
                    <td>
                      {r.overtime_minutes > 0 ? (
                        <span className="ot-badge-pill">+{Math.floor(r.overtime_minutes / 60)}h {r.overtime_minutes % 60}m</span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td>{r.is_late ? "Late Arrival" : "On Time"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default AttendanceView;

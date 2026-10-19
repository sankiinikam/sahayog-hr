import React, { useEffect, useState } from "react";
import { apiClient } from "../api/client";
import { UserCheck, Laptop, Receipt, Bell, Check, RefreshCw } from "lucide-react";

export const OperationsView: React.FC = () => {
  const [requisitions, setRequisitions] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"requisitions" | "assets" | "claims" | "alerts">("requisitions");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [reqRes, claimRes, assetRes, notifRes] = await Promise.all([
        apiClient.get("/recruitment/requisitions/").catch(() => ({ data: { results: [] } })),
        apiClient.get("/expenses/claims/").catch(() => ({ data: { results: [] } })),
        apiClient.get("/expenses/assets/").catch(() => ({ data: { results: [] } })),
        apiClient.get("/notifications/alerts/").catch(() => ({ data: { results: [] } })),
      ]);
      setRequisitions(Array.isArray(reqRes.data) ? reqRes.data : (reqRes.data.results || []));
      setClaims(Array.isArray(claimRes.data) ? claimRes.data : (claimRes.data.results || []));
      setAssets(Array.isArray(assetRes.data) ? assetRes.data : (assetRes.data.results || []));
      setNotifications(Array.isArray(notifRes.data) ? notifRes.data : (notifRes.data.results || []));
    } catch (err) {
      console.error("Failed to load operations data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const markNotifRead = async (id: number) => {
    try {
      await apiClient.post(`/notifications/alerts/${id}/read/`);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    } catch (err) {
      console.error(err);
    }
  };

  const unreadAlerts = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="directory-container animate-fade-in">
      <div className="page-header modern-page-header">
        <div>
          <h2>Operations & Support Center</h2>
          <p>Recruitment pipelines, corporate asset custody, expense claims, and enterprise alerts</p>
        </div>
        <div className="header-actions">
          <button className="icon-btn" onClick={fetchData} title="Refresh Operations" disabled={loading}>
            <RefreshCw size={17} className={loading ? "spin" : ""} />
          </button>
        </div>
      </div>

      {/* Modern KPI Summary Strip */}
      <div className="ops-kpi-grid">
        <div
          className={`ops-kpi-card ${activeTab === "requisitions" ? "active-kpi" : ""}`}
          onClick={() => setActiveTab("requisitions")}
        >
          <div className="ops-kpi-icon icon-purple">
            <UserCheck size={20} />
          </div>
          <div className="ops-kpi-body">
            <span className="ops-kpi-lbl">REQUISITIONS</span>
            <strong className="ops-kpi-val">{requisitions.length}</strong>
          </div>
        </div>

        <div
          className={`ops-kpi-card ${activeTab === "assets" ? "active-kpi" : ""}`}
          onClick={() => setActiveTab("assets")}
        >
          <div className="ops-kpi-icon icon-cyan">
            <Laptop size={20} />
          </div>
          <div className="ops-kpi-body">
            <span className="ops-kpi-lbl">ACTIVE ASSETS</span>
            <strong className="ops-kpi-val">{assets.length}</strong>
          </div>
        </div>

        <div
          className={`ops-kpi-card ${activeTab === "claims" ? "active-kpi" : ""}`}
          onClick={() => setActiveTab("claims")}
        >
          <div className="ops-kpi-icon icon-emerald">
            <Receipt size={20} />
          </div>
          <div className="ops-kpi-body">
            <span className="ops-kpi-lbl">EXPENSE CLAIMS</span>
            <strong className="ops-kpi-val">{claims.length}</strong>
          </div>
        </div>

        <div
          className={`ops-kpi-card ${activeTab === "alerts" ? "active-kpi" : ""}`}
          onClick={() => setActiveTab("alerts")}
        >
          <div className="ops-kpi-icon icon-amber">
            <Bell size={20} />
          </div>
          <div className="ops-kpi-body">
            <span className="ops-kpi-lbl">NOTIFICATIONS</span>
            <strong className="ops-kpi-val">
              {unreadAlerts > 0 ? `${unreadAlerts} unread` : "0 unread"}
            </strong>
          </div>
        </div>
      </div>

      {/* Segment Switcher for mobile navigation */}
      <div className="ops-segment-tabs">
        <button
          className={`segment-btn ${activeTab === "requisitions" ? "active" : ""}`}
          onClick={() => setActiveTab("requisitions")}
        >
          <UserCheck size={16} />
          <span>Hiring ({requisitions.length})</span>
        </button>
        <button
          className={`segment-btn ${activeTab === "assets" ? "active" : ""}`}
          onClick={() => setActiveTab("assets")}
        >
          <Laptop size={16} />
          <span>Assets ({assets.length})</span>
        </button>
        <button
          className={`segment-btn ${activeTab === "claims" ? "active" : ""}`}
          onClick={() => setActiveTab("claims")}
        >
          <Receipt size={16} />
          <span>Claims ({claims.length})</span>
        </button>
        <button
          className={`segment-btn ${activeTab === "alerts" ? "active" : ""}`}
          onClick={() => setActiveTab("alerts")}
        >
          <Bell size={16} />
          <span>Alerts {unreadAlerts > 0 && `(${unreadAlerts})`}</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="ops-panel-container">
        {loading ? (
          <div className="loading-state">
            <RefreshCw size={24} className="spin text-muted" />
            <p>Loading operational metrics...</p>
          </div>
        ) : activeTab === "requisitions" ? (
          <div className="ops-tab-panel animate-fade-in">
            <div className="section-title-row">
              <h3>Open Job Requisitions</h3>
              <span className="badge-count">{requisitions.length} open</span>
            </div>

            {requisitions.length === 0 ? (
              <div className="empty-state">
                <UserCheck size={44} color="#94a3b8" />
                <p>No open job openings currently listed.</p>
              </div>
            ) : (
              <div className="ops-card-list">
                {requisitions.map((r) => (
                  <div key={r.id} className="ops-item-card">
                    <div className="ops-item-header">
                      <div>
                        <h4 className="ops-item-title">{r.title}</h4>
                        <span className="ops-item-sub">{r.department || "General Department"}</span>
                      </div>
                      <span className="status-badge status-confirmed">{r.status || "OPEN"}</span>
                    </div>
                    <div className="ops-item-meta">
                      <span>Vacancies: <strong>{r.vacancies || 1}</strong></span>
                      <span className="divider">•</span>
                      <span>Target Date: <strong>{r.target_date || "Immediate"}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === "assets" ? (
          <div className="ops-tab-panel animate-fade-in">
            <div className="section-title-row">
              <h3>Corporate Equipment & Assets</h3>
              <span className="badge-count">{assets.length} assigned</span>
            </div>

            {assets.length === 0 ? (
              <div className="empty-state">
                <Laptop size={44} color="#94a3b8" />
                <p>No corporate assets recorded yet.</p>
              </div>
            ) : (
              <div className="ops-card-list">
                {assets.map((a) => (
                  <div key={a.id} className="ops-item-card">
                    <div className="ops-item-header">
                      <div>
                        <h4 className="ops-item-title">{a.asset_name || a.name}</h4>
                        <span className="ops-item-sub">Serial: {a.serial_number || "—"}</span>
                      </div>
                      <span className="status-badge status-confirmed">{a.status || "IN USE"}</span>
                    </div>
                    <div className="ops-item-meta">
                      <span>Assigned To: <strong>{a.assigned_to_name || "Employee"}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === "claims" ? (
          <div className="ops-tab-panel animate-fade-in">
            <div className="section-title-row">
              <h3>Expense Reimbursement Claims</h3>
              <span className="badge-count">{claims.length} claims</span>
            </div>

            {claims.length === 0 ? (
              <div className="empty-state">
                <Receipt size={44} color="#94a3b8" />
                <p>No expense reimbursement claims submitted.</p>
              </div>
            ) : (
              <div className="ops-card-list">
                {claims.map((c) => (
                  <div key={c.id} className="ops-item-card">
                    <div className="ops-item-header">
                      <div>
                        <h4 className="ops-item-title">{c.category || "Travel / Meals"}</h4>
                        <span className="ops-item-sub">{c.claim_date || "Recent"}</span>
                      </div>
                      <strong className="text-emerald font-bold">₹{c.amount}</strong>
                    </div>
                    <div className="ops-item-meta">
                      <span className={`status-badge status-${(c.status || "pending").toLowerCase()}`}>
                        {c.status || "PENDING"}
                      </span>
                      <span>{c.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="ops-tab-panel animate-fade-in">
            <div className="section-title-row">
              <h3>Enterprise In-App Alerts</h3>
              <span className="badge-count">{unreadAlerts} unread</span>
            </div>

            {notifications.length === 0 ? (
              <div className="empty-state">
                <Bell size={44} color="#94a3b8" />
                <p>No notifications at this time.</p>
              </div>
            ) : (
              <div className="ops-card-list">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`ops-notif-card ${!n.is_read ? "notif-unread" : ""}`}
                  >
                    <div className="notif-content">
                      <h4 className="notif-title">{n.title}</h4>
                      <p className="notif-msg">{n.message}</p>
                    </div>
                    {!n.is_read && (
                      <button
                        className="btn-mark-read"
                        onClick={() => markNotifRead(n.id)}
                        title="Mark as read"
                      >
                        <Check size={14} />
                        <span>Read</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OperationsView;

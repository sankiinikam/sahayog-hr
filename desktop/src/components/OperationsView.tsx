import React, { useEffect, useState } from "react";
import { apiClient } from "../api/client";
import { UserCheck, Laptop, Receipt, Bell, Check } from "lucide-react";

export const OperationsView: React.FC = () => {
  const [requisitions, setRequisitions] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="directory-container">
      <div className="page-header">
        <div>
          <h2>Operations & Support Center</h2>
          <p>Unified console for Recruitment, Expense Claims, Company Assets, and In-App Notifications</p>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">Loading operations metrics...</div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        <div style={{ background: "#fff", padding: "16px", borderRadius: "8px", border: "1px solid var(--border)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: "600" }}>OPEN REQUISITIONS</span>
            <UserCheck size={18} color="var(--primary)" />
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: "700", marginTop: "8px" }}>{requisitions.length}</div>
        </div>

        <div style={{ background: "#fff", padding: "16px", borderRadius: "8px", border: "1px solid var(--border)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: "600" }}>ACTIVE ASSETS</span>
            <Laptop size={18} color="#0891b2" />
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: "700", marginTop: "8px" }}>{assets.length}</div>
        </div>

        <div style={{ background: "#fff", padding: "16px", borderRadius: "8px", border: "1px solid var(--border)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: "600" }}>EXPENSE CLAIMS</span>
            <Receipt size={18} color="#16a34a" />
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: "700", marginTop: "8px" }}>{claims.length}</div>
        </div>

        <div style={{ background: "#fff", padding: "16px", borderRadius: "8px", border: "1px solid var(--border)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: "600" }}>UNREAD ALERTS</span>
            <Bell size={18} color="#eab308" />
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: "700", marginTop: "8px" }}>
            {notifications.filter((n) => !n.is_read).length}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        {/* Recruitment Pipeline */}
        <div style={{ background: "#fff", padding: "16px", borderRadius: "8px", border: "1px solid var(--border)" }}>
          <h3 style={{ marginBottom: "12px", fontSize: "1.1rem" }}>Open Job Requisitions</h3>
          {requisitions.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>No active job requisitions found.</p>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Department</th>
                    <th>Openings</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {requisitions.map((r) => (
                    <tr key={r.id}>
                      <td><strong>{r.title}</strong></td>
                      <td>{r.department}</td>
                      <td>{r.vacancies}</td>
                      <td><span className="status-badge status-confirmed">{r.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* In-App Notifications */}
        <div style={{ background: "#fff", padding: "16px", borderRadius: "8px", border: "1px solid var(--border)" }}>
          <h3 style={{ marginBottom: "12px", fontSize: "1.1rem" }}>In-App Notifications</h3>
          {notifications.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>No notifications at this time.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {notifications.map((n) => (
                <div
                  key={n.id}
                  style={{
                    padding: "10px",
                    borderRadius: "6px",
                    border: "1px solid var(--border)",
                    background: n.is_read ? "#fff" : "#eff6ff",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                >
                  <div>
                    <strong style={{ fontSize: "0.9rem", display: "block" }}>{n.title}</strong>
                    <small style={{ color: "var(--text-muted)" }}>{n.message}</small>
                  </div>
                  {!n.is_read && (
                    <button
                      className="btn-secondary"
                      style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                      onClick={() => markNotifRead(n.id)}
                    >
                      <Check size={12} /> Mark Read
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
        </>
      )}
    </div>
  );
};

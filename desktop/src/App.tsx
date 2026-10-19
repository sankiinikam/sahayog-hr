import React, { useState } from "react";
import { LoginScreen } from "./components/LoginScreen";
import { LandingPage } from "./components/LandingPage";
import { AdminEmployeeDirectory, type Employee } from "./components/AdminEmployeeDirectory";
import { AdminEmployeeProfile } from "./components/AdminEmployeeProfile";
import { CompanyProfile } from "./components/CompanyProfile";
import { AttendanceView } from "./components/AttendanceView";
import { LeaveView } from "./components/LeaveView";
import { PayrollView } from "./components/PayrollView";
import { OperationsView } from "./components/OperationsView";
import { Users, Clock, Calendar, Banknote, Briefcase, Building2, LogOut, Bell, Settings, RefreshCw } from "lucide-react";
import { SahayogLogo } from "./components/SahayogLogo";
import { UpdateNotification } from "./components/UpdateNotification";
import { isOfflineMode, setOfflineMode } from "./api/client";
import "./App.css";

type TabType = "employees" | "attendance" | "leave" | "payroll" | "operations" | "company";

export const App: React.FC = () => {
  // Open the Login page directly on app launch (Mobile & Desktop)
  const [showLogin, setShowLogin] = useState(true);
  const [user, setUser] = useState<any>(() => {
    const cached = localStorage.getItem("user_info");
    return cached ? JSON.parse(cached) : null;
  });

  const [currentTab, setCurrentTab] = useState<TabType>("employees");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user_info");
    setOfflineMode(false);
    setUser(null);
    setSelectedEmployee(null);
  };

  if (!user) {
    return (
      <>
        <UpdateNotification />
        {showLogin ? (
          <LoginScreen
            onLoginSuccess={(u) => setUser(u)}
            onViewLanding={() => setShowLogin(false)}
          />
        ) : (
          <LandingPage onSignIn={() => setShowLogin(true)} />
        )}
      </>
    );
  }

  return (
    <div className="app-shell">
      <UpdateNotification />
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <SahayogLogo size="sm" variant="horizontal" showSubtitle={false} theme="dark" />
        </div>

        <nav className="nav-menu">
          <button
            className={`nav-item ${currentTab === "employees" ? "active" : ""}`}
            onClick={() => {
              setCurrentTab("employees");
              setSelectedEmployee(null);
            }}
          >
            <Users size={18} />
            <span>Employees</span>
          </button>

          <button
            className={`nav-item ${currentTab === "attendance" ? "active" : ""}`}
            onClick={() => {
              setCurrentTab("attendance");
              setSelectedEmployee(null);
            }}
          >
            <Clock size={18} />
            <span>Attendance</span>
          </button>

          <button
            className={`nav-item ${currentTab === "leave" ? "active" : ""}`}
            onClick={() => {
              setCurrentTab("leave");
              setSelectedEmployee(null);
            }}
          >
            <Calendar size={18} />
            <span>Leave</span>
          </button>

          <button
            className={`nav-item ${currentTab === "payroll" ? "active" : ""}`}
            onClick={() => {
              setCurrentTab("payroll");
              setSelectedEmployee(null);
            }}
          >
            <Banknote size={18} />
            <span>Payroll</span>
          </button>

          <button
            className={`nav-item ${currentTab === "operations" ? "active" : ""}`}
            onClick={() => {
              setCurrentTab("operations");
              setSelectedEmployee(null);
            }}
          >
            <Briefcase size={18} />
            <span>Operations</span>
          </button>

          <button
            className={`nav-item ${currentTab === "company" ? "active" : ""}`}
            onClick={() => {
              setCurrentTab("company");
              setSelectedEmployee(null);
            }}
          >
            <Building2 size={18} />
            <span>Company Profile</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="user-badge">
            <strong>{user.full_name || user.email}</strong>
            <span className="role-tag">{user.role || "ADMIN"}</span>
          </div>
          <button className="btn-logout" onClick={handleLogout} title="Log Out">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="top-bar">
          <div className="top-title">
            {selectedEmployee ? (
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{ color: "#64748b", cursor: "pointer", fontSize: 14, fontWeight: 500 }}
                  onClick={() => setSelectedEmployee(null)}
                >
                  Employees
                </span>
                <span style={{ color: "#94a3b8" }}>›</span>
                {selectedEmployee.first_name} {selectedEmployee.last_name}
              </span>
            ) : currentTab === "attendance" ? (
              "Attendance & Shift Management"
            ) : currentTab === "leave" ? (
              "Leave Management & Time Off"
            ) : currentTab === "payroll" ? (
              "Payroll & Statutory Compensation"
            ) : currentTab === "operations" ? (
              "Operations & Asset Management"
            ) : currentTab === "company" ? (
              "Company Profile & Structure"
            ) : (
              "Sahayog HR — Workforce Directory"
            )}
          </div>
          <div className="top-actions">
            {isOfflineMode() && (
              <span className="offline-badge-pill" title="Running in Standalone Offline Mode using device storage">
                <span className="dot dot-active" />
                Standalone Mode
              </span>
            )}
            <button
              className="icon-btn"
              title="Check for App Updates"
              onClick={() => window.dispatchEvent(new CustomEvent("sahayog:check-update"))}
            >
              <RefreshCw size={17} />
            </button>
            <button className="icon-btn" title="Notifications">
              <Bell size={18} />
            </button>
            <button className="icon-btn" title="Settings">
              <Settings size={18} />
            </button>
            <button className="icon-btn mobile-only-logout" onClick={handleLogout} title="Log Out">
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <section className="content-body">
          {currentTab === "company" ? (
            <CompanyProfile />
          ) : currentTab === "attendance" ? (
            <AttendanceView />
          ) : currentTab === "leave" ? (
            <LeaveView />
          ) : currentTab === "payroll" ? (
            <PayrollView />
          ) : currentTab === "operations" ? (
            <OperationsView />
          ) : selectedEmployee ? (
            <AdminEmployeeProfile
              employeeId={selectedEmployee.id}
              onBack={() => setSelectedEmployee(null)}
            />
          ) : (
            <AdminEmployeeDirectory onSelectEmployee={(emp) => setSelectedEmployee(emp)} />
          )}
        </section>
      </main>

      {/* Mobile Bottom Navigation Bar (Visible only on mobile screens) */}
      <nav className="mobile-bottom-nav">
        <button
          className={`mobile-nav-btn ${currentTab === "employees" ? "active" : ""}`}
          onClick={() => {
            setCurrentTab("employees");
            setSelectedEmployee(null);
          }}
        >
          <Users size={19} />
          <span>Staff</span>
        </button>

        <button
          className={`mobile-nav-btn ${currentTab === "attendance" ? "active" : ""}`}
          onClick={() => {
            setCurrentTab("attendance");
            setSelectedEmployee(null);
          }}
        >
          <Clock size={19} />
          <span>Attendance</span>
        </button>

        <button
          className={`mobile-nav-btn ${currentTab === "leave" ? "active" : ""}`}
          onClick={() => {
            setCurrentTab("leave");
            setSelectedEmployee(null);
          }}
        >
          <Calendar size={19} />
          <span>Leave</span>
        </button>

        <button
          className={`mobile-nav-btn ${currentTab === "payroll" ? "active" : ""}`}
          onClick={() => {
            setCurrentTab("payroll");
            setSelectedEmployee(null);
          }}
        >
          <Banknote size={19} />
          <span>Payroll</span>
        </button>

        <button
          className={`mobile-nav-btn ${currentTab === "operations" ? "active" : ""}`}
          onClick={() => {
            setCurrentTab("operations");
            setSelectedEmployee(null);
          }}
        >
          <Briefcase size={19} />
          <span>Ops</span>
        </button>

        <button
          className={`mobile-nav-btn ${currentTab === "company" ? "active" : ""}`}
          onClick={() => {
            setCurrentTab("company");
            setSelectedEmployee(null);
          }}
        >
          <Building2 size={19} />
          <span>Company</span>
        </button>
      </nav>
    </div>
  );
};

export default App;

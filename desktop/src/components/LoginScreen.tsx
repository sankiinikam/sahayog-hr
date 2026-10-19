import React, { useState } from "react";
import { apiClient, getApiBaseUrl, setApiBaseUrl, setOfflineMode } from "../api/client";
import { Lock, Mail, AlertCircle, ArrowRight, Loader2, Smartphone, Sparkles, Wifi, Eye, EyeOff, Globe, ShieldCheck } from "lucide-react";
import { SahayogLogo } from "./SahayogLogo";

interface LoginProps {
  onLoginSuccess: (user: any) => void;
  onViewLanding?: () => void;
}

export const LoginScreen: React.FC<LoginProps> = ({ onLoginSuccess, onViewLanding }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [apiBaseUrl, setApiBaseUrlState] = useState(getApiBaseUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<"cloud" | "standalone">("cloud");

  const handleStartOfflineMode = () => {
    setOfflineMode(true);
    const demoUser = {
      id: 1,
      email: "admin@sahayog.local",
      first_name: "Admin",
      last_name: "User",
      role: "ADMIN",
      is_staff: true,
      is_superuser: true,
    };
    localStorage.setItem("access_token", "offline-demo-access-token");
    localStorage.setItem("refresh_token", "offline-demo-refresh-token");
    localStorage.setItem("user_info", JSON.stringify(demoUser));
    onLoginSuccess(demoUser);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (activeMode === "standalone") {
      handleStartOfflineMode();
      return;
    }

    try {
      const parsedUrl = new URL(apiBaseUrl.trim());
      if (!parsedUrl.protocol.startsWith("http")) throw new Error("Unsupported protocol");
      setApiBaseUrl(apiBaseUrl);
    } catch {
      setError("Enter a valid HRMS server address, including http:// or https://.");
      return;
    }
    setLoading(true);

    try {
      setOfflineMode(false);
      const response = await apiClient.post("/auth/login/", { email, password });
      const { access, refresh, user } = response.data;

      // Strict Administrator access enforcement
      if (user.role && user.role !== "ADMIN" && !user.is_superuser && !user.is_staff) {
        setError("Access Restricted: This application is reserved for Administrators only.");
        return;
      }

      localStorage.setItem("access_token", access);
      localStorage.setItem("refresh_token", refresh);
      localStorage.setItem("user_info", JSON.stringify(user));
      onLoginSuccess(user);
    } catch (err: any) {
      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError("Unable to connect to HRMS server. Switch to Standalone Mode for instant offline access.");
      }
    } finally {
      setLoading(false);
    }
  };

  const [showAdvancedServer, setShowAdvancedServer] = useState(false);

  return (
    <div className="login-container">
      {/* Dynamic ambient floating orbs */}
      <div className="login-ambient-glow glow-saffron" />
      <div className="login-ambient-glow glow-blue" />
      <div className="login-ambient-glow glow-gold" />

      <div className="login-card modern-login-card">
        {/* Brand Header */}
        <div className="login-header">
          <div className="login-logo-wrapper">
            <SahayogLogo size="lg" variant="full" showSubtitle={true} />
          </div>
          <div className="admin-access-badge">
            <ShieldCheck size={14} />
            <span>Administrator Portal</span>
          </div>
          <p className="login-subtitle">
            Enterprise Workforce Suite • Restricted Admin Access
          </p>
        </div>

        {/* Mode Toggle: Cloud Server vs Standalone */}
        <div className="login-mode-switcher">
          <button
            type="button"
            className={`mode-switch-btn ${activeMode === "cloud" ? "active" : ""}`}
            onClick={() => setActiveMode("cloud")}
          >
            <Globe size={15} />
            <span>Cloud Server</span>
          </button>
          <button
            type="button"
            className={`mode-switch-btn ${activeMode === "standalone" ? "active" : ""}`}
            onClick={() => setActiveMode("standalone")}
          >
            <Smartphone size={15} />
            <span>Standalone (Offline)</span>
          </button>
        </div>

        {error && (
          <div className="error-banner animate-fade-in">
            <AlertCircle size={18} className="error-icon" />
            <div className="error-content">
              <span>{error}</span>
              {error.includes("Standalone") && (
                <button
                  type="button"
                  className="btn-offline-shortcut"
                  onClick={handleStartOfflineMode}
                >
                  👉 Tap here to launch Standalone Offline Mode
                </button>
              )}
            </div>
          </div>
        )}

        {activeMode === "standalone" ? (
          <div className="standalone-launch-card animate-fade-in">
            <div className="standalone-info">
              <div className="standalone-badge">
                <Sparkles size={14} className="sparkle-anim" /> 1-Tap Admin Mode
              </div>
              <h4>No Server or Internet Needed</h4>
              <p>
                Run the Sahayog HR administrator suite directly on your device. Employees, attendance logs, and payslips are saved securely to local storage.
              </p>
            </div>

            <button
              type="button"
              onClick={handleStartOfflineMode}
              className="btn-launch-standalone"
            >
              <span>Launch Admin Offline Mode</span>
              <ArrowRight size={18} />
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="login-form animate-fade-in">
            <div className="form-group">
              <label className="form-label">Work Email</label>
              <div className="input-group modern-input-group">
                <Mail size={18} className="input-icon" />
                <input
                  type="email"
                  required
                  className="login-input"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-group modern-input-group">
                <Lock size={18} className="input-icon" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className="login-input"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="input-eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Collapsed Server Settings: No raw IP note shown by default */}
            <div className="server-settings-toggle-row">
              <button
                type="button"
                className="btn-link-server-toggle"
                onClick={() => setShowAdvancedServer(!showAdvancedServer)}
              >
                {showAdvancedServer ? "✕ Hide Server Endpoint" : "⚙ Advanced: Server Endpoint"}
              </button>
            </div>

            {showAdvancedServer && (
              <div className="form-group server-url-group animate-fade-in">
                <label className="form-label">Server Endpoint</label>
                <div className="input-group modern-input-group">
                  <Wifi size={17} className="input-icon" />
                  <input
                    type="url"
                    required
                    className="login-input server-url-input"
                    placeholder="https://server.domain/api/v1"
                    value={apiBaseUrl}
                    onChange={(e) => setApiBaseUrlState(e.target.value)}
                    autoComplete="url"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="login-submit-btn modern-submit-btn"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="spin" />
                  <span>Verifying Admin Access...</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={18} />
                  <span>Sign In to Admin Portal</span>
                  <ArrowRight size={18} className="submit-arrow" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Optional Web Showcase Link if user wants to see the landing page */}
        {onViewLanding && (
          <div className="login-footer-tour">
            <button
              type="button"
              className="btn-tour-link"
              onClick={onViewLanding}
            >
              <Globe size={14} />
              <span>Looking for product overview & downloads? View Landing Page</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginScreen;

import React, { useState } from "react";
import { apiClient, getApiBaseUrl, setApiBaseUrl, setOfflineMode } from "../api/client";
import { Lock, Mail, AlertCircle, ArrowRight, Loader2, Smartphone, Sparkles, Wifi } from "lucide-react";
import { SahayogLogo } from "./SahayogLogo";

interface LoginProps {
  onLoginSuccess: (user: any) => void;
}

export const LoginScreen: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [apiBaseUrl, setApiBaseUrlState] = useState(getApiBaseUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      localStorage.setItem("access_token", access);
      localStorage.setItem("refresh_token", refresh);
      localStorage.setItem("user_info", JSON.stringify(user));
      onLoginSuccess(user);
    } catch (err: any) {
      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError("Unable to connect to HRMS server at " + apiBaseUrl + ". Check your Wi‑Fi or switch to Standalone Mode.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Ambient background glows for the frosted glass backdrop filter */}
      <div className="login-ambient-glow glow-saffron" />
      <div className="login-ambient-glow glow-blue" />
      <div className="login-ambient-glow glow-gold" />

      <div className="login-card">
        <div className="login-header">
          <SahayogLogo size="lg" variant="full" showSubtitle={true} />
          <p className="login-subtitle">
            Enterprise HR & Payroll Platform • Mobile & Desktop
          </p>
        </div>

        {error && (
          <div className="error-banner">
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

        {/* 1-Tap Standalone Mode Button (Works immediately on phone without any server) */}
        <button
          type="button"
          onClick={handleStartOfflineMode}
          className="btn-offline-mode"
          title="Run completely offline on phone without any server or hosting"
        >
          <div className="btn-offline-icon-box">
            <Smartphone size={18} />
          </div>
          <div className="btn-offline-text">
            <strong>Launch Standalone Mode (No Server Needed)</strong>
            <small>Full functionality • Saves to your phone's storage</small>
          </div>
          <Sparkles size={16} className="sparkle-icon" />
        </button>

        <div className="login-offline-divider">
          <span>OR SIGN IN TO A SERVER</span>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label className="form-label">Work Email</label>
            <div className="input-group">
              <Mail size={18} className="input-icon" />
              <input
                type="email"
                required
                className="login-input"
                placeholder="admin@hrms.local"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-group">
              <Lock size={18} className="input-icon" />
              <input
                type="password"
                required
                className="login-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
          </div>

          <div className="form-group server-url-group">
            <label className="form-label">HRMS Server Address</label>
            <input
              type="url"
              required
              className="login-input server-url-input"
              placeholder="http://192.168.1.11:8000/api/v1"
              value={apiBaseUrl}
              onChange={(e) => setApiBaseUrlState(e.target.value)}
              autoComplete="url"
            />
            <span className="server-url-help">
              <Wifi size={11} style={{ display: "inline", marginRight: 4 }} />
              On phone: Enter your PC's Wi‑Fi IP (e.g. http://192.168.1.5:8000/api/v1) or use Standalone Mode above.
            </span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="login-submit-btn"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <span>Sign In to Server</span>
                <ArrowRight size={18} className="submit-arrow" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginScreen;

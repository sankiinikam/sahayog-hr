import React, { useState } from "react";
import { apiClient, getApiBaseUrl, setApiBaseUrl } from "../api/client";
import { Lock, Mail, AlertCircle, ArrowRight, Loader2 } from "lucide-react";
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
        setError("Unable to connect to authentication service. Please check backend.");
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
            Enterprise HR & Payroll Platform • Windows Edition
          </p>
        </div>

        {error && (
          <div className="error-banner">
            <AlertCircle size={18} className="error-icon" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label className="form-label">Work Email</label>
            <div className="input-group">
              <Mail size={18} className="input-icon" />
              <input
                type="email"
                required
                className="login-input"
                placeholder="Hr@gmail.com"
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
            <span className="server-url-help">For phone testing, use your computer's Wi‑Fi IP address. Keep this as 127.0.0.1 on the PC.</span>
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
                <span>Sign In to Console</span>
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

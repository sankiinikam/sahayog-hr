import React from "react";

interface SahayogLogoProps {
  size?: "sm" | "md" | "lg";
  variant?: "full" | "icon" | "horizontal";
  showSubtitle?: boolean;
  theme?: "light" | "dark";
}

export const SahayogLogo: React.FC<SahayogLogoProps> = ({
  size = "md",
  variant = "horizontal",
  showSubtitle = true,
  theme = "light",
}) => {
  // Dimensions based on size
  const iconSizes = {
    sm: 32,
    md: 44,
    lg: 68,
  };

  const px = iconSizes[size];

  // The Sahayog Emblem: Two interlocking, uplifting arcs creating an 'S' and a symbol of unity/cooperation (सहयोग)
  const Emblem = (
    <svg
      width={px}
      height={px}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="sahayog-emblem"
      style={{ filter: "drop-shadow(0 4px 12px rgba(249, 115, 22, 0.25))" }}
    >
      <defs>
        {/* Saffron / Marathi Swarajya Saffron Gradient */}
        <linearGradient id="saffronGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FB923C" />
          <stop offset="50%" stopColor="#F97316" />
          <stop offset="100%" stopColor="#EA580C" />
        </linearGradient>

        {/* Royal Corporate Indigo / Navy Gradient */}
        <linearGradient id="indigoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="50%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#1E3A8A" />
        </linearGradient>

        {/* Golden Harmony Glow */}
        <linearGradient id="goldGlow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
      </defs>

      {/* Background soft circular glow */}
      <circle cx="50" cy="50" r="46" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="2" />

      {/* Top Arc (Saffron) - Symbolizes energy, aspiration, leadership */}
      <path
        d="M26 44C26 30.7452 36.7452 20 50 20C63.2548 20 74 30.7452 74 44C74 48 70 51 65 51C60 51 57 47 54 44C51 41 46 38 41 41C36 44 34 50 26 44Z"
        fill="url(#saffronGrad)"
      />

      {/* Bottom Arc (Royal Blue) - Symbolizes foundation, trust, stability */}
      <path
        d="M74 56C74 69.2548 63.2548 80 50 80C36.7452 80 26 69.2548 26 56C26 52 30 49 35 49C40 49 43 53 46 56C49 59 54 62 59 59C64 56 66 50 74 56Z"
        fill="url(#indigoGrad)"
      />

      {/* Central Golden Sun of Prosperity */}
      <circle cx="50" cy="50" r="8.5" fill="url(#goldGlow)" />
      <circle cx="50" cy="50" r="5" fill="#FFFFFF" opacity="0.9" />

      {/* Unity Hands Silhouette Overlap Dots */}
      <circle cx="34" cy="30" r="4.5" fill="url(#saffronGrad)" />
      <circle cx="66" cy="70" r="4.5" fill="url(#indigoGrad)" />
    </svg>
  );

  if (variant === "icon") {
    return <div className="sahayog-logo-wrap">{Emblem}</div>;
  }

  const textColor = theme === "dark" ? "#FFFFFF" : "#0F172A";
  const subColor = theme === "dark" ? "#94A3B8" : "#64748B";

  return (
    <div
      className={`sahayog-brand-container ${variant === "full" ? "brand-vertical" : "brand-horizontal"}`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: size === "lg" ? "16px" : "12px",
        flexDirection: variant === "full" ? "column" : "row",
        textAlign: variant === "full" ? "center" : "left",
      }}
    >
      {Emblem}

      <div className="sahayog-brand-text">
        <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: variant === "full" ? "center" : "flex-start" }}>
          <span
            style={{
              fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif",
              fontSize: size === "lg" ? "28px" : size === "md" ? "20px" : "16px",
              fontWeight: 800,
              letterSpacing: "-0.5px",
              color: textColor,
              lineHeight: 1.1,
            }}
          >
            Sahayog
          </span>
          <span
            style={{
              background: "linear-gradient(135deg, #F97316 0%, #EA580C 100%)",
              color: "#FFFFFF",
              fontSize: size === "lg" ? "14px" : size === "md" ? "11px" : "10px",
              fontWeight: 800,
              padding: "2px 8px",
              borderRadius: "6px",
              letterSpacing: "0.5px",
              boxShadow: "0 2px 6px rgba(249, 115, 22, 0.3)",
              display: "inline-block",
            }}
          >
            HR
          </span>
        </div>

        {showSubtitle && (
          <div
            style={{
              marginTop: "2px",
              fontSize: size === "lg" ? "13px" : "11px",
              fontWeight: 600,
              color: subColor,
              display: "flex",
              alignItems: "center",
              gap: "6px",
              justifyContent: variant === "full" ? "center" : "flex-start",
            }}
          >
            <span style={{ color: "#EA580C", fontWeight: 700 }}>सहयोग</span>
            <span style={{ opacity: 0.5 }}>•</span>
            <span>एकत्र काम, एकत्र यश</span>
          </div>
        )}
      </div>
    </div>
  );
};

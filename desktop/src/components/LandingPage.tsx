import React, { useState, useEffect } from "react";
import {
  ArrowRight,
  CalendarCheck2,
  ChevronRight,
  Download,
  Laptop,
  Menu,
  MonitorSmartphone,
  ShieldCheck,
  Sparkles,
  UsersRound,
  X,
  Clock,
  IndianRupee,
  CheckCircle2,
  Zap,
} from "lucide-react";
import { SahayogLogo } from "./SahayogLogo";

interface LandingPageProps {
  onSignIn: () => void;
}

const WINDOWS_DOWNLOAD_URL = "https://github.com/sankiinikam/sahayog-hr/releases/download/latest/Sahayog.HR.Setup.1.0.0.exe";
const ANDROID_DOWNLOAD_URL = "https://github.com/sankiinikam/sahayog-hr/releases/download/latest/app-debug.apk";

export const LandingPage: React.FC<LandingPageProps> = ({ onSignIn }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"directory" | "attendance" | "payroll" | "leave">("directory");
  const [detectedPlatform, setDetectedPlatform] = useState<"android" | "windows" | "web">("web");

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    if (/android/i.test(ua)) {
      setDetectedPlatform("android");
    } else if (/windows|win32/i.test(ua)) {
      setDetectedPlatform("windows");
    }
  }, []);

  const goTo = (id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="landing-page modern-landing">
      {/* Dynamic Animated Ambient Glow Orbs */}
      <div className="landing-ambient-canvas">
        <div className="ambient-orb ambient-orb-1" />
        <div className="ambient-orb ambient-orb-2" />
        <div className="ambient-orb ambient-orb-3" />
      </div>

      <header className="landing-header glass-header">
        <div className="landing-nav-wrap">
          <button className="brand-button" onClick={() => goTo("home")} aria-label="Go to home">
            <SahayogLogo size="md" variant="horizontal" showSubtitle={false} />
          </button>

          <nav className={`landing-nav ${menuOpen ? "open" : ""}`} aria-label="Main navigation">
            <button onClick={() => goTo("features")}>Features</button>
            <button onClick={() => goTo("showcase")}>Live Showcase</button>
            <button onClick={() => goTo("download")}>Downloads</button>
            <button onClick={() => goTo("about")}>Why Sahayog</button>
            <button className="mobile-login" onClick={onSignIn}>Sign In</button>
          </nav>

          <div className="landing-nav-actions">
            <button className="text-button" onClick={onSignIn}>Sign In</button>
            <button className="nav-cta glow-cta" onClick={onSignIn}>
              Open Suite <ArrowRight size={15} />
            </button>
          </div>

          <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation">
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      <main id="home">
        {/* Hero Section */}
        <section className="landing-hero modern-hero">
          <div className="hero-copy">
            <div className="hero-pill-badge">
              <span className="live-pulse-dot" />
              <Sparkles size={13} className="sparkle-icon" />
              <span>Enterprise Workforce & Payroll Suite • 2026 Edition</span>
            </div>

            <h1 className="hero-headline">
              Work flows better when <br className="hero-break" />
              <span className="gradient-text">people come first.</span>
            </h1>

            <p className="hero-description">
              One unified, calm ecosystem for people operations, Indian statutory payroll,
              GPS shift attendance, and instant in-place updates across Windows and Android.
            </p>

            <div className="hero-actions">
              <button className="primary-cta pulse-button" onClick={onSignIn}>
                <span>Launch Sahayog HR</span>
                <ArrowRight size={18} />
              </button>
              <button className="secondary-cta" onClick={() => goTo("download")}>
                <span>Download Apps</span>
                <ChevronRight size={17} />
              </button>
            </div>

            {/* Quick Download Badges in Hero */}
            <div className="hero-device-strip" id="download">
              <a
                href={ANDROID_DOWNLOAD_URL}
                className={`device-pill-btn ${detectedPlatform === "android" ? "highlighted" : ""}`}
                title="Download Android APK"
              >
                <div className="device-icon-box android-icon">
                  <MonitorSmartphone size={18} />
                </div>
                <div className="device-info-text">
                  <strong>Download for Android</strong>
                  <small>Direct APK • v1.0 • 4.0 MB</small>
                </div>
                <Download size={15} className="device-arrow" />
              </a>

              <a
                href={WINDOWS_DOWNLOAD_URL}
                className={`device-pill-btn ${detectedPlatform === "windows" ? "highlighted" : ""}`}
                title="Download Windows Installer"
              >
                <div className="device-icon-box windows-icon">
                  <Laptop size={18} />
                </div>
                <div className="device-info-text">
                  <strong>Download for Windows</strong>
                  <small>64-bit Installer • v1.0 • 114 MB</small>
                </div>
                <Download size={15} className="device-arrow" />
              </a>
            </div>

            <div className="hero-reassurance">
              <span><CheckCircle2 size={14} color="#10b981" /> 100% Indian Statutory Compliant</span>
              <span><CheckCircle2 size={14} color="#10b981" /> Seamless In-Place Updates</span>
              <span><CheckCircle2 size={14} color="#10b981" /> Bank-grade AES-256 Cloud</span>
            </div>
          </div>

          {/* Interactive Live Dashboard Showcase */}
          <div className="hero-product-preview" id="showcase">
            <div className="dashboard-window modern-window">
              <div className="window-bar">
                <div className="window-dots">
                  <span className="dot dot-red" />
                  <span className="dot dot-amber" />
                  <span className="dot dot-green" />
                </div>
                <div className="window-title">
                  Sahayog HR &nbsp;•&nbsp; Enterprise Admin Console
                </div>
                <div className="window-status-pill">
                  <span className="mini-live-dot" /> Live
                </div>
              </div>

              {/* Showcase Tab Navigator */}
              <div className="showcase-nav-bar">
                <button
                  className={`showcase-tab ${activeTab === "directory" ? "active" : ""}`}
                  onClick={() => setActiveTab("directory")}
                >
                  <UsersRound size={14} />
                  <span>Workforce</span>
                </button>
                <button
                  className={`showcase-tab ${activeTab === "attendance" ? "active" : ""}`}
                  onClick={() => setActiveTab("attendance")}
                >
                  <Clock size={14} />
                  <span>Attendance</span>
                </button>
                <button
                  className={`showcase-tab ${activeTab === "payroll" ? "active" : ""}`}
                  onClick={() => setActiveTab("payroll")}
                >
                  <IndianRupee size={14} />
                  <span>Payroll</span>
                </button>
                <button
                  className={`showcase-tab ${activeTab === "leave" ? "active" : ""}`}
                  onClick={() => setActiveTab("leave")}
                >
                  <CalendarCheck2 size={14} />
                  <span>Leave</span>
                </button>
              </div>

              {/* Showcase Dynamic Screen Body */}
              <div className="showcase-body-content">
                {activeTab === "directory" && (
                  <div className="mock-view anim-fade-in">
                    <div className="mock-header">
                      <div>
                        <h4>Employee Directory</h4>
                        <p>124 Team Members • 118 Active • 6 Onboarding</p>
                      </div>
                      <span className="mock-badge-success">+ Add Employee</span>
                    </div>

                    <div className="mock-employee-list">
                      <div className="mock-employee-row">
                        <div className="mock-avatar">PS</div>
                        <div className="mock-emp-info">
                          <strong>Priya Shah</strong>
                          <small>Senior Software Engineer • Tech</small>
                        </div>
                        <span className="status-pill status-present">Present (09:04 AM)</span>
                        <div className="mock-salary-tag">₹85,000 / mo</div>
                      </div>

                      <div className="mock-employee-row">
                        <div className="mock-avatar avatar-orange">RN</div>
                        <div className="mock-emp-info">
                          <strong>Rahul Nikam</strong>
                          <small>Operations Lead • Logistics</small>
                        </div>
                        <span className="status-pill status-present">Present (08:52 AM)</span>
                        <div className="mock-salary-tag">₹62,000 / mo</div>
                      </div>

                      <div className="mock-employee-row">
                        <div className="mock-avatar avatar-purple">AK</div>
                        <div className="mock-emp-info">
                          <strong>Ananya Kulkarni</strong>
                          <small>Talent Acquisition • HR</small>
                        </div>
                        <span className="status-pill status-leave">On Leave (Paid)</span>
                        <div className="mock-salary-tag">₹58,000 / mo</div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "attendance" && (
                  <div className="mock-view anim-fade-in">
                    <div className="mock-header">
                      <div>
                        <h4>Real-Time Shift & GPS Attendance</h4>
                        <p>Shift: 08:00 AM – 08:00 PM • Standard 12h Cycle</p>
                      </div>
                      <span className="mock-badge-clock">⏱️ Geofence Active</span>
                    </div>

                    <div className="mock-att-grid">
                      <div className="mock-stat-card">
                        <span>Check-In Time</span>
                        <strong>08:02 AM</strong>
                        <small className="text-success">✓ On-Time Arrival</small>
                      </div>
                      <div className="mock-stat-card">
                        <span>Check-Out Time</span>
                        <strong>08:44 PM</strong>
                        <small className="text-primary">+44m Approved OT</small>
                      </div>
                      <div className="mock-stat-card highlight">
                        <span>Today's Total</span>
                        <strong>12h 42m</strong>
                        <small>Auto-calculated</small>
                      </div>
                    </div>

                    <div className="mock-progress-wrap">
                      <div className="mock-progress-bar">
                        <div className="mock-progress-fill" style={{ width: "94%" }} />
                      </div>
                      <span>Daily Shift Completion: 94%</span>
                    </div>
                  </div>
                )}

                {activeTab === "payroll" && (
                  <div className="mock-view anim-fade-in">
                    <div className="mock-header">
                      <div>
                        <h4>Indian Statutory Compensation Run</h4>
                        <p>Automated PF, ESI, Professional Tax & TDS Formulas</p>
                      </div>
                      <span className="mock-badge-success">✓ Published</span>
                    </div>

                    <div className="mock-payroll-breakdown">
                      <div className="breakdown-col">
                        <h6>Earnings</h6>
                        <div className="breakdown-item"><span>Basic Salary</span><strong>₹35,000</strong></div>
                        <div className="breakdown-item"><span>House Rent Allowance</span><strong>₹14,000</strong></div>
                        <div className="breakdown-item"><span>Special Allowance</span><strong>₹11,000</strong></div>
                      </div>
                      <div className="breakdown-col">
                        <h6>Statutory Deductions</h6>
                        <div className="breakdown-item"><span>Provident Fund (12%)</span><strong className="text-danger">- ₹4,200</strong></div>
                        <div className="breakdown-item"><span>ESI Contribution</span><strong className="text-danger">- ₹450</strong></div>
                        <div className="breakdown-item"><span>Professional Tax (PT)</span><strong className="text-danger">- ₹200</strong></div>
                      </div>
                    </div>

                    <div className="mock-net-salary-bar">
                      <span>Net Monthly Take-Home:</span>
                      <strong>₹55,150.00</strong>
                    </div>
                  </div>
                )}

                {activeTab === "leave" && (
                  <div className="mock-view anim-fade-in">
                    <div className="mock-header">
                      <div>
                        <h4>Leave Quotas & Time Off Balances</h4>
                        <p>Real-time concurrency-safe ledger calculation</p>
                      </div>
                      <span className="mock-badge-primary">Apply Leave</span>
                    </div>

                    <div className="mock-leave-grid">
                      <div className="mock-leave-card">
                        <span className="leave-badge-el">Earned Leave (EL)</span>
                        <strong>18 / 24</strong>
                        <small>Available Balance</small>
                      </div>
                      <div className="mock-leave-card">
                        <span className="leave-badge-cl">Casual Leave (CL)</span>
                        <strong>06 / 12</strong>
                        <small>Available Balance</small>
                      </div>
                      <div className="mock-leave-card">
                        <span className="leave-badge-sl">Sick Leave (SL)</span>
                        <strong>08 / 10</strong>
                        <small>Available Balance</small>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Floating Mobile Preview Companion */}
            <div className="floating-phone-card">
              <div className="phone-notch" />
              <div className="phone-card-body">
                <div className="phone-card-header">
                  <div>
                    <small>Today's Shift</small>
                    <h6>Priya Shah</h6>
                  </div>
                  <span className="phone-status-dot" />
                </div>
                <div className="phone-clock-action">
                  <span>08:02 AM</span>
                  <strong>Clocked In ✓</strong>
                </div>
                <div className="phone-stat-pill">
                  <span>Worked</span>
                  <b>8h 24m</b>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Highlights Grid */}
        <section className="feature-section" id="features">
          <div className="section-heading text-center">
            <span className="section-kicker">Unified Architecture</span>
            <h2>Built from the ground up for modern teams.</h2>
            <p>Every operational pillar engineered with speed, safety, and simplicity.</p>
          </div>

          <div className="modern-feature-grid">
            <div className="modern-feature-card">
              <div className="feature-icon-bubble bg-emerald">
                <UsersRound size={22} />
              </div>
              <h3>Workforce Records & KYC</h3>
              <p>Store employee profiles, encrypted bank details, PAN/Aadhaar verification, and employment lifecycle records.</p>
            </div>

            <div className="modern-feature-card">
              <div className="feature-icon-bubble bg-sky">
                <Clock size={22} />
              </div>
              <h3>Shift & Attendance Engine</h3>
              <p>Real-time punch logging with automatic worked minutes calculation, late grace tracking, and overtime computation.</p>
            </div>

            <div className="modern-feature-card">
              <div className="feature-icon-bubble bg-amber">
                <IndianRupee size={22} />
              </div>
              <h3>Indian Statutory Payroll</h3>
              <p>Automatic compliance calculation for Provident Fund (PF), ESI, Professional Tax (PT), and printable payslips.</p>
            </div>

            <div className="modern-feature-card">
              <div className="feature-icon-bubble bg-purple">
                <CalendarCheck2 size={22} />
              </div>
              <h3>Leave Ledger & Balances</h3>
              <p>Immutable ledger balances for Earned, Casual, and Sick Leave with concurrency-safe atomic approval workflows.</p>
            </div>

            <div className="modern-feature-card">
              <div className="feature-icon-bubble bg-indigo">
                <ShieldCheck size={22} />
              </div>
              <h3>Role-Based Security</h3>
              <p>Strict server-side isolation between Admin, HR managers, and staff with full audit logging on every action.</p>
            </div>

            <div className="modern-feature-card">
              <div className="feature-icon-bubble bg-rose">
                <Zap size={22} />
              </div>
              <h3>Instant In-Place Updates</h3>
              <p>Auto-updating desktop and mobile apps with zero data loss and persistent release keystore signing.</p>
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="modern-closing-section" id="about">
          <div className="closing-banner-card">
            <div className="closing-copy">
              <span className="closing-kicker">Start in Seconds</span>
              <h2>Ready to experience effortless people management?</h2>
              <p>Open Sahayog HR in your browser or download the dedicated apps for Windows and Android.</p>
            </div>

            <div className="closing-buttons">
              <button className="primary-cta glow-cta" onClick={onSignIn}>
                <span>Sign In to Sahayog HR</span>
                <ArrowRight size={18} />
              </button>
              <a href={ANDROID_DOWNLOAD_URL} className="secondary-cta">
                <Download size={16} />
                <span>Get Android APK</span>
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer modern-footer">
        <SahayogLogo size="sm" variant="horizontal" showSubtitle={false} />
        <span>© {new Date().getFullYear()} Sahayog HR • Enterprise Workforce Suite</span>
        <div className="footer-links">
          <a href="#features">Features</a>
          <a href="#download">Downloads</a>
          <button onClick={onSignIn}>Admin Login</button>
        </div>
      </footer>
    </div>
  );
};

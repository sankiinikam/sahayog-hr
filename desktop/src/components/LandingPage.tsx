import React, { useState } from "react";
import {
  ArrowRight,
  BarChart3,
  CalendarCheck2,
  Check,
  ChevronRight,
  Download,
  Laptop,
  Menu,
  MonitorSmartphone,
  ShieldCheck,
  Sparkles,
  UsersRound,
  X,
} from "lucide-react";
import { SahayogLogo } from "./SahayogLogo";

interface LandingPageProps {
  onSignIn: () => void;
}

const WINDOWS_DOWNLOAD_URL = "https://github.com/sankiinikam/sahayog-hr/releases/download/latest/Sahayog.HR.Setup.1.0.0.exe";
const ANDROID_DOWNLOAD_URL = "https://github.com/sankiinikam/sahayog-hr/releases/download/latest/app-debug.apk";

export const LandingPage: React.FC<LandingPageProps> = ({ onSignIn }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const goTo = (id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="landing-page">
      <header className="landing-header">
        <div className="landing-nav-wrap">
          <button className="brand-button" onClick={() => goTo("home")} aria-label="Go to home">
            <SahayogLogo size="md" variant="horizontal" showSubtitle={false} />
          </button>
          <nav className={`landing-nav ${menuOpen ? "open" : ""}`} aria-label="Main navigation">
            <button onClick={() => goTo("features")}>Features</button>
            <button onClick={() => goTo("platform")}>Platform</button>
            <button onClick={() => goTo("about")}>Why Sahayog</button>
            <button className="mobile-login" onClick={onSignIn}>Sign in</button>
          </nav>
          <div className="landing-nav-actions">
            <button className="text-button" onClick={onSignIn}>Sign in</button>
            <button className="nav-cta" onClick={onSignIn}>Get started <ArrowRight size={15} /></button>
          </div>
          <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation">
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      <main id="home">
        <section className="landing-hero">
          <div className="hero-orb orb-one" />
          <div className="hero-orb orb-two" />
          <div className="hero-copy">
            <div className="eyebrow"><Sparkles size={14} /> Built for people-first teams</div>
            <h1>Work flows better when <span>people come first.</span></h1>
            <p>One calm, capable home for your people, payroll, attendance, and everyday work — on desktop and mobile.</p>
            <div className="hero-actions">
              <button className="primary-cta" onClick={onSignIn}>Open Sahayog HR <ArrowRight size={18} /></button>
              <button className="secondary-cta" onClick={() => goTo("features")}>Explore features <ChevronRight size={17} /></button>
            </div>
            <div className="download-actions" aria-label="Download Sahayog HR">
              <a href={WINDOWS_DOWNLOAD_URL}><Laptop size={17} /><span><small>Desktop app</small>Download for Windows</span><Download size={16} /></a>
              <a href={ANDROID_DOWNLOAD_URL}><MonitorSmartphone size={17} /><span><small>Mobile app</small>Download for Android</span><Download size={16} /></a>
            </div>
            <div className="hero-reassurance"><Check size={15} /> Secure workspace <span /> <Check size={15} /> Ready for every team size</div>
          </div>

          <div className="hero-product" aria-label="Sahayog HR dashboard preview">
            <div className="dashboard-window">
              <div className="window-bar"><span /><span /><span /><div className="window-title">Sahayog HR &nbsp; / &nbsp; Overview</div></div>
              <div className="dashboard-body">
                <aside className="preview-sidebar"><div className="preview-mark">S</div><i /><i className="active" /><i /><i /><i /></aside>
                <div className="preview-main">
                  <div className="preview-greeting"><div><small>Tuesday, October 17</small><h3>Good morning, Priya</h3></div><div className="preview-avatar">PS</div></div>
                  <div className="preview-stats"><PreviewStat value="124" label="Team members" tone="blue" /><PreviewStat value="92%" label="Present today" tone="orange" /><PreviewStat value="08" label="On leave" tone="violet" /></div>
                  <div className="preview-grid"><div className="preview-card chart-card"><div className="card-line"><b>Attendance overview</b><small>This week</small></div><div className="bars"><em /><em /><em /><em /><em /><em /><em /></div><div className="chart-labels"><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span></div></div><div className="preview-card team-card"><div className="card-line"><b>Team activity</b><small>View all</small></div><div className="people-row"><u>AK</u><u>RM</u><u>SP</u><u>+8</u></div><p>12 teammates checked in</p></div></div>
                </div>
              </div>
            </div>
            <div className="phone-preview"><div className="phone-top" /><div className="phone-screen"><small>Good morning</small><b>Priya Shah</b><div className="phone-check"><span>09:12 AM</span><strong>Checked in <Check size={13} /></strong></div><div className="phone-mini"><span>Today</span><b>8h 24m</b></div><div className="phone-nav"><i /><i className="selected" /><i /><i /></div></div></div>
          </div>
        </section>

        <section className="trusted-strip"><p>Everything your team needs to stay in sync</p><div><span>People</span><span>Attendance</span><span>Payroll</span><span>Leave</span><span>Insights</span></div></section>

        <section className="feature-section" id="features">
          <div className="section-heading"><span className="section-kicker">One connected workspace</span><h2>Less admin. More momentum.</h2><p>Bring the essential parts of people operations together in a workspace that feels clear from day one.</p></div>
          <div className="feature-grid">
            <Feature icon={<UsersRound />} title="People, all in one place" text="Keep employee records, documents, and role details organised and easy to find." />
            <Feature icon={<CalendarCheck2 />} title="Time made simple" text="Give everyone a simple way to track attendance, shifts, and time away." />
            <Feature icon={<BarChart3 />} title="Clarity for every decision" text="Turn day-to-day activity into practical, easy-to-read workforce insights." />
            <Feature icon={<ShieldCheck />} title="Built on trust" text="Role-based access keeps the right information in the right hands." />
          </div>
        </section>

        <section className="platform-section" id="platform"><div className="platform-copy"><span className="section-kicker">Your work, wherever it happens</span><h2>At your desk.<br />In your hand.</h2><p>Sahayog HR gives your team a consistent, focused experience across Windows and Android — so the work doesn’t wait for the workplace.</p><button className="inline-link" onClick={onSignIn}>Start your workspace <ArrowRight size={16} /></button></div><div className="platform-points"><Point icon={<MonitorSmartphone size={22} />} title="Designed for every screen" text="A thoughtful desktop view and a touch-friendly mobile experience." /><Point icon={<ShieldCheck size={22} />} title="Always in your control" text="Manage your people data with confidence, from a single secure system." /><Point icon={<Sparkles size={22} />} title="Made for the everyday" text="Useful tools for the work your team does every day, not just once a quarter." /></div></section>

        <section className="closing-section" id="about"><div className="closing-card"><div><span className="section-kicker">Made for better workdays</span><h2>Your people are ready.<br />Let’s make work easier.</h2></div><button className="light-cta" onClick={onSignIn}>Sign in to Sahayog HR <ArrowRight size={18} /></button></div></section>
      </main>
      <footer className="landing-footer"><SahayogLogo size="sm" variant="horizontal" showSubtitle={false} /><span>© {new Date().getFullYear()} Sahayog HR</span><span>People working better, together.</span></footer>
    </div>
  );
};

const PreviewStat = ({ value, label, tone }: { value: string; label: string; tone: string }) => <div className={`preview-stat ${tone}`}><b>{value}</b><span>{label}</span></div>;
const Feature = ({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) => <article className="feature-card"><div className="feature-icon">{icon}</div><h3>{title}</h3><p>{text}</p></article>;
const Point = ({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) => <div className="platform-point"><div>{icon}</div><section><h3>{title}</h3><p>{text}</p></section></div>;

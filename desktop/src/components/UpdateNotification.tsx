import React, { useEffect, useState } from "react";
import { Download, Sparkles, X, ArrowRight, Smartphone, Monitor } from "lucide-react";

interface ReleaseInfo {
  tag_name: string;
  name: string;
  published_at: string;
  html_url: string;
  body: string;
  apkUrl?: string;
  exeUrl?: string;
}

// Current build timestamp - updated during development
const CURRENT_BUILD_TIME = "2026-10-19T18:00:00Z";
const GITHUB_REPO = "sankiinikam/sahayog-hr";

export const UpdateNotification: React.FC = () => {
  const [updateInfo, setUpdateInfo] = useState<ReleaseInfo | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        // Check if recently dismissed in this session
        const lastDismissed = localStorage.getItem("update_dismissed_until");
        if (lastDismissed && Date.now() < parseInt(lastDismissed, 10)) {
          return;
        }

        const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
          headers: { Accept: "application/vnd.github.v3+json" },
        });
        if (!res.ok) return;

        const data = await res.json();
        const publishedAt = data.published_at;

        // Check if the release is newer than the embedded build timestamp
        if (publishedAt && new Date(publishedAt).getTime() > new Date(CURRENT_BUILD_TIME).getTime()) {
          let apkUrl = `https://github.com/${GITHUB_REPO}/releases/download/latest/app-debug.apk`;
          let exeUrl = `https://github.com/${GITHUB_REPO}/releases/download/latest/Sahayog.HR.Setup.1.0.0.exe`;

          if (Array.isArray(data.assets)) {
            const apkAsset = data.assets.find((a: any) => a.name.endsWith(".apk"));
            if (apkAsset?.browser_download_url) apkUrl = apkAsset.browser_download_url;

            const exeAsset = data.assets.find((a: any) => a.name.endsWith(".exe"));
            if (exeAsset?.browser_download_url) exeUrl = exeAsset.browser_download_url;
          }

          setUpdateInfo({
            tag_name: data.tag_name || "latest",
            name: data.name || "Latest Update",
            published_at: publishedAt,
            html_url: data.html_url,
            body: data.body || "Bug fixes, keyboard improvements, and performance enhancements.",
            apkUrl,
            exeUrl,
          });
          setShowModal(true);
        }
      } catch {
        // Silent catch: network errors or offline mode should not disrupt user experience
      }
    };

    // Run check after a short 2-second delay to not block critical startup requests
    const timer = setTimeout(checkForUpdates, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setShowModal(false);
    // Dismiss for 12 hours
    const twelveHours = Date.now() + 12 * 60 * 60 * 1000;
    localStorage.setItem("update_dismissed_until", twelveHours.toString());
  };

  const handleDownload = (url: string) => {
    window.open(url, "_system");
  };

  if (!showModal || !updateInfo) return null;

  return (
    <div className="update-modal-backdrop" onClick={handleDismiss}>
      <div className="update-modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="update-close-btn" onClick={handleDismiss} title="Dismiss">
          <X size={18} />
        </button>

        <div className="update-badge-row">
          <span className="update-pill">
            <Sparkles size={13} className="sparkle-anim" /> New Version Ready
          </span>
          <span className="update-date">
            {new Date(updateInfo.published_at).toLocaleDateString()}
          </span>
        </div>

        <h3 className="update-title">Update Sahayog HR</h3>
        <p className="update-desc">
          A new release is available with mobile keyboard reflow fixes, in-place update support, and stability improvements.
        </p>

        <div className="update-actions">
          {updateInfo.apkUrl && (
            <button
              className="update-primary-btn"
              onClick={() => handleDownload(updateInfo.apkUrl!)}
            >
              <div className="update-btn-icon-wrap">
                <Smartphone size={18} />
              </div>
              <div className="update-btn-text">
                <strong>Update Android App (Direct Download)</strong>
                <small>Installs smoothly over your existing app • No uninstall needed</small>
              </div>
              <Download size={18} className="update-btn-arrow" />
            </button>
          )}

          {updateInfo.exeUrl && (
            <button
              className="update-secondary-btn"
              onClick={() => handleDownload(updateInfo.exeUrl!)}
            >
              <Monitor size={16} />
              <span>Download for Windows (.exe)</span>
              <ArrowRight size={14} />
            </button>
          )}
        </div>

        <div className="update-footer-actions">
          <button className="update-later-btn" onClick={handleDismiss}>
            Remind Me Later
          </button>
        </div>
      </div>
    </div>
  );
};

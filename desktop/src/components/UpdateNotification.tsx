import React, { useEffect, useState, useCallback } from "react";
import { Download, Sparkles, X, ArrowRight, Smartphone, Monitor, CheckCircle } from "lucide-react";

interface ReleaseInfo {
  tag_name: string;
  name: string;
  published_at: string;
  html_url: string;
  body: string;
  apkUrl?: string;
  exeUrl?: string;
}

// Build timestamp updated with every release
const CURRENT_BUILD_TIME = "2026-10-19T20:23:00Z";
const GITHUB_REPO = "sankiinikam/sahayog-hr";

export const UpdateNotification: React.FC = () => {
  const [updateInfo, setUpdateInfo] = useState<ReleaseInfo | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [upToDateToast, setUpToDateToast] = useState(false);

  // Platform detection
  const isElectron = Boolean(
    (window as any).desktopApi ||
    navigator.userAgent.toLowerCase().includes("electron")
  );
  const isAndroid = Boolean(
    (window as any).Capacitor?.isNativePlatform?.() ||
    /android/i.test(navigator.userAgent)
  );
  const isWindows = !isAndroid && (/windows|win32/i.test(navigator.userAgent) || isElectron);

  const checkForUpdates = useCallback(async (isManual: boolean = false) => {
    try {
      if (!isManual) {
        // Respect 4-hour dismiss cooldown only for automatic startup checks
        const lastDismissed = localStorage.getItem("update_dismissed_until");
        if (lastDismissed && Date.now() < parseInt(lastDismissed, 10)) {
          return;
        }
      }

      const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
        headers: { Accept: "application/vnd.github.v3+json" },
        cache: "no-store",
      });
      if (!res.ok) {
        if (isManual) {
          setUpToDateToast(true);
          setTimeout(() => setUpToDateToast(false), 3000);
        }
        return;
      }

      const data = await res.json();
      const publishedAt = data.published_at;

      let apkUrl = `https://github.com/${GITHUB_REPO}/releases/download/latest/app-debug.apk`;
      let exeUrl = `https://github.com/${GITHUB_REPO}/releases/download/latest/Sahayog.HR.Setup.1.0.0.exe`;

      if (Array.isArray(data.assets)) {
        const apkAsset = data.assets.find((a: any) => a.name.endsWith(".apk"));
        if (apkAsset?.browser_download_url) apkUrl = apkAsset.browser_download_url;

        const exeAsset = data.assets.find((a: any) => a.name.endsWith(".exe"));
        if (exeAsset?.browser_download_url) exeUrl = exeAsset.browser_download_url;
      }

      const info: ReleaseInfo = {
        tag_name: data.tag_name || "latest",
        name: data.name || "Latest Update",
        published_at: publishedAt || new Date().toISOString(),
        html_url: data.html_url,
        body: data.body || "New features, enhanced UI, smooth animations, and stability improvements.",
        apkUrl,
        exeUrl,
      };

      // Check if remote release is newer than current build, or if manually checked
      const isNewer = publishedAt && new Date(publishedAt).getTime() > new Date(CURRENT_BUILD_TIME).getTime();

      if (isNewer || isManual) {
        setUpdateInfo(info);
        setShowModal(true);
      } else if (isManual) {
        setUpToDateToast(true);
        setTimeout(() => setUpToDateToast(false), 3000);
      }
    } catch {
      if (isManual) {
        setUpToDateToast(true);
        setTimeout(() => setUpToDateToast(false), 3000);
      }
    }
  }, []);

  useEffect(() => {
    // Automatic background check on startup after 2 seconds
    const timer = setTimeout(() => checkForUpdates(false), 2000);

    // Listen for manual update trigger from header/settings
    const handleManualTrigger = () => checkForUpdates(true);
    window.addEventListener("sahayog:check-update", handleManualTrigger);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("sahayog:check-update", handleManualTrigger);
    };
  }, [checkForUpdates]);

  const handleDismiss = () => {
    setShowModal(false);
    // Dismiss for 4 hours
    const fourHours = Date.now() + 4 * 60 * 60 * 1000;
    localStorage.setItem("update_dismissed_until", fourHours.toString());
  };

  const handleDownload = (url: string) => {
    if ((window as any).desktopApi?.openExternal) {
      (window as any).desktopApi.openExternal(url);
    } else {
      window.open(url, "_system") || (window.location.href = url);
    }
  };

  return (
    <>
      {/* Toast when manually checked and already on latest build */}
      {upToDateToast && (
        <div className="update-toast">
          <CheckCircle size={18} className="toast-icon-success" />
          <span>You are using the latest version of Sahayog HR!</span>
        </div>
      )}

      {showModal && updateInfo && (
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

            <h3 className="update-title">
              {isElectron ? "Update Desktop Application" : isAndroid ? "Update Mobile Application" : "Update Sahayog HR"}
            </h3>
            <p className="update-desc">
              A newer build is ready with modern animated layouts, keyboard fixes, and enhanced people operations.
            </p>

            <div className="update-actions">
              {/* Prioritize Windows installer on Desktop/Windows */}
              {(isElectron || isWindows) && updateInfo.exeUrl && (
                <button
                  className="update-primary-btn desktop-highlight"
                  onClick={() => handleDownload(updateInfo.exeUrl!)}
                >
                  <div className="update-btn-icon-wrap">
                    <Monitor size={20} />
                  </div>
                  <div className="update-btn-text">
                    <strong>Update Windows Desktop App (.exe)</strong>
                    <small>Direct 1-click update • Closes & installs seamlessly</small>
                  </div>
                  <Download size={18} className="update-btn-arrow" />
                </button>
              )}

              {/* Prioritize Android APK on Mobile/Android */}
              {(isAndroid || !isElectron) && updateInfo.apkUrl && (
                <button
                  className={isAndroid ? "update-primary-btn" : "update-secondary-btn"}
                  onClick={() => handleDownload(updateInfo.apkUrl!)}
                >
                  <div className="update-btn-icon-wrap">
                    <Smartphone size={isAndroid ? 20 : 16} />
                  </div>
                  <div className="update-btn-text">
                    <strong>Update Android Mobile App (.apk)</strong>
                    <small>Direct in-place update • No uninstall needed</small>
                  </div>
                  <Download size={16} className="update-btn-arrow" />
                </button>
              )}

              {/* Secondary link for the other platform if on general Web */}
              {!isElectron && !isAndroid && updateInfo.exeUrl && (
                <button
                  className="update-secondary-btn"
                  onClick={() => handleDownload(updateInfo.exeUrl!)}
                >
                  <Monitor size={16} />
                  <span>Download Windows Installer (.exe)</span>
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
      )}
    </>
  );
};

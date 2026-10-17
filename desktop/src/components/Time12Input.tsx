import React, { useState, useEffect, useRef } from "react";
import { Clock } from "lucide-react";

interface Props {
  value: string; // e.g. "08:00 AM"
  onChange: (val: string) => void;
  label?: string;
  disabled?: boolean;
}

export const Time12Input: React.FC<Props> = ({ value, onChange, label, disabled = false }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse hour, minute, ampm from value
  const parseTime = (val: string) => {
    const match = val.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (match) {
      return {
        h: String(parseInt(match[1], 10)).padStart(2, "0"),
        m: match[2],
        ampm: match[3].toUpperCase() as "AM" | "PM",
      };
    }
    return { h: "08", m: "00", ampm: "AM" as const };
  };

  const current = parseTime(value || "08:00 AM");

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const update = (newH: string, newM: string, newAmPm: "AM" | "PM") => {
    onChange(`${newH}:${newM} ${newAmPm}`);
  };

  const hours = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
  const minutes = ["00", "15", "30", "45"];

  return (
    <div
      ref={containerRef}
      className="time12-container"
      onClick={(e) => e.stopPropagation()}
    >
      {label && <span className="time12-label">{label}</span>}
      <button
        type="button"
        className="time12-trigger"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
      >
        <Clock size={12} color="#64748b" />
        <span>{value || "08:00 AM"}</span>
      </button>

      {open && (
        <div className="time12-popover" onClick={(e) => e.stopPropagation()}>
          <div className="time12-grid">
            {/* Hours Column */}
            <div className="time12-col">
              <span className="time12-col-title">Hour</span>
              <div className="time12-options">
                {hours.map((h) => (
                  <button
                    key={h}
                    type="button"
                    className={`time12-opt ${current.h === h ? "selected" : ""}`}
                    onClick={() => update(h, current.m, current.ampm)}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>

            {/* Minutes Column */}
            <div className="time12-col">
              <span className="time12-col-title">Min</span>
              <div className="time12-options">
                {minutes.map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={`time12-opt ${current.m === m ? "selected" : ""}`}
                    onClick={() => update(current.h, m, current.ampm)}
                  >
                    {m}
                  </button>
                ))}
                {/* Custom minute input */}
                <input
                  type="number"
                  min={0}
                  max={59}
                  placeholder="mm"
                  className="time12-min-input"
                  value={current.m}
                  onChange={(e) => {
                    const num = parseInt(e.target.value, 10);
                    if (!isNaN(num) && num >= 0 && num <= 59) {
                      update(current.h, String(num).padStart(2, "0"), current.ampm);
                    }
                  }}
                />
              </div>
            </div>

            {/* AM / PM Column */}
            <div className="time12-col">
              <span className="time12-col-title">Period</span>
              <div className="time12-ampm-group">
                <button
                  type="button"
                  className={`time12-ampm-btn ${current.ampm === "AM" ? "selected" : ""}`}
                  onClick={() => update(current.h, current.m, "AM")}
                >
                  AM
                </button>
                <button
                  type="button"
                  className={`time12-ampm-btn ${current.ampm === "PM" ? "selected" : ""}`}
                  onClick={() => update(current.h, current.m, "PM")}
                >
                  PM
                </button>
              </div>

              <button
                type="button"
                className="btn btn-primary btn-xs"
                style={{ marginTop: 12, width: "100%" }}
                onClick={() => setOpen(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


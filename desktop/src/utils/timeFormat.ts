/**
 * Time utility functions for 12-hour AM/PM format and overtime calculation.
 */

export interface Time12 {
  hour: string;   // '01' - '12'
  minute: string; // '00' - '59'
  ampm: "AM" | "PM";
}

/**
 * Converts a 24-hour time string ("HH:MM" or "HH:MM:SS") to 12-hour string ("hh:mm AM/PM").
 */
export function to12Hour(time24: string | null | undefined): string {
  if (!time24) return "08:00 AM";
  const parts = time24.split(":");
  let h = parseInt(parts[0], 10);
  const m = parts[1] || "00";
  if (isNaN(h)) return "08:00 AM";

  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${String(h).padStart(2, "0")}:${m} ${ampm}`;
}

/**
 * Converts a 12-hour string ("hh:mm AM/PM") to 24-hour format ("HH:MM:00").
 */
export function to24Hour(time12: string | null | undefined): string {
  if (!time12) return "08:00:00";
  const match = time12.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return "08:00:00";

  let h = parseInt(match[1], 10);
  const m = match[2];
  const ampm = match[3].toUpperCase();

  if (ampm === "PM" && h < 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;

  return `${String(h).padStart(2, "0")}:${m}:00`;
}

/**
 * Calculates worked minutes and overtime based on:
 * - Predefined standard shift: 12 hours (720 minutes)
 * - Extra time calculated only if extra time exceeds 30 minutes.
 */
export function computeShiftAttendance(clockIn12: string, clockOut12: string) {
  const in24 = to24Hour(clockIn12);
  const out24 = to24Hour(clockOut12);

  const [inH, inM] = in24.split(":").map(Number);
  const [outH, outM] = out24.split(":").map(Number);

  const inMin = inH * 60 + inM;
  const outMin = outH * 60 + outM;

  let workedMinutes = outMin >= inMin ? outMin - inMin : (24 * 60 - inMin) + outMin;

  // Predefined shift = 12 hours = 720 minutes
  const standardShiftMin = 12 * 60; // 720
  const extraMinutes = workedMinutes - standardShiftMin;

  // Condition: If and only if extra time is above 30 min then calculated as overtime
  let overtimeMinutes = 0;
  if (extraMinutes > 30) {
    overtimeMinutes = extraMinutes;
  }

  const workedHours = (workedMinutes / 60).toFixed(1);
  const otH = Math.floor(overtimeMinutes / 60);
  const otM = overtimeMinutes % 60;
  const otText = overtimeMinutes > 0 ? `+${otH}h ${otM > 0 ? `${otM}m ` : ""}OT` : "";

  return {
    workedMinutes,
    workedHours,
    overtimeMinutes,
    otText,
    firstIn24: in24,
    lastOut24: out24,
  };
}

/**
 * Returns YYYY-MM-DD in local user timezone to ensure accurate day transitions at midnight.
 */
export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}



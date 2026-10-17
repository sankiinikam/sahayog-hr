/**
 * Formats API errors cleanly into human-readable strings,
 * avoiding raw [object Object] and unpacking DRF detail/errors dictionaries.
 */
export function formatApiError(e: any): string {
  const err = e?.response?.data;
  if (!err) return e?.message || "An unexpected error occurred";
  if (typeof err === "string") return err;

  // If DRF error has nested errors object
  if (err.errors && typeof err.errors === "object" && !Array.isArray(err.errors)) {
    const errorList: string[] = [];
    for (const [k, v] of Object.entries(err.errors)) {
      const valStr = Array.isArray(v) ? v.join(", ") : typeof v === "object" ? JSON.stringify(v) : String(v);
      errorList.push(`${k}: ${valStr}`);
    }
    if (errorList.length > 0) return errorList.join("; ");
  }

  // If DRF error has a top-level detail string
  if (err.detail && typeof err.detail === "string") {
    return err.detail;
  }

  // General object mapping (e.g. { work_email: ["Enter a valid email address."] })
  if (typeof err === "object") {
    const parts = Object.entries(err)
      .filter(([k]) => k !== "status_code" && k !== "code")
      .map(([k, v]) => {
        const valStr = Array.isArray(v) ? v.join(", ") : typeof v === "object" ? JSON.stringify(v) : String(v);
        return `${k}: ${valStr}`;
      });
    if (parts.length > 0) return parts.join("; ");
  }

  return String(err);
}


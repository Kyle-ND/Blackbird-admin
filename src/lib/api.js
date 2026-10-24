// Shared API client + South Africa time helpers for the admin dashboards.
//
// All API datetimes are ISO-8601 instants (UTC). Display them with
// timeZone: "Africa/Johannesburg" and build request times from a SAST date
// + time with an explicit +02:00 offset. Never strip or re-append offsets.

export const API_BASE = import.meta.env.VITE_API_BASE || "/proxy-api";
export const SAST = "Africa/Johannesburg";

export function getToken() {
  return localStorage.getItem("access_token");
}

export class ApiError extends Error {
  constructor(status, detail) {
    super(detail || `Request failed (${status})`);
    this.status = status;
    this.detail = detail;
  }
}

function detailFrom(body, status) {
  if (!body) return `Request failed (${status})`;
  if (typeof body.detail === "string") return body.detail;
  if (Array.isArray(body.detail)) return body.detail.map((d) => d.msg || JSON.stringify(d)).join(", ");
  return body.message || `Request failed (${status})`;
}

/**
 * api("/services/")                       -> GET
 * api("/services/", { method: "POST", body: {...} })
 * Throws ApiError with the server's `detail` so screens can show it.
 */
// In-flight request tracking for the global progress bar (see shared/ProgressBar.jsx)
let inflight = 0;
function track(delta) {
  inflight = Math.max(0, inflight + delta);
  window.dispatchEvent(new CustomEvent("bb:loading", { detail: { inflight } }));
}

export async function api(path, { method = "GET", body, headers = {}, auth = true } = {}) {
  track(1);
  try {
    return await request(path, { method, body, headers, auth });
  } finally {
    track(-1);
  }
}

async function request(path, { method, body, headers, auth }) {
  const init = { method, headers: { ...headers } };
  if (auth) {
    const token = getToken();
    if (token) init.headers.Authorization = `Bearer ${token}`;
  }
  if (body !== undefined) {
    init.headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, init);
  } catch (err) {
    throw new ApiError(0, "Network error – is the backend running?");
  }
  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { detail: text };
    }
  }
  if (res.status === 401 && auth) {
    localStorage.removeItem("access_token");
    window.dispatchEvent(new Event("bb:unauthorized"));
  }
  if (!res.ok) throw new ApiError(res.status, detailFrom(data, res.status));
  return data;
}

// ───────────────────────────── time helpers ─────────────────────────────

/** "2026-10-24" for a Date, evaluated in SAST. */
export function toSastDateKey(date = new Date()) {
  return new Date(date).toLocaleDateString("en-CA", { timeZone: SAST });
}

/** Date key for an API instant string. */
export function sastDateKeyOf(iso) {
  return toSastDateKey(new Date(iso));
}

/** "14:30" for an API instant. */
export function toSastTime(iso) {
  return new Date(iso).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: SAST });
}

/** Hour (0-23) in SAST for an API instant. */
export function sastHourOf(iso) {
  return parseInt(new Date(iso).toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: SAST }), 10) % 24;
}

/** Long date label ("Friday, 24 October 2026") for a date key or Date, in SAST. */
export function sastLongDate(dateOrKey) {
  const d = typeof dateOrKey === "string" ? new Date(`${dateOrKey}T12:00:00+02:00`) : dateOrKey;
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: SAST });
}

/**
 * Build the ISO instant for a SAST wall-clock date + time ("2026-10-24", "14:00").
 * SAST has no daylight saving, so the offset is always +02:00.
 */
export function sastToIso(dateKey, hhmm) {
  return new Date(`${dateKey}T${hhmm.length === 5 ? hhmm + ":00" : hhmm}+02:00`).toISOString();
}

/** Shift a date key by n days (calendar arithmetic, timezone-safe). */
export function shiftDateKey(dateKey, days) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

export function money(value) {
  const num = parseFloat(value);
  return Number.isNaN(num) ? "0.00" : num.toFixed(2);
}

/** Decode the JWT payload (no verification; the API verifies). */
export function tokenPayload(token = getToken()) {
  try {
    const base = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base));
  } catch {
    return null;
  }
}

export function isTokenExpired(token = getToken()) {
  const payload = tokenPayload(token);
  if (!payload || !payload.exp) return true;
  return payload.exp * 1000 < Date.now();
}


/** Download an authenticated file (CSV export) and save it with the server's filename. */
export async function download(path, fallbackName = "export.csv") {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) {
    let detail = `Download failed (${res.status})`;
    try { detail = (await res.json()).detail || detail; } catch { /* ignore */ }
    throw new ApiError(res.status, detail);
  }
  const blob = await res.blob();
  const name = /filename="([^"]+)"/.exec(res.headers.get("content-disposition") || "")?.[1] || fallbackName;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return name;
}

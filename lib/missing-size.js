/**
 * Missing-size research intake. Records a refused sidewall so we can
 * look up a manufacturer databook later. Never invents a pressure.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const MAX = {
  size: 80,
  loadIndex: 12,
  speedRating: 8,
  brand: 80,
  note: 1000,
  email: 120,
  reason: 200
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clip(value, max) {
  const text = String(value == null ? "" : value).replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.length > max ? text.slice(0, max) : text;
}

function sanitizeEmail(value) {
  const email = clip(value, MAX.email).toLowerCase();
  if (!email) return "";
  return EMAIL_RE.test(email) ? email : "";
}

function buildRecord(body) {
  const raw = body && typeof body === "object" ? body : {};
  if (clip(raw.website, 80)) {
    return { ok: true, ignored: true };
  }

  const size = clip(raw.size || raw.tyreSize || raw.sidewall, MAX.size);
  if (!size) {
    return { ok: false, error: "need-size", message: "Add the tyre size from the sidewall." };
  }

  const record = {
    receivedAt: new Date().toISOString(),
    size: size,
    loadIndex: clip(raw.loadIndex, MAX.loadIndex),
    speedRating: clip(raw.speedRating, MAX.speedRating).toUpperCase(),
    brand: clip(raw.brand || raw.brandModel, MAX.brand),
    note: clip(raw.note, MAX.note),
    email: sanitizeEmail(raw.email),
    reason: clip(raw.reason, MAX.reason),
    source: raw.auto === true || raw.source === "auto" ? "auto" : "form"
  };

  return { ok: true, record: record };
}

function sidewallLine(record) {
  if (!record) return "";
  const parts = [record.size];
  if (record.loadIndex) parts.push("LI " + record.loadIndex);
  if (record.speedRating) parts.push(record.speedRating);
  if (record.brand) parts.push(record.brand);
  return parts.join(" ");
}

function formatMailtoBody(record) {
  const lines = [
    "Missing tyre size (research only — do not invent a pressure).",
    "",
    "Tyre size: " + (record.size || ""),
    "Load index: " + (record.loadIndex || "(not given)"),
    "Speed rating: " + (record.speedRating || "(not given)"),
    "Brand / model: " + (record.brand || "(not given)"),
    "Sidewall line: " + sidewallLine(record),
    "Note: " + (record.note || "(none)"),
    "Reply email: " + (record.email || "(not given)"),
    "Refuse reason: " + (record.reason || "(not given)"),
    "",
    "We only add sizes from manufacturer databooks."
  ];
  return lines.join("\n");
}

function mailtoHref(record, to) {
  const subject = "Missing tyre size: " + (record && record.size ? record.size : "unknown");
  const body = formatMailtoBody(record || {});
  const addr = clip(to, 120);
  return "mailto:" + addr +
    "?subject=" + encodeURIComponent(subject) +
    "&body=" + encodeURIComponent(body);
}

function notifyEmail() {
  return clip(process.env.MISSING_SIZE_NOTIFY_EMAIL, 120);
}

function logPath() {
  const configured = clip(process.env.MISSING_SIZE_LOG_PATH, 240);
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") return "";
  return path.join(__dirname, "..", "data", "missing-sizes.jsonl");
}

function persistRecord(record, deps) {
  const log = (deps && deps.log) || console.log;
  const line = JSON.stringify(record);
  log("[missing-size] " + line);

  const dest = (deps && deps.logPath !== undefined) ? deps.logPath : logPath();
  if (!dest) return { logged: true, saved: false };

  const writeFile = (deps && deps.writeFile) || fs.writeFileSync;
  const mkdir = (deps && deps.mkdir) || fs.mkdirSync;
  mkdir(path.dirname(dest), { recursive: true });
  writeFile(dest, line + "\n", { flag: "a" });
  return { logged: true, saved: true, path: dest };
}

const buckets = new Map();

function allowSubmit(key, nowMs) {
  const now = nowMs || Date.now();
  const windowMs = 10 * 60 * 1000;
  const max = 30;
  const stamp = key || "anon";
  const list = (buckets.get(stamp) || []).filter(function (t) { return now - t < windowMs; });
  if (list.length >= max) return false;
  list.push(now);
  buckets.set(stamp, list);
  return true;
}

function resetRateLimit() {
  buckets.clear();
}

module.exports = {
  MAX: MAX,
  buildRecord: buildRecord,
  sidewallLine: sidewallLine,
  formatMailtoBody: formatMailtoBody,
  mailtoHref: mailtoHref,
  notifyEmail: notifyEmail,
  logPath: logPath,
  persistRecord: persistRecord,
  allowSubmit: allowSubmit,
  resetRateLimit: resetRateLimit
};

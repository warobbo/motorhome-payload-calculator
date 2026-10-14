/**
 * Two routes on one Worker.
 * Any path except /api/vehicle-lookup is the missing-tyre-size capture.
 * GET on that capture returns {"ok":true,"capture":true}.
 * A filled honeypot is ignored. Notify runs only when MISSING_SIZE_NOTIFY_URL
 * is set; otherwise the note is a log line and nothing else.
 *
 * /api/vehicle-lookup is the DVLA lookup. The key is the Worker secret
 * DVLA_API_KEY (optional MOT_API_KEY). Neither value is written here.
 */
// Static imports so the Worker bundle includes these modules. A runtime
// require leaves the file off the upload, and the isolate has no repo disk.
import catalogue from "../../lib/van-catalogue.js";
import lookup from "../../lib/vehicle-lookup.js";
import missing from "../../lib/missing-size.js";

if (!catalogue || typeof catalogue.matchCatalogue !== "function") {
  throw new Error("van catalogue missing from worker bundle");
}
if (!lookup || typeof lookup.lookupVehicle !== "function") {
  throw new Error("vehicle lookup missing from worker bundle");
}

const MAX_BODY = 8192;

function cors(response) {
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  headers.set("Cache-Control", "no-store");
  return new Response(response.body, {
    status: response.status,
    headers: headers
  });
}

function json(status, body) {
  return cors(new Response(JSON.stringify(body), {
    status: status,
    headers: { "Content-Type": "application/json; charset=utf-8" }
  }));
}

function clientKey(request) {
  const cloudflare = String(request.headers.get("cf-connecting-ip") || "").trim();
  if (cloudflare) return cloudflare.slice(0, 64);
  const forwarded = String(request.headers.get("x-forwarded-for") || "").split(",")[0].trim();
  return (forwarded || "anon").slice(0, 64);
}

async function readBody(request) {
  if (!request.body) return { body: {} };
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  while (true) {
    const step = await reader.read();
    if (step.done) break;
    size += step.value.byteLength;
    if (size > MAX_BODY) {
      try { await reader.cancel(); } catch (err) { /* already closed */ }
      return { tooLarge: true };
    }
    chunks.push(step.value);
  }
  const all = new Uint8Array(size);
  let offset = 0;
  for (let i = 0; i < chunks.length; i += 1) {
    all.set(chunks[i], offset);
    offset += chunks[i].byteLength;
  }
  const raw = new TextDecoder().decode(all);
  if (!raw) return { body: {} };
  try {
    return { body: JSON.parse(raw) };
  } catch (err) {
    return { invalidJson: true };
  }
}

function notifyUrl(env) {
  const url = String((env && env.MISSING_SIZE_NOTIFY_URL) || "").trim();
  return /^https?:\/\//i.test(url) ? url : "";
}

async function notifyRecord(env, record) {
  const url = notifyUrl(env);
  if (!url) return;
  const email = String((env && env.MISSING_SIZE_NOTIFY_EMAIL) || "").trim();
  const payload = {
    text: missing.formatMailtoBody(record),
    record: record
  };
  if (email) payload.notifyEmail = email;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) console.log("[missing-size] notify failed");
  } catch (err) {
    console.log("[missing-size] notify failed");
  }
}

export async function handleMissingSize(request, env, ctx) {
  const method = request.method || "GET";
  if (method === "OPTIONS") {
    return cors(new Response(null, { status: 204 }));
  }

  let parsed = { body: {} };
  if (method === "POST") parsed = await readBody(request);

  if (method !== "GET" && method !== "POST") {
    return json(405, { ok: false, error: "method", message: "Use POST to send a missing size." });
  }

  if (method === "POST" && !missing.allowSubmit(clientKey(request))) {
    return json(429, { ok: false, error: "rate", message: "Please wait before sending another size." });
  }

  if (method === "GET") {
    return json(200, { ok: true, capture: true });
  }

  if (parsed.tooLarge) {
    return json(413, { ok: false, error: "too_large", message: "That note is too long." });
  }
  if (parsed.invalidJson) {
    return json(400, { ok: false, error: "invalid_json", message: "Invalid JSON body." });
  }

  const built = missing.buildRecord(parsed.body);
  if (!built.ok) {
    return json(400, { ok: false, error: built.error, message: built.message });
  }
  if (built.ignored) {
    return json(200, { ok: true, ignored: true });
  }

  console.log("[missing-size] " + JSON.stringify(built.record));
  if (notifyUrl(env)) {
    const job = notifyRecord(env, built.record);
    if (ctx && typeof ctx.waitUntil === "function") ctx.waitUntil(job);
    else await job;
  }

  return json(200, { ok: true, saved: true });
}

export const LOOKUP_ORIGIN = "https://motorhomepayload.co.uk";
export const LOOKUP_RATE_MAX = 30;
export const LOOKUP_WINDOW_MS = 10 * 60 * 1000;
export const LOOKUP_BUCKET_CAP = 512;
const lookupBuckets = new Map();

export function resetVehicleLookupRateLimit() {
  lookupBuckets.clear();
}

export function vehicleLookupBucketCount() {
  return lookupBuckets.size;
}

function pruneLookupBuckets(now) {
  for (const [id, times] of lookupBuckets) {
    let keep = 0;
    for (let i = 0; i < times.length; i += 1) {
      if (now - times[i] < LOOKUP_WINDOW_MS) {
        times[keep] = times[i];
        keep += 1;
      }
    }
    if (keep === 0) lookupBuckets.delete(id);
    else times.length = keep;
  }
}

export function allowVehicleLookup(key, nowMs) {
  const now = nowMs || Date.now();
  const stamp = String(key || "anon").slice(0, 64);
  pruneLookupBuckets(now);
  let list = lookupBuckets.get(stamp);
  if (!list) {
    while (lookupBuckets.size >= LOOKUP_BUCKET_CAP) {
      const oldest = lookupBuckets.keys().next().value;
      lookupBuckets.delete(oldest);
    }
    list = [];
  }
  if (list.length >= LOOKUP_RATE_MAX) {
    lookupBuckets.delete(stamp);
    lookupBuckets.set(stamp, list);
    return false;
  }
  list.push(now);
  lookupBuckets.delete(stamp);
  lookupBuckets.set(stamp, list);
  return true;
}

function lookupOrigin(request) {
  return String(request.headers.get("Origin") || "");
}

function lookupCorsHeaders(request) {
  const headers = new Headers();
  if (lookupOrigin(request) === LOOKUP_ORIGIN) {
    headers.set("Access-Control-Allow-Origin", LOOKUP_ORIGIN);
    headers.set("Vary", "Origin");
    headers.set("Access-Control-Allow-Headers", "Content-Type, x-api-key, x-mot-api-key");
    headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  }
  return headers;
}

function lookupJson(request, status, body) {
  const headers = lookupCorsHeaders(request);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  console.log(JSON.stringify({
    message: "vehicle-lookup",
    httpStatus: status,
    ok: !!(body && body.ok),
    error: (body && body.error) || ""
  }));
  return new Response(JSON.stringify(body), { status: status, headers: headers });
}

function originBlocked(request) {
  const origin = lookupOrigin(request);
  return origin !== "" && origin !== LOOKUP_ORIGIN;
}

function secretValue(env, name) {
  const value = env && env[name];
  return typeof value === "string" ? value.trim() : "";
}

function lookupPath(request) {
  const url = new URL(request.url);
  let path = url.pathname || "/";
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  return path;
}

export function isVehicleLookupRequest(request) {
  try {
    return lookupPath(request) === "/api/vehicle-lookup";
  } catch (err) {
    return false;
  }
}

export async function handleVehicleLookup(request, env) {
  const method = request.method || "GET";
  if (method === "OPTIONS") {
    if (originBlocked(request)) return new Response(null, { status: 403 });
    const headers = lookupCorsHeaders(request);
    headers.set("Cache-Control", "no-store");
    return new Response(null, { status: 204, headers: headers });
  }

  if (originBlocked(request)) {
    return lookupJson(request, 403, {
      ok: false,
      error: "origin",
      message: "Lookup is only available from the public site."
    });
  }

  let vrm = "";
  let make = "";
  let model = "";
  let year = "";
  let apiKey = request.headers.get("x-api-key") || "";
  let motApiKey = request.headers.get("x-mot-api-key") || "";

  if (method === "GET") {
    const url = new URL(request.url);
    vrm = url.searchParams.get("vrm") || "";
    make = url.searchParams.get("make") || "";
    model = url.searchParams.get("model") || "";
    year = url.searchParams.get("year") || "";
  } else if (method === "POST") {
    const parsed = await readBody(request);
    if (parsed.tooLarge) {
      return lookupJson(request, 413, {
        ok: false,
        error: "too_large",
        message: "That lookup is too long."
      });
    }
    if (parsed.invalidJson) {
      return lookupJson(request, 400, {
        ok: false,
        error: "invalid_json",
        message: "Invalid JSON body."
      });
    }
    const body = parsed.body && typeof parsed.body === "object" ? parsed.body : {};
    vrm = body.registrationNumber || body.vrm || "";
    make = body.make || "";
    model = body.model || "";
    year = body.year || body.yearOfManufacture || "";
    apiKey = body.apiKey || apiKey;
    motApiKey = body.motApiKey || motApiKey;
  } else {
    return lookupJson(request, 405, {
      ok: false,
      error: "method",
      message: "Use GET or POST."
    });
  }

  const bareHealth = method === "GET" && !vrm && !make && !model;
  if (!bareHealth && !allowVehicleLookup(clientKey(request))) {
    return lookupJson(request, 429, {
      ok: false,
      error: "rate",
      message: "Please wait before looking up another vehicle."
    });
  }

  if (!vrm && !make && !model) {
    if (method === "GET") {
      return lookupJson(request, 200, lookup.lookupHealth({
        liveDvla: !!secretValue(env, "DVLA_API_KEY")
      }));
    }
    return lookupJson(request, 400, {
      ok: false,
      error: "missing_query",
      message: "Enter a UK registration, or make, model and year."
    });
  }

  try {
    const key = String(apiKey || "").trim() || secretValue(env, "DVLA_API_KEY");
    const mot = String(motApiKey || "").trim() || secretValue(env, "MOT_API_KEY");
    const result = vrm
      ? await lookup.lookupVehicle({ vrm: vrm, apiKey: key, motApiKey: mot })
      : await lookup.lookupByMakeModelYear({ make: make, model: model, year: year });
    return lookupJson(request, result.status || (result.ok ? 200 : 400), result);
  } catch (err) {
    return lookupJson(request, 500, {
      ok: false,
      error: "server_error",
      message: "Lookup failed unexpectedly."
    });
  }
}

export default {
  fetch: function (request, env, ctx) {
    if (isVehicleLookupRequest(request)) return handleVehicleLookup(request, env);
    return handleMissingSize(request, env, ctx);
  }
};

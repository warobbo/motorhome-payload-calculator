/**
 * POST/GET missing-tyre-size capture.
 * GET returns {"ok":true,"capture":true}.
 * A filled honeypot is ignored. Notify runs only when MISSING_SIZE_NOTIFY_URL
 * is set; otherwise the note is a log line and nothing else.
 */
// Static import so the Worker bundle includes this module. A runtime
// require leaves the file off the upload, and the isolate has no repo disk.
import missing from "../../lib/missing-size.js";

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

export default {
  fetch: handleMissingSize
};

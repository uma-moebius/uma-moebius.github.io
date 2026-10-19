// Contact form endpoint. Everything else is served from the static assets.
// Secrets (set in the Cloudflare dashboard or with `wrangler secret put`):
//   TURNSTILE_SECRET  Turnstile secret key
//   CONTACT_TO        verified Email Routing destination address
// Optional: CONTACT_FROM (defaults to hello@yumatanemura.com).

const LIMITS = { name: 100, email: 254, message: 5000 };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const MAX_BODY = 20000;
const HOSTNAMES = ["yumatanemura.com", "www.yumatanemura.com"];
// Same headers as _headers, for responses the Worker builds itself.
const SECURITY_HEADERS = {
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "DENY",
  "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
  "Cache-Control": "no-store",
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/contact") return secure(await contact(request, env, url));
    return env.ASSETS.fetch(request);
  },
};

async function contact(request, env, url) {
  const wantsJson = (request.headers.get("Accept") || "").includes("application/json");
  const fail = (status, error) =>
    wantsJson
      ? Response.json({ ok: false, error }, { status })
      : new Response(error + "\n", { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });

  if (request.method !== "POST") return fail(405, "Method not allowed.");

  const origin = request.headers.get("Origin");
  if (!origin || origin !== url.origin) return fail(403, "Forbidden.");

  if (Number(request.headers.get("Content-Length") || 0) > MAX_BODY) return fail(413, "Message is too long.");
  const body = await readCapped(request, MAX_BODY);
  if (body === null) return fail(413, "Message is too long.");

  let form;
  try {
    form = await new Response(body, {
      headers: { "Content-Type": request.headers.get("Content-Type") || "" },
    }).formData();
  } catch {
    return fail(400, "Invalid form data.");
  }

  const field = (k) => String(form.get(k) || "").trim();
  // Honeypot: real visitors never fill this in. Pretend success.
  if (field("company")) return done(wantsJson, url);

  const name = field("name");
  const email = field("email");
  const message = field("message");
  if (!name || !email || !message) return fail(400, "Please fill in every field.");
  if (name.length > LIMITS.name || email.length > LIMITS.email || message.length > LIMITS.message)
    return fail(400, "One of the fields is too long.");
  if (!EMAIL_RE.test(email) || /[\r\n]/.test(name + email)) return fail(400, "Please enter a valid email address.");

  if (!env.TURNSTILE_SECRET || !env.CONTACT_TO) return fail(503, "The form is not ready yet.");

  const token = field("cf-turnstile-response");
  if (!token || token.length > 2048) return fail(400, "Please complete the check and try again.");
  let verdict;
  try {
    const r = await fetch(SITEVERIFY, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: env.TURNSTILE_SECRET,
        response: token,
        remoteip: request.headers.get("CF-Connecting-IP") || undefined,
      }),
    });
    verdict = await r.json();
  } catch {
    return fail(502, "Could not verify the check. Please try again.");
  }
  if (!verdict || verdict.success !== true) return fail(400, "Please complete the check and try again.");
  // Optional TURNSTILE_HOSTNAMES (comma-separated) overrides the list, e.g. for local testing.
  const hosts = env.TURNSTILE_HOSTNAMES ? env.TURNSTILE_HOSTNAMES.split(",").map((h) => h.trim()) : HOSTNAMES;
  if (!hosts.includes(verdict.hostname)) return fail(400, "Please complete the check and try again.");

  try {
    await env.EMAIL.send({
      from: { email: env.CONTACT_FROM || "hello@yumatanemura.com", name: "yumatanemura.com" },
      to: env.CONTACT_TO,
      replyTo: { email, name },
      subject: "Contact: " + name.slice(0, 80),
      text: "Name: " + name + "\nEmail: " + email + "\n\n" + message + "\n",
    });
  } catch (e) {
    console.error("send failed", e && e.message);
    return fail(502, "Could not send. Please try again.");
  }

  return done(wantsJson, url);
}

function done(wantsJson, url) {
  return wantsJson
    ? Response.json({ ok: true })
    : Response.redirect(new URL("/thank-you/", url).toString(), 303);
}

// Reads the request body, giving up once it passes `max` bytes. Returns null when too large.
async function readCapped(request, max) {
  if (!request.body) return new Uint8Array(0);
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const out = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.byteLength;
  }
  return out;
}

function secure(response) {
  const r = new Response(response.body, response);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) r.headers.set(k, v);
  return r;
}

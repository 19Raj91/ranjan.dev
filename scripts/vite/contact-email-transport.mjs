import { randomBytes, timingSafeEqual } from 'node:crypto';

const virtualId = 'virtual:portfolio-contact-email';
const resolvedId = '\0' + virtualId;
const endpoint = '/__portfolio_internal/contact-email';
const recipient = 'rggupta714@gmail.com';
const MAX_BODY_BYTES = 65536;

function equalToken(value, expected) {
  if (typeof value !== 'string') return false;
  const actual = Buffer.from(value);
  const secret = Buffer.from(expected);
  return actual.length === secret.length && timingSafeEqual(actual, secret);
}
function reply(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}
// Node-only handler used by the development server; never bundled into the Worker.
export function createContactEmailHandler({ token, fetcher = globalThis.fetch.bind(globalThis) }) {
  return async function contactEmailHandler(req, res) {
    const peer = req.socket?.remoteAddress;
    if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(peer) || req.headers.origin || !equalToken(req.headers['x-portfolio-email-bridge'], token)) {
      req.resume(); return reply(res, 403, {name:'local_email_bridge_forbidden'});
    }
    if (req.method !== 'POST') { req.resume(); return reply(res, 405, {name:'method_not_allowed'}); }
    if (!/^Bearer [^\s]+$/.test(req.headers.authorization || '') || !/^portfolio-contact\/[a-zA-Z0-9-]{1,100}$/.test(req.headers['idempotency-key'] || '')) {
      req.resume(); return reply(res, 400, {name:'invalid_email_bridge_request'});
    }
    try {
      let size = 0;
      const chunks = [];
      for await (const chunk of req) {
        size += chunk.length;
        if (size > MAX_BODY_BYTES) { req.resume(); return reply(res, 413, {name:'payload_too_large'}); }
        chunks.push(chunk);
      }
      const body = Buffer.concat(chunks).toString('utf8');
      let email;
      try { email = JSON.parse(body); } catch { return reply(res, 400, {name:'invalid_json'}); }
      if (!email || !Array.isArray(email.to) || email.to.length !== 1 || email.to[0] !== recipient || email.cc || email.bcc || email.attachments) {
        return reply(res, 400, {name:'invalid_email_recipient'});
      }
      // The destination is fixed, and Node's normal HTTPS certificate checks stay enabled.
      const upstream = await fetcher('https://api.resend.com/emails', {
        method: 'POST', redirect: 'error',
        headers: { 'Content-Type':'application/json', Authorization:req.headers.authorization, 'Idempotency-Key':req.headers['idempotency-key'] },
        body, signal:AbortSignal.timeout(5000),
      });
      res.statusCode = upstream.status;
      res.setHeader('Cache-Control','no-store');
      res.setHeader('Content-Type','application/json');
      const retryAfter = upstream.headers.get('Retry-After');
      if (retryAfter) res.setHeader('Retry-After',retryAfter);
      res.end(await upstream.text());
    } catch {
      // No request headers, payloads, or credentials are logged or returned.
      if (!res.headersSent) reply(res, 502, {name:'local_email_bridge_upstream_error'});
      else res.end();
    }
  };
}

export function contactEmailTransport() {
  let development = false;
  let server;
  const token = randomBytes(32).toString('hex');
  return {
    name:'portfolio-contact-email-transport',
    enforce: /** @type {'pre'} */ ('pre'),
    configResolved(config) { development = config.command === 'serve'; },
    resolveId(id) { if (id === virtualId) return resolvedId; },
    load(id, options) {
      if (id !== resolvedId) return;
      if (this.environment?.name === 'client' || (!this.environment && !options?.ssr)) throw new Error('Contact email transport is server-only.');
      if (!development) return 'export default undefined;';
      if (!server) throw new Error('Contact email development server is not ready.');
      // Same loopback pattern as the starter's existing connector preview bridge.
      const url = `http://127.0.0.1:${server.config.server.port}${endpoint}`;
      return `export default async function localEmailFetch(_url, init) {
        const headers = new Headers(init.headers);
        headers.set('X-Portfolio-Email-Bridge', ${JSON.stringify(token)});
        return globalThis.fetch(${JSON.stringify(url)}, { ...init, headers });
      }`;
    },
    configureServer(vite) {
      server = vite;
      vite.middlewares.use(endpoint,createContactEmailHandler({token}));
    },
  };
}

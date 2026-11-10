// Server-side module. Never import this file from a client component.
export const CONTACT_NOTIFICATION_RECIPIENT = 'rggupta714@gmail.com';
export type ContactEmailConfig = { RESEND_API_KEY?: string; CONTACT_EMAIL_FROM?: string };
export type ContactEmailInquiry = {
  id: string; name: string; email: string; projectType: string;
  budget: string; message: string; createdAt: number;
};
export function hasContactEmailConfig(config: ContactEmailConfig) {
  return Boolean(config.RESEND_API_KEY?.trim() && config.CONTACT_EMAIL_FROM?.trim());
}
function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
}
export function buildContactEmail(inquiry: ContactEmailInquiry, from: string) {
  const fields = [
    ['Name', inquiry.name], ['Email', inquiry.email], ['Project type', inquiry.projectType],
    ['Budget', inquiry.budget], ['Message', inquiry.message], ['Reference', inquiry.id],
    ['Submitted at (UTC)', new Date(inquiry.createdAt).toISOString()],
  ];
  return {
    from,
    to: [CONTACT_NOTIFICATION_RECIPIENT],
    reply_to: inquiry.email,
    subject: `New portfolio inquiry — ${inquiry.id.slice(0,8)}`,
    text: 'New portfolio contact form submission\n\n' + fields.map(([label,value]) => `${label}:\n${value}`).join('\n\n'),
    html: `<h1>New portfolio inquiry</h1><table role="presentation" style="border-collapse:collapse;width:100%;max-width:640px">${fields.map(([label,value]) => `<tr><th scope="row" style="text-align:left;vertical-align:top;padding:12px;border:1px solid #ddd">${escapeHtml(label)}</th><td style="padding:12px;border:1px solid #ddd;white-space:pre-wrap;overflow-wrap:anywhere">${escapeHtml(value)}</td></tr>`).join('')}</table>`,
  };
}
export class ContactEmailError extends Error {
  readonly retryable: boolean;
  readonly retryAfterMs: number;
  constructor(message: string, retryable = false, retryAfterMs = 0) {
    super(message); this.name = 'ContactEmailError'; this.retryable = retryable; this.retryAfterMs = retryAfterMs;
  }
}
function describeRuntimeFailure(error: unknown, apiKey: string): string {
  if (!error || typeof error !== 'object') return '[Unknown runtime error]';
  const detail = error as { name?: unknown; message?: unknown; cause?: { code?: unknown; message?: unknown } };
  const values = [detail.name, detail.message, detail.cause?.code, detail.cause?.message];
  const description = values.filter((value): value is string => typeof value === 'string')
    .join(': ').replaceAll(apiKey, '[REDACTED]').replace(/[\r\n\x00-\x1f]/g, ' ').slice(0, 400);
  return `[${description || 'Unknown runtime error'}]`;
}
export async function sendContactNotification(
  inquiry: ContactEmailInquiry,
  config: ContactEmailConfig,
  options: { fetcher?: typeof fetch; wait?: (ms: number) => Promise<void> } = {},
): Promise<string> {
  const apiKey = config.RESEND_API_KEY?.trim();
  const from = config.CONTACT_EMAIL_FROM?.trim();
  if (!apiKey || !from || /[\r\n]/.test(from) || /\s/.test(apiKey)) throw new ContactEmailError('Email service is not configured.');
  // Bind the native function to its runtime global for Worker/Node compatibility.
  const fetcher = options.fetcher ?? globalThis.fetch.bind(globalThis);
  const wait = options.wait ?? (ms => new Promise(resolve => setTimeout(resolve, ms)));
  const payload = JSON.stringify(buildContactEmail(inquiry, from));
  for (let attempt = 0; attempt < 3; attempt++) {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      // Use a controller created in the same runtime as fetch, rather than
      // depending on AbortSignal.timeout being implemented by the dev runtime.
      const controller = new AbortController();
      timeout = setTimeout(() => controller.abort(), 5000);
      const response = await fetcher('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}`, 'Idempotency-Key': `portfolio-contact/${inquiry.id}` },
        body: payload,
        signal: controller.signal,
      });
      let data: { id?: unknown; name?: unknown };
      try { data = await response.json(); }
      catch { throw new ContactEmailError('Email provider returned an invalid response.', response.status >= 500 || response.ok); }
      if (response.ok && typeof data?.id === 'string' && data.id.length > 0) return data.id;
      const retryable = response.status === 429 || response.status === 408 || response.status >= 500 || (response.status === 409 && data?.name === 'concurrent_idempotent_requests');
      const retryAfter = Number(response.headers.get('Retry-After'));
      // Do not retry earlier than requested. Long rate-limit waits are left for a later submission retry.
      const retryAfterMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 0;
      throw new ContactEmailError(`Email provider rejected the notification (HTTP ${response.status}).`, retryable, retryAfterMs);
    } catch (error) {
      if (timeout !== undefined) clearTimeout(timeout);
      // Preserve the actual runtime failure in the server log. The public route
      // keeps its existing generic error, and credentials are redacted here.
      const failure = error instanceof ContactEmailError ? error : new ContactEmailError(
        `Email provider could not be reached. ${describeRuntimeFailure(error, apiKey)}`, true,
      );
      if (!failure.retryable || attempt === 2 || failure.retryAfterMs > 3000) throw failure;
      await wait(Math.max(failure.retryAfterMs, 500 * 2 ** attempt));
    } finally {
      if (timeout !== undefined) clearTimeout(timeout);
    }
  }
  throw new ContactEmailError('Email notification could not be sent.');
}

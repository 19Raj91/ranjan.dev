import localEmailTransport from 'virtual:portfolio-contact-email';
import { env } from 'cloudflare:workers';
import { validateInquiry } from '../../../lib/contact-validation';
import { hasContactEmailConfig, sendContactNotification } from '../../../lib/contact-email';

type SavedInquiry = {
  id: string; name: string; email: string; project_type: string; budget: string; message: string;
  created_at: number; email_status: string; email_provider_id: string | null;
};
export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return Response.json({error:'This request could not be verified.'}, {status:403});
  if (Number(request.headers.get('content-length') || 0) > 16000) return Response.json({error:'Your message is too long.'}, {status:413});
  let body;
  try { const raw = await request.text(); if(raw.length>16000) return Response.json({error:'Your message is too long.'},{status:413}); body=JSON.parse(raw); }
  catch { return Response.json({error:'Please provide valid project details.'},{status:400}); }
  const result = validateInquiry(body);
  if (!result.data) return Response.json({error:result.error},{status:400});
  if (body.website) return Response.json({error:'Please try again without filling the hidden field.'},{status:400});
  try {
    const db = env.DB;
    if (!db) throw new Error('Contact database is not configured');
    const now = Date.now();
    const {name,projectType,budget,message} = result.data;
    const email = result.data.email.toLowerCase();
    const mailConfigured = hasContactEmailConfig(env);
    // Reuse a saved, unsent inquiry when the visitor retries an email failure.
    // Stay inside the email provider's 24-hour idempotency window.
    const pending = mailConfigured ? await db.prepare("SELECT * FROM inquiries WHERE email = ? AND name = ? AND project_type = ? AND budget = ? AND message = ? AND email_status IN ('pending', 'failed', 'not_configured') AND created_at > ? ORDER BY created_at DESC LIMIT 1")
      .bind(email,name,projectType,budget,message,now-23*60*60*1000).first<SavedInquiry>() : null;
    const recent = await db.prepare('SELECT id FROM inquiries WHERE email = ? AND created_at > ? LIMIT 1').bind(email,now-60000).first<{id:string}>();
    if(recent && recent.id !== pending?.id) return Response.json({error:'Your recent inquiry is already saved. Please wait a minute before sending another.'},{status:429});
    const id = pending?.id ?? crypto.randomUUID();
    const createdAt = pending?.created_at ?? now;
    if (!pending) {
      await db.prepare('INSERT INTO inquiries (id, name, email, project_type, budget, message, created_at, email_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(id,name,email,projectType,budget,message,createdAt,mailConfigured?'pending':'not_configured').run();
      // Keep the existing optional CRM/webhook integration independent of email notifications.
      const webhook = (env as unknown as Record<string,string>).CONTACT_WEBHOOK_URL;
      if(webhook) {
        try { const response = await fetch(webhook,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,...result.data,createdAt}),signal:AbortSignal.timeout(5000)}); if(!response.ok) console.error('Contact webhook returned',response.status); }
        catch { console.error('Contact webhook unavailable; inquiry remains safely saved.'); }
      }
    }
    if (mailConfigured) {
      let providerId: string;
      try {
        providerId = await sendContactNotification({id,name,email,projectType,budget,message,createdAt},env,{fetcher:localEmailTransport});
      } catch (error) {
        await db.prepare("UPDATE inquiries SET email_status = 'failed' WHERE id = ?").bind(id).run();
        // contact-email.ts creates these messages itself; provider response bodies and secrets are never logged.
        console.error('Contact email failed:', error instanceof Error ? error.message : 'Unknown email error', 'Reference:', id);
        return Response.json({error:'Your inquiry is safely saved, but its email notification could not be sent. Please try again; your details will not be duplicated.',reference:id.slice(0,8)}, {status:503});
      }
      await db.prepare("UPDATE inquiries SET email_status = 'accepted', email_provider_id = ? WHERE id = ?").bind(providerId,id).run();
      return Response.json({success:true,reference:id.slice(0,8),notification:'accepted'}, {status:201});
    }
    // Preserve the working form while the owner completes secure email-service setup.
    // This is deliberately not reported as an email being sent.
    console.warn('Contact email is not configured; inquiry saved. Reference:',id);
    return Response.json({success:true,reference:id.slice(0,8),notification:'not_configured'}, {status:201});
  } catch (error) { console.error('Contact submission failed',error); return Response.json({error:'Your inquiry could not be saved. Please try again in a moment.'},{status:503}); }
}

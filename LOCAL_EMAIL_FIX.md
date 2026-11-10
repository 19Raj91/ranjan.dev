# Local email runtime compatibility fix

The contact form's Worker fetch is returning `internal error; reference = ...` while a direct Node HTTPS request to Resend succeeds. This matches reported local workerd HTTPS failures; the runtime reference alone does not identify the exact TLS or network cause.

This fix uses an authenticated local-development bridge. The Worker sends its email request over the computer's loopback interface to the Vite development server, and Node sends the request to the fixed Resend HTTPS endpoint using normal certificate verification. The deployed build continues using the direct Worker email transport.

## Apply on your Mac

1. Extract `ranjan-email-local-fix.zip` into Downloads.
2. Stop your development server with Control+C.
3. Keep Terminal in the actual portfolio project folder, such as `ranjan-portfolio-2`.
4. Run:

```bash
node ~/Downloads/ranjan-email-local-fix/scripts/install-local-email-fix.mjs
npm run dev
```

The installer backs up changed code under `work/email-fix-backup-<timestamp>` in your project. It only changes the email helper, email transport declarations, development transport plugin, and the relevant registrations in Vite configuration and the contact route. Existing unrelated Vite settings are preserved. It never reads or modifies `.dev.vars`, saved inquiries, or page/style files. No dependency installation or database migration is needed for this patch.

Retry your form submission. Keep your existing API key and sender settings.

## Security and behavior

- The bridge exists only in the Vite development server. Production's virtual transport exports undefined, so the original direct email path remains in use.
- Requests require an unpredictable per-server token, a loopback peer, a valid bearer credential, an inquiry idempotency key, and the fixed intended recipient. Browser-origin requests, other recipients, copies, file attachments, and oversized bodies are rejected.
- The bridge forwards email status and Retry-After. Existing persistence, email retry, idempotency, and visitor success/error behavior are unchanged.
- Credentials and form contents are not logged. HTTPS certificate verification stays enabled.
- The local bridge does not support `npm start` for the prebuilt Worker; use `npm run dev` for this workaround.

31 automated checks passed, including a local HTTP bridge round trip, retry behavior, recipient restrictions, credential privacy, installer backups/idempotency, and inquiry persistence. The exact macOS workerd environment and real inbox delivery still need to be verified on your computer.

Reference: https://github.com/cloudflare/workers-sdk/issues/9356

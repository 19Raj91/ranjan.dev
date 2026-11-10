# Contact form email notifications

The backend sends contact submissions to **rggupta714@gmail.com** using the Resend HTTPS API. The recipient is fixed in the server-only `lib/contact-email.ts` module and cannot be changed by a visitor.

## Required activation

Email delivery is not active until both runtime values are configured:

- `RESEND_API_KEY`: a Resend API key with sending access. Store this as a server secret.
- `CONTACT_EMAIL_FROM`: a sender accepted by your Resend account, usually an address on your verified sending domain; for example `Portfolio <contact@your-domain.com>`.

The destination Gmail address is the recipient. Do not use your Gmail password, and do not assume a Gmail address can be used as a verified Resend sender.

Create your key at https://resend.com/api-keys and configure a sending domain at https://resend.com/domains. Configure the two values in the hosted site's runtime environment, then deploy the saved source version to apply the configuration. The API key must never be added to frontend code, Git, or public files.

For local development, add the two values to a private `.dev.vars` file in the project root and restart the server. Do not commit that file.

```text
RESEND_API_KEY="your-real-api-key"
CONTACT_EMAIL_FROM="Portfolio <contact@your-verified-domain.com>"
```

Apply both local SQL migrations in order if using a fresh database. For an existing local database that already contains inquiries, apply only `drizzle/0001_contact_email_notifications.sql`, using the same local Wrangler command as the initial migration.

## What the notification contains

Name, email address, project type, budget, and message, plus the inquiry reference and submission timestamp. Both plain-text and escaped HTML versions are sent. The submitter's email is used as Reply-To, making it possible to reply directly.

## Behavior and reliability

- Existing validation, same-origin checks, honeypot, database storage, and the optional CRM webhook remain in place.
- Once email is configured, the endpoint returns a successful submission only after the email provider accepts the notification. The existing frontend success message and design are unchanged.
- Temporary network, server, and short rate-limit failures receive up to three attempts using the same request payload and provider idempotency key.
- If notification delivery is rejected, the saved inquiry is retained and the existing error area asks the visitor to retry. Repeating the same details within 23 hours reuses the saved inquiry and its idempotency key; it does not insert a second inquiry. Ordinary successful repeat submissions keep the existing 60-second throttle.
- If credentials are absent, the original form continues saving inquiries and showing its original saved-inquiry confirmation. The API explicitly returns `notification: not_configured`; it does not claim an email was sent. These rows are marked `not_configured`. Activation does not automatically backfill old submissions.
- `email_status` and `email_provider_id` record the outcome for troubleshooting. `accepted` means the provider accepted the message, not that inbox delivery or reading has been verified. Check the email provider's delivery events for bounces or delivery failures.
- This is request-time delivery with bounded retries; there is no background retry scheduler. A failed notification remains saved for a visitor retry or operator follow-up.

No actual inbox delivery has been tested without the required credentials.

## Tests

With Node.js 24 or newer:

```bash
node --test tests/contact.test.mjs tests/contact-email.test.mjs
```

Provider documentation: https://resend.com/docs/api-reference/emails/send-email and https://resend.com/docs/dashboard/emails/idempotency-keys.

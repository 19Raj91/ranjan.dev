# Ranjan — Creative Portfolio

A responsive React portfolio built with the Vinext React framework, custom CSS, Lucide icons, and Cloudflare D1.

## Customize

- `lib/portfolio.ts`: personal branding, portrait path, social URLs, email, availability, and projects. Null profile links open an honest coming-soon message with a route to the working contact form.
- `app/page.tsx`: narrative, service descriptions, process, and explicitly marked testimonial placeholders.
- `app/globals.css`: layout, palette, type, and motion.
- `components/project-demo.tsx` / `.css`: six interactive self-initiated concept previews, not real client claims. The Photoshop-category preview is an illustrative design direction, not a claim of actual client Photoshop work.
- Add your own portrait to `public/`, and set `profile.portrait`.
- Replace concepts and testimonial placeholders with your genuine work and feedback.
- If demo source files change, copy them to `public/project-demo.tsx` and `public/project-demo.css` before building so downloads stay current.

## Contact backend

`POST /api/contact` validates and saves inquiries to the `inquiries` D1 table. Includes server-side validation, same-origin checks, request size limits, honeypot field, per-email 60-second throttling, and visible success/error states. Data is not publicly readable. Review stored inquiries through the Site database tools. The form reports saved inquiries. Server-side email notifications to rggupta714@gmail.com are implemented; see EMAIL_SETUP.md to activate secure delivery. Once configured, successful submissions wait for the provider to accept the notification.

Optional: set `CONTACT_WEBHOOK_URL` in the Site runtime environment to an HTTPS webhook connected to your email or CRM service. The webhook receives the inquiry as JSON after storage; a webhook failure never loses the saved message. Do not put a secret endpoint in client code. A production notification integration should monitor failures and implement retries if delivery guarantees are needed.

Social/contact links are intentionally unconfigured until your real profiles are supplied. No fictional client claims or experience percentages are used.

## Development

`npm run dev` starts the app. `npm run build` builds the Worker. `npm run db:generate` generates schema migrations.

Apply D1 migrations locally before testing valid contact submissions. Sites applies committed migrations at deployment.

## Email notifications

Configure the server secret `RESEND_API_KEY` and the verified sender `CONTACT_EMAIL_FROM` to activate email notifications. The recipient is fixed server-side as `rggupta714@gmail.com`. All form fields are included, transient failures are retried, and failed notifications retain their saved inquiries. Existing saved-inquiry behavior is preserved until credentials are configured. See `EMAIL_SETUP.md` for details and local database migration instructions.

## Accessibility and motion

Semantic sections, a skip link, form labels and native validation, keyboard-focus states, native modal focus containment with Escape handling and focus restoration, reduced-motion support, and a mobile navigation menu.

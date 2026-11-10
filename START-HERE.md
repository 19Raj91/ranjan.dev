# Run your portfolio on your Mac

## 1. Requirements

Install Node.js 22.13 or newer (includes npm). Verify in Terminal:

```bash
node -v
npm -v
```

## 2. Extract and open

Double-click ranjan-portfolio.zip in Downloads. In Terminal:

```bash
cd ~/Downloads/ranjan-portfolio
npm ci
npm run dev
```

Open http://localhost:5173 (or the URL printed in Terminal).
Keep Terminal running while viewing your website. Press Control+C to stop it.
If you extracted somewhere else, type `cd ` and drag the extracted folder into Terminal, then press Enter.

This is a React application: do not open app/page.tsx by double-clicking it, and do not serve the source directly through Apache.

## 3. Enable the contact form database locally

Local inquiries are separate from inquiries submitted to the hosted portfolio.
Stop the development server with Control+C, then run these commands from the project folder:

```bash
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_create_inquiries.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_contact_email_notifications.sql
npm run dev
```

Run those SQL files only once per fresh local database. It creates the inquiries table; no Cloudflare account is required for the local database emulator.
The form saves inquiries and shows a success reference. It does not automatically send email.
For a local email/CRM webhook, create a `.dev.vars` file in the project root containing:

```text
CONTACT_WEBHOOK_URL="https://your-configured-webhook.example/endpoint"
```

Replace that URL with your actual service endpoint. Keep this file private and restart the development server after changes.

## 4. Customize

- lib/portfolio.ts: your name, portrait, contact details, social links, and projects.
- app/page.tsx: website text, services, workflow, and testimonial placeholders.
- app/globals.css: colors, typography, responsiveness, and animations.
- components/project-demo.tsx and components/project-demo.css: interactive concept demos.
- public/: images and other public assets.

After editing the demo component or styles, copy the changed file to the matching public/project-demo.tsx or public/project-demo.css so visitors download the current source.

See README.md for backend details. Running or editing locally does not change the hosted portfolio automatically.

## Checks

```bash
node --test tests/contact.test.mjs
npm run build
```

The backend tests use Node's built-in SQLite and TypeScript support; use Node.js 24 or newer to run those tests as written.


## Email notification update

Email notifications are implemented for rggupta714@gmail.com. Read EMAIL_SETUP.md to configure the required RESEND_API_KEY server secret and CONTACT_EMAIL_FROM sender. Without these values, the existing form still saves inquiries but does not send email. For an existing local database, apply only the new 0001_contact_email_notifications.sql migration; do not reapply 0000.

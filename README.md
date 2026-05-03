# Tord Sign

Lean e-signature MVP built from the PRD in [`Prompt/prd.md`](./Prompt/prd.md).

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase database and storage
- Resend for transactional email
- `pdf-lib` for completed PDF generation
- `signature_pad` for browser signature capture

## MVP flow

1. Upload a PDF and create a draft document.
2. Add normalized recipient fields in the editor.
3. Save and send a unique signing link by email.
4. Recipient signs without logging in.
5. System writes values into the PDF, stores the completed copy, and records an audit trail.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env.local` and fill in Supabase and Resend credentials.
3. Run [`supabase/schema.sql`](./supabase/schema.sql) in your Supabase project.
4. Create a public or private storage bucket matching `SUPABASE_STORAGE_BUCKET`.
5. Use a plain email address for `EMAIL_FROM` unless your provider and integration expect a formatted sender string.
6. Start the app:

```bash
npm run dev
```

## Notes

- The editor stores field coordinates as normalized values from `0` to `1`.
- The current editor uses a clean placement canvas for MVP speed; you can wire `react-pdf` page rendering directly into the same field model next.
- No auth, templates, multi-recipient routing, or billing have been added, per the PRD constraints.

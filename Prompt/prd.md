You are building a modern MVP e-signature platform.

The product should mirror the core workflows of tools like Box Sign, DocuSign, and SignWell, but only at MVP level. Do not overbuild. Focus on allowing a user to upload or create a document, place fillable fields, send it to a recipient by email, let the recipient complete and sign it, then email completed copies to both sender and recipient.

## Product goal

Build a simple e-signature MVP where:

1. A sender uploads a PDF document.
2. The sender places fillable fields on the document.
3. The sender enters:
   - Sender name
   - Sender email
   - Email subject
   - Recipient name
   - Recipient email
   - Optional email message
4. The system sends the recipient a unique signing link.
5. The recipient opens the link without logging in.
6. The recipient fills the fields and signs.
7. The system generates the completed signed PDF.
8. The completed copy is emailed to both sender and recipient.
9. The system stores the completed document and audit trail.

## MVP only

Do not add:
- User accounts
- Teams
- Billing
- Templates
- Multiple recipients
- Advanced roles
- Complex permissions
- Dashboard analytics
- Enterprise compliance
- In-app inbox
- Document folders

Build only the core signing flow.

## Recommended stack

Use:

- Next.js
- TypeScript
- Tailwind CSS
- Supabase for database and file storage
- Supabase Storage for PDFs
- Resend for email delivery
- pdf-lib for writing fields/signatures into PDFs
- react-pdf or PDF.js for rendering PDF previews
- signature_pad or canvas for signature capture
- uuid or nanoid for document and signing tokens

## Core screens

### 1. Home / Dashboard

Simple screen showing:
- Create new document button
- Recent documents
- Status badge:
  - Draft
  - Sent
  - Completed
  - Expired

For MVP, no auth is required. Store documents globally or use local sender email as the owner reference.

### 2. Upload document screen

User can:
- Upload PDF
- See file name
- Continue to field editor

Validation:
- Only PDF files
- Max file size should be configurable, default 10MB

### 3. Document field editor

This is the most important screen.

Layout:
- Left sidebar: field tools
- Center: PDF preview
- Right sidebar: field properties and send panel

Fields to support:
- Signature
- Text
- Date
- Initials

User can:
- Add field
- Drag field
- Resize field
- Delete field
- Mark field as required
- Assign field to recipient

Field coordinates must be saved relative to the PDF page, not browser pixel position.

Each field should store:
- Page number
- X position
- Y position
- Width
- Height
- Type
- Required boolean
- Recipient email
- Placeholder
- Value, empty until completed

Important:
Use normalized coordinates from 0 to 1 if easier, so placement remains accurate across different screen sizes.

Example:
```json
{
  "type": "signature",
  "pageNumber": 1,
  "x": 0.22,
  "y": 0.65,
  "width": 0.28,
  "height": 0.08,
  "required": true,
  "recipientEmail": "client@example.com"
}

4. Send document modal

Fields:

Sender name
Sender email
Recipient name
Recipient email
Email subject
Optional email message

Important sender email note:
The sender email is used as the reply-to email and sender identity in the email content. Actual sending should be done through Resend or another verified email provider domain.

On submit:

Save document status as sent
Generate signing token
Send email to recipient
Redirect sender to confirmation screen
5. Recipient signing page

Route: /sign/[token]

Recipient sees:

Document preview
Highlighted required fields
Form inputs overlaid on PDF
Signature drawing modal for signature field
Submit button

Rules:

No login required
Token must be unique
Token must expire after configurable period, default 30 days
Prevent submission if required fields are empty
After submit, lock the document

6. Completion screen

After recipient submits:

Show success message
Generate final PDF
Store final PDF in Supabase Storage
Email final PDF link or attachment to sender and recipient
Update status to completed
Database schema

Use Supabase Postgres.

documents table
create table documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  original_file_name text,
  original_file_url text not null,
  completed_file_url text,
  status text not null default 'draft',
  sender_name text,
  sender_email text,
  recipient_name text,
  recipient_email text,
  email_subject text,
  email_message text,
  signing_token text unique,
  signing_token_expires_at timestamptz,
  sent_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

Allowed status values:

draft
sent
completed
expired
document_fields table
create table document_fields (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade,
  type text not null,
  page_number integer not null,
  x numeric not null,
  y numeric not null,
  width numeric not null,
  height numeric not null,
  required boolean default true,
  placeholder text,
  recipient_email text,
  value text,
  signature_image_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

Allowed field types:

signature
text
date
initials
audit_events table
create table audit_events (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade,
  event_type text not null,
  actor_name text,
  actor_email text,
  ip_address text,
  user_agent text,
  metadata jsonb,
  created_at timestamptz default now()
);

Audit event types:

document_created
document_uploaded
fields_added
document_sent
email_sent
document_viewed
document_signed
document_completed
completion_email_sent
Supabase storage buckets

Create these buckets:

documents
completed-documents
signatures

Storage structure:

documents/{documentId}/original.pdf
completed-documents/{documentId}/completed.pdf
signatures/{documentId}/{fieldId}.png
API routes

Create these API routes.

POST /api/documents/upload

Purpose:
Upload PDF and create document record.

Input:

PDF file
title

Output:

document id
file url

Actions:

Upload original PDF to Supabase Storage
Create document row
Create audit event document_uploaded
GET /api/documents/[id]

Returns:

document data
fields
POST /api/documents/[id]/fields

Purpose:
Save all fields for a document.

Input:

{
  "fields": []
}

Actions:

Delete old fields for document
Insert new fields
Create audit event fields_added
POST /api/documents/[id]/send

Purpose:
Send signing request.

Input:

{
  "senderName": "",
  "senderEmail": "",
  "recipientName": "",
  "recipientEmail": "",
  "emailSubject": "",
  "emailMessage": ""
}

Actions:

Generate signing token
Set expiry date
Save sender and recipient details
Update status to sent
Send recipient email using Resend
Create audit event document_sent
Create audit event email_sent

Email should include:

Sender name
Document title
Signing link
Optional message
GET /api/sign/[token]

Purpose:
Load signing document for recipient.

Actions:

Validate token
Check not expired
Return document and fields
Create audit event document_viewed
POST /api/sign/[token]/submit

Purpose:
Submit completed fields.

Input:

{
  "fields": [
    {
      "id": "",
      "value": "",
      "signatureImageBase64": ""
    }
  ]
}

Actions:

Validate token
Validate required fields
Save text/date/initial values
Upload signature image to Supabase Storage
Generate completed PDF with pdf-lib
Save final PDF to Supabase Storage
Update document status to completed
Set completed_at
Create audit event document_signed
Create audit event document_completed
Email final PDF to sender and recipient
Create audit event completion_email_sent
Email behavior

Use Resend.

Important:
Do not try to send directly from the sender’s personal email unless that domain is verified. Instead:

From:

Your App Name <sign@yourverifieddomain.com>

Reply-To:

senderEmail

Email content should say:

{senderName} sent you a document to sign.

Completion email:

The document has been completed. You can download your signed copy here:
{completedFileUrl}
PDF generation rules

Use pdf-lib.

When generating the final PDF:

Load original PDF
For each field:
Convert normalized x/y/width/height to actual PDF page coordinates
Draw text values
Draw date values
Draw initials
Embed signature PNG into signature field box
Add a final audit summary page if simple to implement

Audit page should include:

Document title
Sender name and email
Recipient name and email
Sent timestamp
Completed timestamp
Signing IP
User agent

If audit page is too much for MVP, create audit_events only and skip the PDF audit page.

UI design direction

Use a modern SaaS UI.

Style:

Clean
Minimal
Spacious
Soft borders
Rounded cards
Light background
Clear hierarchy
Professional but not boring

References:

SignWell
Box Sign
DocuSign
Dropbox Sign
Linear
Notion-style clarity

Use:

Tailwind CSS
shadcn/ui if available
Lucide icons

Key UI components:

Document status badges
Upload card
PDF editor canvas
Field chips
Send modal
Signing progress indicator
Success screen
Field editor interaction requirements

The field editor must feel polished.

Required:

Add field from sidebar
Field appears on current PDF page
Drag field around
Resize field
Delete field
Select field to edit properties
Show field type label
Show required indicator
Save fields before sending

Avoid complex multi-recipient assignment for now.

Recipient signing UX

Make it extremely simple.

Recipient should:

Open signing link
See document
Click through fields
Fill text fields
Draw signature
Submit

After submit:

Disable all fields
Show completed message
Security basics

Add:

Unique signing token
Token expiry
Status lock after completion
Basic validation
Audit events
File type validation
Required field validation

Do not expose Supabase service keys on frontend.

Use server routes for sensitive actions.

Environment variables

Use:

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
APP_BASE_URL=
EMAIL_FROM=

Example:

EMAIL_FROM="Signature App <sign@yourdomain.com>"
Build order

Build in this order:

Project setup
Supabase schema
Storage buckets
PDF upload
Document editor UI
Field placement system
Save fields
Send modal
Resend email integration
Signing page
Signature capture
PDF completion generation
Completion emails
Audit events
Final UI polish
Acceptance criteria

The MVP is complete when:

I can upload a PDF
I can place signature, text, date, and initials fields
I can enter sender and recipient details
The recipient receives a signing link
The recipient can fill and sign without an account
The final PDF is generated correctly
Sender and recipient both receive the completed copy
Document status changes from draft to sent to completed
Basic audit trail is stored
Important implementation notes

Do not overcomplicate this.

Do not add authentication yet.

Do not add multiple recipients yet.

Do not add subscriptions yet.

Do not build template management yet.

Do not build document folders yet.

Focus only on making the upload, field placement, signing, final PDF, and email flow work smoothly.

Before coding, first generate:

A clear file structure
A database setup plan
A component list
A route/API list
Then start implementing step by step
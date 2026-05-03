Claude, make the following fixes to the Tordsign e-signature MVP. Do not redesign the whole product. Apply these changes surgically without breaking the existing upload, field placement, signing, PDF generation, email, and completion flow.

## 1. Add feedback for save draft and sent email

When a user saves a draft, show a clear toast/modal feedback:

- Success: “Draft saved successfully”
- Error: “Couldn’t save draft. Please try again.”

When a document is sent by email, show feedback:

- Success: “Signing email sent successfully”
- Error: “Couldn’t send email. Please check the details and try again.”

Use the existing toast system if available. If not, add a simple toast component.

---

## 2. Current fields should behave like a layer panel

The current fields list should feel like a simple layer panel.

- Field name, 14px font size and a 10px top/bottom padding


On hover, reveal actions icon:
- Rename
- Duplicate
- Delete

User should be able to rename each field inline.

Default field names:
- Signature 1
- Text 1
- Date 1
- Initials 1

When duplicated, name it:
- Signature 1 copy
- Text 1 copy

---

## 3. Add shortcuts

Support field through:

- Alt + drag to duplicate
- Cmd + C on Mac to copy
- Cmd + C on on Windows/Linux to copy
- Cmd + P to paste on Mac
- Ctrl + P to paste on Windows/Linux
- Cmd + D on Mac to duplicate
- Ctrl + D on Windows/Linux to duplicate

Behavior:
- Duplicated field should keep same properties
- Place duplicate slightly offset from original
- Select duplicated field after creation
- Ensure duplicate gets a new ID

---

## 4. Remove placeholder input from right panel

The placeholder input field in the field properties panel is not needed.

Remove it completely from the UI and logic unless it is required internally. If required internally, keep the data model but hide it from the UI.

---

## 5. Font size should be dropdown and editable

Change font size control to a combo input.

It should:
- Show common dropdown options:
  - 8
  - 10
  - 12
  - 14
  - 16
  - 18
  - 20
  - 24
  - 28
  - 32
- Also allow manual typing
- Save custom values correctly
- Apply accurately to the final PDF

---

## 6. Font color box should be square

The font color input should be a square swatch, not a wide rectangle.

Use:
- 32px by 32px or similar
- Rounded corners
- Border
- Current selected color visible

---

## 7. Fix final PDF field scaling and background issue

There is a major issue with completed fields on the final PDF.

Current problem:
- Completed field text appears too large on the final PDF
- It seems to mirror the field box width instead of the font scale used during document creation
- Completed fields have a white background

Fix this.

Expected behavior:
- Text, date, and initials should render at the exact font size set in the editor
- Signature should fit within the signature field without stretching unnaturally
- Field values should not have a white background
- Only the actual text/signature should appear on the PDF
- Background should be transparent
- The final PDF should visually match what the sender created in the editor

Implementation notes:
- Do not calculate font size from field width
- Use the saved `fontSize` value directly
- Convert normalized field coordinates to actual PDF coordinates correctly
- Account for PDF coordinate origin differences
- Do not draw a white rectangle behind completed values
- If a background rectangle is currently being drawn, remove it or make it transparent
- Respect field height only for positioning and clipping, not for scaling text up

---

## 8. Add IP address to certificate

Add signer IP address to the completion certificate/audit certificate.

Certificate should include:
- Document title
- Sender name
- Sender email
- Recipient name
- Recipient email
- Sent timestamp
- Completed timestamp
- Signer IP address
- User agent if already available
- Signing token/document ID if already available

Capture IP from the request headers on signing submit.

Use common fallback headers:
- `x-forwarded-for`
- `x-real-ip`

---

## 9. Add Tordsign branding to certificate

The certificate should include:
- Tordsign logo
- Tordsign brand colors

Use existing brand assets if already available. If not, create a simple text logo fallback:

“Tordsign”

The certificate should look polished, not plain.

Use Tordsign colors consistently in:
- Header
- Section dividers
- Status badge
- Footer accent

Do not make the certificate visually heavy.

---

## 10. Make the editor mobile responsive

The editor must work properly on mobile.

On mobile:
- Field tools should be represented as vertically arranged icons
- The current fields panel should not appear
- Each created field should have a delete icon at its top-right corner
- The PDF canvas should remain usable
- The UI should not overflow horizontally
- Toolbars should be compact
- Panels should collapse cleanly

Suggested mobile layout:
- Top bar: document title, sender info, save/send
- top floating vertical toolbar: field tool icons
- Center: PDF document

---

## 11. Mobile field properties should behave like Google Docs text properties

On mobile, field properties should not use the full desktop right sidebar.

Instead:
- Use a bottom toolbar or bottom sheet
- Show only relevant controls for selected field
- Make it easy to change:

  - Font size
  - Font color
  - Required toggle
  - Delete

The interaction should feel similar to how Google Docs exposes text formatting controls on mobile.

---

## 12. Allow renaming sender info and document title

User should be able to edit:
- Document title
- Sender name
- Sender email or sender display info if sender email is fixed
- Email subject

Make sure these changes persist.

If sender email is fixed as `sign@tordaxis.com`, the sender display name should still be editable.

---

## 13. Fix outgoing email sender name

Current issue:
Because the sending email is `sign@tordaxis.com`, email clients show the sender as “Sign”.

This is wrong.

Expected sender display:
```txt
[Sender Name] via Tordsign
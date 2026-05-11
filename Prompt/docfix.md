The current document cards are using generic template-style cards (first image). That is not the experience I want.

I want the document preview cards to behave like real document thumbnails similar to Google Docs/Word previews (second image).

Fix the document list UI so each document card shows:

- A real scaled preview thumbnail of the actual first page of the document
- The preview should look like a miniature document page
- Preserve the actual document formatting/layout in the thumbnail
- White document page with proper aspect ratio
- Thin border around the page preview
- Metadata below the preview, not inside it
- Title below the thumbnail
- Date/activity below the title
- Actions/menu at the bottom/right

Do NOT use:
- Fake template cards
- Large descriptive marketing cards
- Big icon-first layouts
- Placeholder-style previews

The card should feel like:
- Google Docs
- Dropbox Paper
- Word recent documents
- Notion document gallery

Important:
- Generate actual page thumbnails from the document content/PDF
- The preview should visually match the real document
- Long document titles should truncate cleanly
- Cards should remain responsive
- Maintain consistent aspect ratio across all previews

This is purely a UI update. Do not break:
- Existing documents
- Templates
- Document editing
- Signing flow
- Upload flow
- Document rendering
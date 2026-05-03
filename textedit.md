## Claude, fix these issues surgically. Do not rebuild the whole product.

## 1. Clarify non-required fields on recipient side

When I said non-required fields should not show on the recipient side, I did NOT mean they should be removed from the document preview.

Correct behavior:

- Non-required fields should still appear on the document where they were placed.
- Non-required fields should still be fillable if the recipient chooses to fill them.
- Non-required fields should NOT appear in the right-side “Required fields / To complete” panel.
- The right panel should only list required fields that need attention.

So update only the recipient-side right panel logic.

Do not hide or remove optional fields from the PDF/document canvas.

Expected recipient right panel:
- Show required fields only
- Track completion state for required fields only
- Allow submit once all required fields are completed
- Optional fields can remain visible and usable on the document itself

---

## 2. Fix document-from-scratch text editor

The text editor used when creating a document from scratch must behave like a real document editor, not like one giant text field.

Current issue:
- When I paste a full agreement, it treats everything like a single text block.
- Pressing Enter creates a full block under the entire text instead of behaving like a normal editor.
- Text styles and formatting are not properly recognized.
- It does not feel like an actual editor.

Expected behavior:
- It should behave like a proper rich text document editor.
- Pressing Enter should create a new paragraph/line inside the editor, not a huge separate block.
- Pasted agreements should preserve structure:
  - paragraphs
  - line breaks
  - headings if available
  - bold/italic/underline if copied
  - ordered lists
  - unordered lists
- The editor should recognize and apply text properties:
  - font size
  - font weight
  - bold
  - italic
  - underline
  - alignment
  - paragraph spacing
  - line height if possible
- It should support normal document editing behavior similar to Google Docs, Notion, or a standard legal document editor.

---

## 3. Recommended implementation

If the current editor is too basic, replace it with a proper rich text editor library.

Preferred options:
- Tiptap
- Lexical
- Slate

Use Tiptap if possible because it is easier to implement quickly.

Recommended Tiptap extensions:
- StarterKit
- Underline
- TextStyle
- Color
- FontSize if available or custom font size extension
- TextAlign
- Placeholder
- Link if needed
- ListItem
- OrderedList
- BulletList

---

## 4. Paste handling requirement

When a user pastes an agreement:

- Do not collapse everything into one block.
- Preserve paragraph structure.
- Preserve line breaks.
- Preserve lists where possible.
- Preserve basic formatting like bold and italic.
- Clean unnecessary HTML but do not destroy document structure.

The editor should store content as structured rich text, preferably JSON or clean HTML, not just plain text.

---

## 5. Enter key behavior

Fix Enter key behavior.

Expected:
- Enter creates a new paragraph or line inside the editor.
- Shift + Enter creates a soft line break.
- It should not create a separate full-width block below the entire document.
- It should not treat the pasted content as one large object.

---

## 6. Export/rendering requirement

When the created-from-scratch document is later rendered/sent/signed/exported:

- The document should preserve the written agreement structure.
- Paragraphs should remain paragraphs.
- Lists should remain lists.
- Text styling should remain visible.
- The generated PDF should look like a proper agreement document.

If PDF generation currently only supports plain text, update it to render rich text properly or convert the editor HTML into a PDF-safe layout before saving.

---

## 7. UI behavior

The editor toolbar should include:
- Bold
- Italic
- Underline
- Font size
- Text color
- Alignment
- Bullet list
- Numbered list
- Undo/redo if available

It should feel like an actual document editor, not a form input.

---

## 8. Do not break existing features

Do not break:
- PDF upload flow
- Field placement
- Recipient signing flow
- Final PDF generation
- Email sending
- Certificate generation
- Draft saving

Only fix:
1. Optional fields visibility in recipient right panel
2. Rich text editor behavior for creating documents from scratch

After implementing, test:

1. Create document from scratch
2. Paste a full agreement
3. Confirm paragraphs and line breaks remain
4. Press Enter inside the document
5. Confirm it behaves like a normal editor
6. Apply bold, italic, underline, color, and font size
7. Save document
8. Add signing fields
9. Send to recipient
10. Confirm optional fields still show on document but not in right completion panel
11. Complete signing
12. Confirm exported/completed document keeps the document structure
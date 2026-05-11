## Fix the document editor page layout and heading behavior without breaking the existing editor, signing flow, or document rendering.

## Current issue:
The editor is rendering pages like one continuous canvas. I need it to behave like a real document editor (Google Docs / Word style).

## Fix:
- Each page should be a separate white sheet
- Add visible page boundaries
- Add space/gap between pages
- Proper page padding/margins
- Content should start inside the page padding, not at the edge
- Pages should visually stand alone
- Page breaks should be obvious
- Multi-page documents should feel like real paginated documents

Also:
text formatting is broken.

Current issue:
When I highlight text and apply H1 or H2, it applies to the entire document/block instead of only the selected text.

## Fix:
- Heading formatting should apply only to the selected paragraph/block
- Do not affect the whole document
- Preserve normal editor behavior like Google Docs/Notion
- Pressing Enter after H1/H2 should continue correctly instead of breaking formatting across everything

Do this surgically without rebuilding the editor.

Finally, character settings should be sticky such that even when users scroll through pages, they can  apply character settings. Also ensure that font application works seamlessly.
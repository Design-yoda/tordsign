# Claude Fix Prompt: Field Rendering, Mobile Responsiveness, and Table Overflow

Claude, apply these fixes surgically. This is a UI/rendering accuracy fix only.

Do not change product behavior, document flow, database logic, email logic, signing logic, completion logic, or certificate logic unless absolutely required for the UI fix.

## 1. Main issue

Field boxes and field content are not rendering consistently between:

- Editor view
- Saved document view
- Shared recipient document
- Mobile recipient view
- Generated/completed PDF

Current problems:

- Field boxes seem to have a max width or layout constraint.
- Created fields do not appear on the saved/shared document exactly as they were placed.
- Text inside completed fields appears bigger on generated/shared documents.
- On mobile, the shared document mirrors desktop instead of scaling properly.
- Field content should maintain the same proportion and placement as it had in the editor.

## 2. Expected field behavior

Fields must maintain the same relative:

- Position
- Width
- Height
- Font size
- Visual proportion
- Placement on the document

Across:

- Editor
- Saved document preview
- Recipient signing page
- Mobile view
- Generated PDF

## 3. Use normalized field positioning

Do not calculate field size based on the current screen width alone.

Fields should be saved and rendered using normalized document-relative values:

```ts
x: 0 to 1
y: 0 to 1
width: 0 to 1
height: 0 to 1
fontSize: saved actual font size
````

Render fields like this:

```ts
left: field.x * pageWidth
top: field.y * pageHeight
width: field.width * pageWidth
height: field.height * pageHeight
```

## 4. Remove field box sizing constraints

Remove any CSS that forces field boxes into the wrong size.

Check and remove or override:

```css
max-width
min-width
width: auto
fit-content
clamp()
```

Field boxes should only use calculated page-based dimensions.

Do not allow flex layouts, parent containers, or mobile breakpoints to override field dimensions.

## 5. Fix text size mismatch

Text should not become bigger on shared or completed documents.

Use the saved font size directly.

Do not calculate font size from:

* Field width
* Field height
* Viewport width
* Mobile breakpoint
* PDF display width

If the page is scaled down on mobile, the field and its text should scale together with one page scale ratio.

Example:

```ts
const scale = displayedPageWidth / originalPageWidth;
const renderedFontSize = field.fontSize * scale;
```

For final PDF generation:

* Use the saved font size correctly in PDF coordinate space.
* Do not enlarge text to fill the field box.
* Do not stretch text.
* Do not use field width to infer font size.
* Do not draw a white background behind field values.

## 6. Fix mobile shared document rendering

The recipient shared document must be properly mobile responsive.

Expected mobile behavior:

* Document page scales down to fit the viewport.
* Fields scale with the page.
* Field positions stay attached to the correct document location.
* Text and signatures scale proportionally with the field.
* No horizontal overflow.
* No desktop-only field sizes on mobile.

Use one shared page scale value for both the page and all overlay fields.

Example:

```ts
const pageScale = displayedPageWidth / originalPageWidth;

const fieldLeft = field.x * displayedPageWidth;
const fieldTop = field.y * displayedPageHeight;
const fieldWidth = field.width * displayedPageWidth;
const fieldHeight = field.height * displayedPageHeight;
const fontSize = field.fontSize * pageScale;
```

## 7. Create shared field rendering utilities

Create one shared utility/helper for field positioning and scaling.

Example:

```ts
getFieldRect(field, pageWidth, pageHeight)
getScaledFontSize(field, displayScale)
```

Use the same utility in:

* Editor overlay
* Recipient signing overlay
* Saved document preview
* Completed document preview

This prevents different screens from calculating field size differently.

## 8. Fix generated PDF accuracy

The completed PDF should visually match the editor.

For generated PDFs:

* Use saved normalized field coordinates.
* Convert them to actual PDF page width/height.
* Use saved font size directly.
* Do not enlarge text to fit box.
* Do not stretch text.
* Do not use field width to calculate font size.
* Do not draw white backgrounds behind values.
* Keep text and signature placement visually consistent with the editor.

## 9. Fix table column overlap

Tables currently have columns overlapping instead of truncating or adapting.

Fix table responsiveness across the app.

Expected behavior:

* Table columns should not overlap.
* Long text should truncate cleanly with ellipsis.
* Tables should remain readable on desktop.
* Tables should become horizontally scrollable on smaller screens.
* Mobile view should not break layout or overflow the entire page.

Use safe table styles:

```css
.table-wrapper {
  width: 100%;
  overflow-x: auto;
}

table {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
}

td,
th {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

For important cells like document title or email:

```css
.cell-truncate {
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

On mobile:

```css
.table-wrapper {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

table {
  min-width: 640px;
}
```

If there are action columns, keep them compact and prevent them from stretching the table.

## 10. Mobile responsiveness requirement

Make the affected views mobile responsive:

* Editor
* Shared recipient document
* Saved document preview
* Tables/lists
* Field overlays
* Document canvas

Mobile expectations:

* No horizontal page overflow
* PDF/document scales to screen width
* Fields scale with document
* Tables scroll horizontally inside their container
* Buttons and actions remain accessible
* Text does not overlap
* Long emails/document titles truncate with ellipsis
* Layout should feel intentional, not like desktop squeezed into mobile

## 11. Do not change

Do not change:

* Document upload behavior
* Field creation behavior
* Field saving logic
* Signing behavior
* Email sending
* Recipient submission
* Certificate generation
* Database schema
* Existing product flow

Only fix:

* Field visual scaling
* Field position accuracy
* Field content sizing
* Mobile rendering
* Table column overlap
* Table responsiveness

## 12. Test checklist

After fixing, test the following:

1. Create a field in the editor with a custom width.
2. Save the document.
3. Reopen it and confirm the field appears in the same size and position.
4. Send the document.
5. Open recipient link on desktop.
6. Confirm field size and position match editor.
7. Open recipient link on mobile.
8. Confirm fields scale with the page.
9. Fill text field and submit.
10. Open generated PDF.
11. Confirm text is not larger than the editor preview.
12. Confirm field values have no white background.
13. Confirm no field has unexpected max-width.
14. Confirm text is not scaled based on field width.
15. Confirm tables do not overlap.
16. Confirm long table text truncates with ellipsis.
17. Confirm tables are horizontally scrollable on mobile.
18. Confirm the page itself does not overflow horizontally.

```
```

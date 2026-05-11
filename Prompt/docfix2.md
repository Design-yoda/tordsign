````md
Make these fixes without breaking anything that already works. This is mostly editor layout, document rendering, and image object support.

## 1. Fix page padding/margins in the document editor

The page padding/margins still do not work properly.

Current issue:
The system is automatically forcing/clipping values like `36`, `144`, etc. This makes the editor feel wrong because the user cannot control the actual document spacing.

Fix:
- Let the user manually enter preferred page padding/margins.
- Support top, right, bottom, and left padding/margins separately.
- Do not auto-clamp or auto-rewrite the user’s value unless it breaks the document.
- Use sensible min/max only for safety, but do not silently change valid values.
- The value the user enters must be reflected immediately in the editor.
- The same padding/margin must be used in the signing view and generated document.

Add a simple page setup control:

```txt
Page margins
Top
Right
Bottom
Left
````

Use px or pt consistently. If the editor uses px, convert properly during PDF generation.

Optional:
Only implement Google Docs-style ruler margin adjustment if it can be done perfectly. If not, use manual margin inputs instead.

## 2. Editor view must match signing view and generated document

What the user edits must be exactly what the signer sees.

Current issue:
The editor shows 2 pages, but the signing page shows only 1 page.

Fix:

* The signing page must render the same page structure from the editor.
* If the editor has 2 pages, signing page must main how content is from the Editor and be that page
* If the editor has 3 pages, signing page must main how content is from the Editor and be that page
* Page margins, page breaks, content flow, fields, and images must match the editor.
* The generated PDF must use the same page setup as the editor.
* Do not collapse multiple editor pages into one page during signing or generation.

Use one shared document rendering logic for:

* Editor preview
* Signing page
* Generated PDF
* Document preview/thumbnail if applicable

The page setup from the editor must be saved and reused everywhere.

## 3. Fix feathered/blended page edges

Current issue:
There is a feather/blend between pages, especially at the end of Page 1. It looks like the page fades into the next page instead of ending sharply.

Fix:

* Each page must have a sharp rectangular boundary.
* Page end must be visually clear.
* No gradient fade.
* No feathered edge.
* No blurred page break.
* No overlay that makes pages blend into each other.
* Space between pages should be a clean workspace gap.
* Page shadow should be outside the page only and should not fade content at the edge.

Expected:
A clean white page with a sharp bottom edge, then proper workspace canvas gap, then the next clean white page.

## 4. Add image import to document editor tools

Add an option that allows users to import an image into the document editor.

This should work like an editor object/tool, similar to text/signature fields.

User should be able to:

* Upload image
* Place it on the editor canvas/page
* Move it
* Resize it
* Delete it
* Keep aspect ratio while resizing
* Optionally rotate if easy and stable
* Place image on any page
* Save image position and size
* See image correctly on signing page
* See image correctly in generated PDF

Supported image types:

* PNG
* JPG
* JPEG
* WEBP if supported

Image behavior:

* Image should be inserted into the current page.
* Image should be treated as a positioned document object.
* Store image with normalized page-based coordinates, same as fields.
* It must not disturb text layout unless intentionally placed.
* It should sit on the page canvas and be movable freely.
* It should render behind or above fields consistently depending on current editor layering.
* Default should be above document text but below fillable signing fields.

Data model should support:

```ts
{
  id: string;
  type: "image";
  pageNumber: number;
  imageUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
}
```

PDF generation:

* Embed the image into the final generated document.
* Use its saved page number, position, width, and height.
* Do not stretch or distort it.
* Preserve aspect ratio unless user manually changes it.
* It must appear exactly where the user placed it in the editor.

## 5. Do not break existing behavior

Do not break:

* Document creation
* Rich text editing
* Page breaks
* PDF upload
* Field creation
* Field placement
* Field saving
* Signing view
* Email sending
* Generated PDF
* Certificate
* Existing saved documents

## 6. Test checklist

After implementation, test:

1. Create a document from scratch.
2. Set custom page margins manually.
3. Confirm page padding updates correctly.
4. Add enough content to create 2 pages.
5. Confirm editor shows 2 separate pages.
6. Send document.
7. Confirm signer sees the same 2 pages.
8. Generate completed document.
9. Confirm generated PDF preserves the 2 pages.
10. Confirm page edges are sharp, not feathered.
11. Import an image.
12. Move and resize the image.
13. Save and reopen the document.
14. Confirm image remains in correct position.
15. Send to signer.
16. Confirm image appears correctly on signing page.
17. Complete signing.
18. Confirm image appears correctly in generated PDF.

```
```

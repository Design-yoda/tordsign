import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getDocumentById } from "@/lib/data";
import { fetchStoredPdf } from "@/lib/storage";
import { getPdfFieldRect } from "@/lib/field-rendering";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const doc = await getDocumentById(id);

  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const sourceBytes = await fetchStoredPdf(doc.source_pdf_path);
    const pdf = await PDFDocument.load(sourceBytes);
    const regular = await pdf.embedFont(StandardFonts.Helvetica);
    const pages = pdf.getPages();

    for (const field of doc.fields) {
      const pageIndex = field.pageNumber - 1;
      if (pageIndex >= pages.length) continue;

      const page = pages[pageIndex];
      const pageWidth = page.getWidth();
      const pageHeight = page.getHeight();
      const { left: x, top: y, width: w, height: h } = getPdfFieldRect(field, pageWidth, pageHeight);

      // Pick a tint color per field type
      let fillColor = rgb(0.53, 0.71, 0.96);
      let borderColor = rgb(0.25, 0.46, 0.78);
      if (field.type === "signature" || field.type === "initials") {
        fillColor = rgb(0.82, 0.68, 0.96);
        borderColor = rgb(0.54, 0.33, 0.82);
      } else if (field.type === "date-signed" || field.type === "date") {
        fillColor = rgb(0.68, 0.92, 0.78);
        borderColor = rgb(0.18, 0.62, 0.42);
      } else if (field.type === "email" || field.type === "full-name") {
        fillColor = rgb(0.99, 0.91, 0.68);
        borderColor = rgb(0.78, 0.58, 0.18);
      } else if (field.type === "checkbox") {
        fillColor = rgb(0.75, 0.95, 0.82);
        borderColor = rgb(0.2, 0.62, 0.38);
      }

      page.drawRectangle({
        x, y, width: w, height: h,
        color: fillColor,
        borderColor,
        borderWidth: 0.75,
        opacity: 0.25,
        borderOpacity: 0.7,
      });

      const label = field.placeholder || field.type;
      const fontSize = Math.max(6, Math.min(9, h * 0.38));
      const labelWidth = regular.widthOfTextAtSize(label, fontSize);
      if (labelWidth < w - 4 && h >= 10) {
        page.drawText(label, {
          x: x + 3,
          y: y + Math.max(1, (h - fontSize) / 2),
          size: fontSize,
          font: regular,
          color: borderColor,
          maxWidth: w - 6,
          opacity: 0.85,
        });
      }
    }

    const pdfBytes = await pdf.save();
    const safeName = encodeURIComponent(doc.title.replace(/[^\w\s-]/g, "").trim() || "document");

    return new Response(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeName}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[preview] PDF generation error:", err);
    return NextResponse.json({ error: "Failed to generate preview PDF" }, { status: 500 });
  }
}

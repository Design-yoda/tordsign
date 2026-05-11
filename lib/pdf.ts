import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb, type Color } from "pdf-lib";
import { readFile } from "fs/promises";
import path from "path";
import { fetchStoredPdf } from "@/lib/storage";
import type { CompletedFieldValue, DocumentBlock, DocumentRecord, FieldDraft, FieldType, PageMargins, PageSize, TextSegment } from "@/lib/types";
import { getPdfFieldRect } from "@/lib/field-rendering";

export const PAGE_SIZES: Record<PageSize, { width: number; height: number; label: string }> = {
  a4: { width: 595, height: 842, label: "A4" },
  letter: { width: 612, height: 792, label: "US Letter" },
  legal: { width: 612, height: 1008, label: "US Legal" },
  a5: { width: 420, height: 595, label: "A5" },
};

const fontMap = {
  Helvetica: {
    normal: StandardFonts.Helvetica,
    bold: StandardFonts.HelveticaBold,
    italic: StandardFonts.HelveticaOblique,
    boldItalic: StandardFonts.HelveticaBoldOblique,
  },
  TimesRoman: {
    normal: StandardFonts.TimesRoman,
    bold: StandardFonts.TimesRomanBold,
    italic: StandardFonts.TimesRomanItalic,
    boldItalic: StandardFonts.TimesRomanBoldItalic,
  },
  Courier: {
    normal: StandardFonts.Courier,
    bold: StandardFonts.CourierBold,
    italic: StandardFonts.CourierOblique,
    boldItalic: StandardFonts.CourierBoldOblique,
  },
} as const;

// Serif Google Fonts → TimesRoman; monospace → Courier; everything else → Helvetica
const SERIF_FONTS = new Set([
  "Playfair Display","Merriweather","Libre Baskerville","EB Garamond",
  "Cormorant Garamond","Lora","PT Serif","Crimson Text","Bitter",
  "DM Serif Display","Spectral","Noto Serif","Alegreya","Domine",
]);
const MONO_FONTS = new Set([
  "Space Mono","Fira Code","Source Code Pro","IBM Plex Mono",
  "Roboto Mono","JetBrains Mono","Courier Prime",
]);

function fontFamilyCategory(family?: string): "serif" | "mono" | "sans" {
  if (!family) return "sans";
  if (SERIF_FONTS.has(family)) return "serif";
  if (MONO_FONTS.has(family)) return "mono";
  return "sans";
}

type SegmentWord = {
  text: string;
  bold: boolean;
  italic: boolean;
  underline?: boolean;
  color?: string;
  fontSize?: number;
  fontFamily?: string;
};

function segmentsToWords(segments: TextSegment[]): SegmentWord[] {
  const words: SegmentWord[] = [];
  for (const seg of segments) {
    const parts = seg.text.split(/(\s+)/);
    for (const part of parts) {
      if (part) words.push({
        text: part,
        bold: seg.bold ?? false,
        italic: seg.italic ?? false,
        underline: seg.underline,
        color: seg.color,
        fontSize: seg.fontSize,
        fontFamily: seg.fontFamily,
      });
    }
  }
  return words;
}

function pickFont(
  w: SegmentWord,
  fonts: { sans: PDFFont; sansBold: PDFFont; sansItalic: PDFFont; serif: PDFFont; serifBold: PDFFont; serifItalic: PDFFont; mono: PDFFont; monoBold: PDFFont }
): PDFFont {
  const cat = fontFamilyCategory(w.fontFamily);
  if (cat === "serif") return w.bold ? fonts.serifBold : w.italic ? fonts.serifItalic : fonts.serif;
  if (cat === "mono") return w.bold ? fonts.monoBold : fonts.mono;
  return w.bold ? fonts.sansBold : w.italic ? fonts.sansItalic : fonts.sans;
}

type FontSet = {
  sans: PDFFont; sansBold: PDFFont; sansItalic: PDFFont;
  serif: PDFFont; serifBold: PDFFont; serifItalic: PDFFont;
  mono: PDFFont; monoBold: PDFFont;
};

function buildLines(words: SegmentWord[], fonts: FontSet, fSize: number, maxWidth: number): SegmentWord[][] {
  const lines: SegmentWord[][] = [];
  let curLine: SegmentWord[] = [];
  let curWidth = 0;
  for (const w of words) {
    const font = pickFont(w, fonts);
    const wWidth = font.widthOfTextAtSize(w.text, w.fontSize ?? fSize);
    if (curWidth + wWidth > maxWidth && curLine.length > 0 && /\S/.test(w.text)) {
      lines.push(curLine);
      curLine = [w];
      curWidth = wWidth;
    } else {
      curLine.push(w);
      curWidth += wWidth;
    }
  }
  if (curLine.length > 0) lines.push(curLine);
  return lines.length ? lines : [[]];
}

function calcLineWidth(lineWords: SegmentWord[], fonts: FontSet, fSize: number): number {
  return lineWords.reduce((sum, w) => sum + pickFont(w, fonts).widthOfTextAtSize(w.text, w.fontSize ?? fSize), 0);
}

function drawSegmentLine(
  page: PDFPage,
  lineWords: SegmentWord[],
  x: number,
  y: number,
  fSize: number,
  fonts: FontSet,
  defaultColor: Color,
  align: "left" | "center" | "right" | "justify" | undefined,
  maxW: number
) {
  let startX = x;
  if (align === "center") startX = x + (maxW - calcLineWidth(lineWords, fonts, fSize)) / 2;
  else if (align === "right") startX = x + maxW - calcLineWidth(lineWords, fonts, fSize);

  let curX = startX;
  for (const w of lineWords) {
    const font = pickFont(w, fonts);
    const wSize = w.fontSize ?? fSize;
    const color = w.color ? hexToRgb(w.color) : defaultColor;
    const ww = font.widthOfTextAtSize(w.text, wSize);
    if (w.text.trim()) {
      page.drawText(w.text, { x: curX, y, size: wSize, font, color });
      if (w.underline) {
        page.drawLine({ start: { x: curX, y: y - 1.5 }, end: { x: curX + ww, y: y - 1.5 }, thickness: 0.75, color });
      }
    }
    curX += ww;
  }
}

const BRAND = {
  ink: rgb(0.16, 0.15, 0.15),
  coral: rgb(0.91, 0.59, 0.48),
  sand: rgb(0.99, 0.98, 0.95),
  muted: rgb(0.45, 0.50, 0.56),
  line: rgb(0.86, 0.82, 0.76)
};

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized, 16);
  return rgb(((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255);
}

function formatTimestamp(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-US", {
      year: "numeric", month: "long", day: "numeric",
      hour: "2-digit", minute: "2-digit", timeZone: "UTC", timeZoneName: "short"
    });
  } catch {
    return iso;
  }
}

const fieldLabelMap: Record<string, string> = {
  signature: "Signature",
  initials: "Initials",
  "date-signed": "Date Signed",
  "full-name": "Full Name",
  email: "Email Address",
  company: "Company",
  "job-title": "Title",
  text: "Text",
  date: "Date",
  checkbox: "Checkbox",
  dropdown: "Dropdown",
  radio: "Radio"
};

async function addCertificatePage(
  pdf: PDFDocument,
  document: DocumentRecord,
  signerName: string,
  completedAt: string,
  meta?: { signerIp?: string; userAgent?: string; senderIp?: string }
) {
  const page = pdf.addPage([595, 842]);
  const { width, height } = page.getSize();

  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const ink = rgb(0.06, 0.09, 0.16);
  const muted = rgb(0.45, 0.50, 0.56);
  const subtle = rgb(0.82, 0.85, 0.89);
  const white = rgb(1, 1, 1);

  page.drawRectangle({ x: 0, y: 0, width, height, color: BRAND.sand });
  page.drawRectangle({ x: 0, y: height - 84, width, height: 84, color: BRAND.ink });

  try {
    const logoBytes = await readFile(path.join(process.cwd(), "public", "Favicon.png"));
    const logo = await pdf.embedPng(logoBytes);
    page.drawImage(logo, { x: 48, y: height - 60, width: 31, height: 32 });
    page.drawText("Tord Sign", { x: 88, y: height - 44, size: 19, font: bold, color: white });
  } catch {
    page.drawText("Tord Sign", { x: 48, y: height - 44, size: 22, font: bold, color: white });
  }

  const certLabel = "CERTIFICATE OF COMPLETION";
  const certLabelWidth = regular.widthOfTextAtSize(certLabel, 9);
  page.drawText(certLabel, {
    x: width - 48 - certLabelWidth, y: height - 44,
    size: 9, font: regular, color: rgb(0.6, 0.65, 0.72)
  });

  page.drawRectangle({ x: 0, y: height - 88, width, height: 4, color: BRAND.coral });

  let y = height - 120;

  const titleLines = document.title.length > 55
    ? [document.title.slice(0, 55), document.title.slice(55)]
    : [document.title];
  for (const line of titleLines) {
    page.drawText(line, { x: 48, y, size: 20, font: bold, color: ink });
    y -= 26;
  }
  y -= 10;

  page.drawLine({ start: { x: 48, y }, end: { x: width - 48, y }, thickness: 1, color: subtle });
  y -= 30;

  function drawSection(title: string) {
    page.drawText(title, { x: 48, y, size: 8, font: bold, color: BRAND.coral });
    y -= 18;
  }

  function drawRow(label: string, value: string) {
    page.drawText(label, { x: 48, y, size: 9, font: regular, color: muted });
    const valueX = 200;
    const maxWidth = width - 48 - valueX;
    let displayValue = value;
    while (displayValue.length > 4 && bold.widthOfTextAtSize(displayValue, 10) > maxWidth) {
      displayValue = displayValue.slice(0, -1);
    }
    if (displayValue !== value) displayValue += "...";
    page.drawText(displayValue, { x: valueX, y, size: 10, font: bold, color: ink });
    y -= 20;
  }

  drawSection("DOCUMENT INFORMATION");
  drawRow("Document Title", document.title);
  drawRow("Document ID", document.id);
  drawRow("Completed", formatTimestamp(completedAt));
  y -= 8;

  page.drawLine({ start: { x: 48, y }, end: { x: width - 48, y }, thickness: 0.5, color: subtle });
  y -= 20;

  drawSection("PARTIES");
  drawRow("Sender Name", document.sender_name);
  drawRow("Sender Email", document.sender_email);
  if (meta?.senderIp) drawRow("Sender IP", meta.senderIp);
  drawRow("Recipient Name", signerName);
  if (document.recipient_email) drawRow("Recipient Email", document.recipient_email);
  if (meta?.signerIp) drawRow("Recipient IP", meta.signerIp);
  if (meta?.userAgent) drawRow("User Agent", meta.userAgent.slice(0, 80));
  y -= 8;

  page.drawLine({ start: { x: 48, y }, end: { x: width - 48, y }, thickness: 0.5, color: subtle });
  y -= 20;

  drawSection("AUDIT TRAIL");

  const auditRows = [
    ...document.audit_trail,
    { action: "completed", actorEmail: document.recipient_email ?? signerName, timestamp: completedAt }
  ];

  for (const event of auditRows) {
    if (y < 120) break;
    const ts = formatTimestamp(event.timestamp);
    const action = event.action.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    page.drawText(ts, { x: 48, y, size: 9, font: regular, color: muted });
    page.drawText(action, { x: 230, y, size: 9, font: bold, color: ink });
    page.drawText(event.actorEmail, { x: 360, y, size: 9, font: regular, color: muted, maxWidth: width - 48 - 360 });
    y -= 16;
  }

  page.drawRectangle({ x: 0, y: 0, width, height: 64, color: BRAND.ink });
  page.drawText("This certificate is automatically generated by Tord Sign.", {
    x: 48, y: 38, size: 9, font: regular, color: rgb(0.6, 0.65, 0.72)
  });
  page.drawText("The document was electronically signed. This record constitutes a legally binding digital signature.", {
    x: 48, y: 22, size: 9, font: regular, color: rgb(0.4, 0.45, 0.52)
  });
  page.drawRectangle({ x: 0, y: 64, width, height: 3, color: BRAND.coral });
}

export async function renderCompletedPdf(
  document: DocumentRecord,
  fieldValues: CompletedFieldValue[],
  meta?: { signerName?: string; completedAt?: string; signerIp?: string; userAgent?: string }
) {
  const bytes = await fetchStoredPdf(document.source_pdf_path);
  const pdf = await PDFDocument.load(bytes);
  const embeddedFonts = new Map<string, Awaited<ReturnType<typeof pdf.embedFont>>>();

  for (const field of document.fields) {
    const page = pdf.getPage(field.pageNumber - 1);
    const pageWidth = page.getWidth();
    const pageHeight = page.getHeight();
    const value = fieldValues.find((e) => e.fieldId === field.id)?.value ?? field.value ?? "";

    if (!value) continue;

    const { left: x, top: y, width: w, height: h } = getPdfFieldRect(field, pageWidth, pageHeight);

    // Image-based fields
    if (field.type === "signature" || field.type === "initials") {
      try {
        const dataUrl = value;
        const base64 = dataUrl.split(",")[1] ?? "";
        const imgBytes = Uint8Array.from(Buffer.from(base64, "base64"));
        let image;
        if (dataUrl.startsWith("data:image/png")) {
          image = await pdf.embedPng(imgBytes);
        } else {
          image = await pdf.embedJpg(imgBytes);
        }
        page.drawImage(image, { x, y, width: w, height: h });
      } catch {
        // skip malformed image
      }
      continue;
    }

    // Checkbox
    if (field.type === "checkbox") {
      const s = Math.min(w, h);
      page.drawRectangle({
        x, y, width: s, height: s,
        borderColor: rgb(0.2, 0.2, 0.2),
        borderWidth: 1
      });
      if (value === "true") {
        const pad = s * 0.2;
        page.drawLine({
          start: { x: x + pad, y: y + s * 0.48 },
          end: { x: x + s * 0.38, y: y + pad },
          thickness: 1.5, color: rgb(0.07, 0.55, 0.48)
        });
        page.drawLine({
          start: { x: x + s * 0.38, y: y + pad },
          end: { x: x + s - pad, y: y + s - pad },
          thickness: 1.5, color: rgb(0.07, 0.55, 0.48)
        });
      }
      continue;
    }

    // Text-based fields
    const fontKey = `${field.fontFamily}-${field.fontWeight}`;
    let font = embeddedFonts.get(fontKey);
    if (!font) {
      font = await pdf.embedFont(fontMap[field.fontFamily][field.fontWeight]);
      embeddedFonts.set(fontKey, font);
    }

    const fontSize = field.fontSize;
    page.drawText(value, {
      x: x + 4,
      y: y + Math.max(2, (h - fontSize) / 2 + fontSize * 0.15),
      size: fontSize,
      font,
      color: hexToRgb(field.textColor),
      maxWidth: w - 8
    });
  }

  // Render image fields (type "image")
  for (const field of document.fields) {
    if (field.type !== "image") continue;
    const value = fieldValues.find(e => e.fieldId === field.id)?.value ?? field.value ?? "";
    const imageDataUrl = value || field.value;
    if (!imageDataUrl || !imageDataUrl.startsWith("data:image/")) continue;
    try {
      const page = pdf.getPage(field.pageNumber - 1);
      const pageWidth = page.getWidth();
      const pageHeight = page.getHeight();
      const { left: x, top: y, width: w, height: h } = getPdfFieldRect(field, pageWidth, pageHeight);
      const base64 = imageDataUrl.split(",")[1] ?? "";
      const imgBytes = Uint8Array.from(Buffer.from(base64, "base64"));
      let image;
      if (imageDataUrl.startsWith("data:image/png")) {
        image = await pdf.embedPng(imgBytes);
      } else {
        image = await pdf.embedJpg(imgBytes);
      }
      page.drawImage(image, { x, y, width: w, height: h });
    } catch {
      // skip malformed image
    }
  }

  const signerName = meta?.signerName ?? document.recipient_name ?? "Signer";
  const completedAt = meta?.completedAt ?? new Date().toISOString();
  const senderIp = document.audit_trail
    .find((e) => e.action === "sent" && e.metadata?.senderIp)
    ?.metadata?.senderIp;
  await addCertificatePage(pdf, document, signerName, completedAt, {
    signerIp: meta?.signerIp,
    userAgent: meta?.userAgent,
    senderIp,
  });

  return pdf.save();
}

// ─── Block-to-PDF renderer (for "Create new document" flow) ───────────────────

function wrapText(
  text: string,
  widthFn: (s: string) => number,
  maxWidth: number
): string[] {
  if (!text.trim()) return [""];
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const word of words) {
    const test = cur ? `${cur} ${word}` : word;
    if (widthFn(test) > maxWidth && cur) {
      lines.push(cur);
      cur = word;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

type BlockField = Omit<FieldDraft, "recipientEmail" | "value">;

export async function renderBlocksToPdf(
  blocks: DocumentBlock[],
  title: string,
  pageSize: PageSize = "a4",
  pageMargins: PageMargins = { top: 80, right: 72, bottom: 80, left: 72 }
): Promise<{ pdfBytes: Uint8Array; fields: BlockField[] }> {
  const pageDims = PAGE_SIZES[pageSize];
  const PAGE_W = pageDims.width;
  const PAGE_H = pageDims.height;
  const MARGIN_L = pageMargins.left;
  const MARGIN_R = pageMargins.right;
  const MARGIN_T = pageMargins.top;
  const MARGIN_B = pageMargins.bottom;
  const TEXT_W = PAGE_W - MARGIN_L - MARGIN_R;

  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);
  const fonts: FontSet = {
    sans: regular,
    sansBold: bold,
    sansItalic: italic,
    serif: await pdf.embedFont(StandardFonts.TimesRoman),
    serifBold: await pdf.embedFont(StandardFonts.TimesRomanBold),
    serifItalic: await pdf.embedFont(StandardFonts.TimesRomanItalic),
    mono: await pdf.embedFont(StandardFonts.Courier),
    monoBold: await pdf.embedFont(StandardFonts.CourierBold),
  };

  const INK = rgb(0.06, 0.09, 0.16);

  let page = pdf.addPage([PAGE_W, PAGE_H]);
  let pageNum = 1;
  let drawY = PAGE_H - MARGIN_T;

  function ensureSpace(needed: number) {
    if (drawY - needed < MARGIN_B) {
      page = pdf.addPage([PAGE_W, PAGE_H]);
      pageNum++;
      drawY = PAGE_H - MARGIN_T;
    }
  }

  const fields: BlockField[] = [];

  for (const block of blocks) {
    if (block.type === "pageBreak") {
      page = pdf.addPage([PAGE_W, PAGE_H]);
      pageNum++;
      drawY = PAGE_H - MARGIN_T;
      continue;
    }

    if (block.type === "divider") {
      ensureSpace(24);
      drawY -= 12;
      page.drawLine({
        start: { x: MARGIN_L, y: drawY },
        end: { x: PAGE_W - MARGIN_R, y: drawY },
        thickness: 0.75,
        color: rgb(0.82, 0.85, 0.89)
      });
      drawY -= 12;
      continue;
    }

    if (block.type === "field") {
      const fType = (block.fieldType ?? "text") as FieldType;
      const isImg = fType === "signature" || fType === "initials";
      const fieldH =
        fType === "signature" ? 52 :
        fType === "initials" ? 36 :
        fType === "checkbox" ? 20 :
        fType === "radio" ? 60 : 28;
      const fieldW =
        fType === "signature" ? TEXT_W * 0.7 :
        fType === "initials" ? TEXT_W * 0.3 :
        fType === "checkbox" ? 20 :
        TEXT_W * 0.7;

      ensureSpace(fieldH + 12);
      drawY -= fieldH;

      const label = block.fieldLabel ?? fieldLabelMap[fType] ?? fType;

      fields.push({
        id: crypto.randomUUID(),
        type: fType,
        pageNumber: pageNum,
        x: MARGIN_L / PAGE_W,
        y: (PAGE_H - drawY - fieldH) / PAGE_H,
        width: fieldW / PAGE_W,
        height: fieldH / PAGE_H,
        required: fType !== "checkbox",
        placeholder: label,
        fontFamily: "Helvetica",
        fontSize: 12,
        fontWeight: "normal",
        textColor: "#0f172a",
        options: block.fieldOptions?.length ? block.fieldOptions : undefined
      });

      drawY -= 8;
      continue;
    }

    if (block.type === "checkboxItem") {
      const text = block.content || "";
      const BOX = 11;
      const fSize = 11;
      const lh = 18;
      const indent = BOX + 8;
      const maxW = TEXT_W - indent;
      const wrappedLines = wrapText(text, (s) => regular.widthOfTextAtSize(s, fSize), maxW);
      const blockH = wrappedLines.length * lh + 4;
      ensureSpace(blockH);

      // Draw the unchecked box
      drawY -= lh;
      const boxY = drawY + (lh - BOX) * 0.5;
      page.drawRectangle({
        x: MARGIN_L, y: boxY,
        width: BOX, height: BOX,
        borderColor: rgb(0.58, 0.64, 0.69),
        borderWidth: 1.5,
      });

      if (wrappedLines[0]?.trim()) {
        page.drawText(wrappedLines[0], {
          x: MARGIN_L + indent, y: drawY + lh * 0.2,
          size: fSize, font: regular, color: INK,
        });
      }
      for (let i = 1; i < wrappedLines.length; i++) {
        drawY -= lh;
        if (wrappedLines[i]?.trim()) {
          page.drawText(wrappedLines[i], {
            x: MARGIN_L + indent, y: drawY + lh * 0.2,
            size: fSize, font: regular, color: INK,
          });
        }
      }

      drawY -= 4;
      continue;
    }

    if (block.type === "radioGroup") {
      const options = block.fieldOptions ?? ["Option 1", "Option 2", "Option 3"];
      const label = block.content || "Radio group";
      const fSize = 11;
      const lh = 18;
      const CIRCLE_R = 4.5;
      const headerH = lh + 4;
      const optionsH = options.length * lh;
      ensureSpace(headerH + optionsH + 8);

      // Group label
      drawY -= lh;
      page.drawText(label, {
        x: MARGIN_L, y: drawY + lh * 0.2,
        size: 10, font: bold, color: INK,
      });
      drawY -= 4;

      const groupTopY = drawY;
      const optionYPositions: number[] = [];

      for (const opt of options) {
        drawY -= lh;
        const cy = drawY + lh * 0.5;
        optionYPositions.push(drawY);
        // Radio circle (outer ring)
        page.drawCircle({
          x: MARGIN_L + CIRCLE_R, y: cy,
          size: CIRCLE_R,
          borderColor: rgb(0.58, 0.64, 0.69),
          borderWidth: 1.5,
        });
        if (opt.trim()) {
          page.drawText(opt, {
            x: MARGIN_L + CIRCLE_R * 2 + 6, y: drawY + lh * 0.2,
            size: fSize, font: regular, color: INK,
          });
        }
      }

      drawY -= 8;
      continue;
    }

    if (block.type === "image") {
      const src = block.content;
      if (!src || !src.startsWith("data:image/")) { drawY -= 4; continue; }
      try {
        const base64 = src.split(",")[1] ?? "";
        const imgBytes = Uint8Array.from(Buffer.from(base64, "base64"));
        let image;
        if (src.startsWith("data:image/png")) {
          image = await pdf.embedPng(imgBytes);
        } else {
          image = await pdf.embedJpg(imgBytes);
        }
        const dims = image.scale(1);
        const maxImgW = block.imageWidthPct ? TEXT_W * (block.imageWidthPct / 100) : TEXT_W;
        const maxImgH = PAGE_H * 0.5;
        let imgW = Math.min(dims.width, maxImgW);
        let imgH = dims.height * (imgW / dims.width);
        if (imgH > maxImgH) { imgW *= maxImgH / imgH; imgH = maxImgH; }
        ensureSpace(imgH + 12);
        drawY -= imgH;
        page.drawImage(image, { x: MARGIN_L, y: drawY, width: imgW, height: imgH });
        drawY -= 12;
      } catch { drawY -= 4; }
      continue;
    }

    // Text blocks
    const text = block.content || "";
    let fSize: number, blockFont: typeof regular, lh: number, indent: number, topPad: number;
    const isHeading = block.type === "heading1" || block.type === "heading2" || block.type === "heading3";

    if (block.type === "heading1") {
      fSize = 20; blockFont = bold; lh = 28; indent = 0; topPad = 12;
    } else if (block.type === "heading2") {
      fSize = 15; blockFont = bold; lh = 22; indent = 0; topPad = 8;
    } else if (block.type === "heading3") {
      fSize = 12; blockFont = bold; lh = 18; indent = 0; topPad = 6;
    } else if (block.type === "bullet") {
      fSize = 11; blockFont = regular; lh = 18; indent = 14; topPad = 0;
    } else if (block.type === "numbered") {
      fSize = 11; blockFont = regular; lh = 18; indent = 18; topPad = 0;
    } else if (block.type === "quote") {
      fSize = 11; blockFont = italic; lh = 18; indent = 16; topPad = 4;
    } else {
      fSize = 11; blockFont = regular; lh = 18; indent = 0; topPad = 0;
    }

    const maxW = TEXT_W - indent;
    const textColor = block.textColor ? hexToRgb(block.textColor) : INK;
    const align = block.textAlign;
    const prefix = block.type === "bullet" ? "• " : block.type === "numbered" ? "1. " : "";

    // Use segments for inline formatting when available (Tiptap output)
    const hasSegments = !isHeading && block.segments && block.segments.length > 0;
    let allSegmentLines: SegmentWord[][] = [];
    let allPlainLines: string[] = [];

    if (hasSegments) {
      const prefixWords: SegmentWord[] = prefix
        ? [{ text: prefix, bold: false, italic: false }]
        : [];
      const words = [...prefixWords, ...segmentsToWords(block.segments!)];
      allSegmentLines = buildLines(words, fonts, fSize, maxW);
    } else {
      const rawLines = (text || " ").split("\n");
      for (const raw of rawLines) {
        const wrapped = wrapText(prefix + (raw || " "), (s) => blockFont.widthOfTextAtSize(s, fSize), maxW);
        allPlainLines.push(...wrapped);
      }
    }

    const lineCount = hasSegments ? allSegmentLines.length : allPlainLines.length;
    const blockH = topPad + lineCount * lh + 6;
    ensureSpace(blockH);

    if (topPad) drawY -= topPad;
    const blockTop = drawY;
    const blockBottom = drawY - lineCount * lh - 2;

    if (block.highlighted || block.backgroundColor) {
      page.drawRectangle({
        x: MARGIN_L - 6, y: blockBottom,
        width: TEXT_W + 12, height: blockTop - blockBottom + 4,
        color: block.backgroundColor ? hexToRgb(block.backgroundColor) : rgb(1, 0.94, 0.76)
      });
    }
    if (block.type === "quote") {
      page.drawLine({
        start: { x: MARGIN_L, y: blockTop + 2 },
        end: { x: MARGIN_L, y: blockBottom },
        thickness: 2, color: BRAND.coral
      });
    }

    if (hasSegments) {
      for (const lineWords of allSegmentLines) {
        drawY -= lh;
        drawSegmentLine(page, lineWords, MARGIN_L + indent, drawY + lh * 0.2, fSize, fonts, textColor, align, maxW);
      }
    } else {
      for (const line of allPlainLines) {
        drawY -= lh;
        if (line.trim()) {
          let drawX = MARGIN_L + indent;
          if (align === "center") {
            const w = blockFont.widthOfTextAtSize(line, fSize);
            drawX = MARGIN_L + indent + (maxW - w) / 2;
          } else if (align === "right") {
            const w = blockFont.widthOfTextAtSize(line, fSize);
            drawX = MARGIN_L + indent + maxW - w;
          }
          page.drawText(line, { x: drawX, y: drawY + lh * 0.2, size: fSize, font: blockFont, color: textColor });
        }
      }
    }

    drawY -= 6;
  }

  return { pdfBytes: await pdf.save(), fields };
}

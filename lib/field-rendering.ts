import type { FieldDraft } from "@/lib/types";

export type PageDimensions = {
  width: number;
  height: number;
};

export type FieldRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export function getFieldRect(field: FieldDraft, pageWidth: number, pageHeight: number): FieldRect {
  return {
    left: field.x * pageWidth,
    top: field.y * pageHeight,
    width: field.width * pageWidth,
    height: field.height * pageHeight
  };
}

export function getPdfFieldRect(field: FieldDraft, pageWidth: number, pageHeight: number): FieldRect {
  const rect = getFieldRect(field, pageWidth, pageHeight);

  return {
    ...rect,
    top: pageHeight - rect.top - rect.height
  };
}

export function getPageScale(displayedPageWidth: number, originalPageWidth?: number) {
  if (!originalPageWidth || originalPageWidth <= 0) return 1;
  return displayedPageWidth / originalPageWidth;
}

export function getScaledPageDimensions(originalPage: PageDimensions, displayedPageWidth: number): PageDimensions {
  const scale = getPageScale(displayedPageWidth, originalPage.width);

  return {
    width: displayedPageWidth,
    height: originalPage.height * scale
  };
}

export function getScaledFontSize(field: Pick<FieldDraft, "fontSize">, displayScale: number) {
  return field.fontSize * displayScale;
}

export function getScaledFieldPadding(displayScale: number) {
  return {
    x: 4 * displayScale,
    y: 2 * displayScale
  };
}

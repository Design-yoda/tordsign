"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, LoaderCircle, Minus, PenLine, Plus } from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import type { FieldDraft } from "@/lib/types";
import { SignatureModal } from "@/components/signature-modal";
import { cn } from "@/lib/utils";
import {
  getFieldRect,
  getPageScale,
  getScaledFieldPadding,
  getScaledFontSize,
  getScaledPageDimensions,
  type PageDimensions
} from "@/lib/field-rendering";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

export function SigningDocumentView({
  documentId,
  fields,
  values,
  onValueChange
}: {
  documentId: string;
  fields: FieldDraft[];
  values: Record<string, string>;
  onValueChange: (fieldId: string, value: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const [pageWidth, setPageWidth] = useState(0);
  const [pageSizes, setPageSizes] = useState<Record<number, PageDimensions>>({});
  const [numPages, setNumPages] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const [signatureModal, setSignatureModal] = useState<{ fieldId: string; isInitials: boolean } | null>(null);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const editValueRef = useRef("");

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => {
      const horizontalPadding = window.matchMedia("(min-width: 640px)").matches ? 32 : 16;
      setPageWidth(Math.max(1, el.clientWidth - horizontalPadding));
    };
    update();
    const obs = new ResizeObserver(update);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  function rememberPageDimensions(
    pageNumber: number,
    page: { getViewport: (options: { scale: number }) => PageDimensions }
  ) {
    const viewport = page.getViewport({ scale: 1 });
    setPageSizes((current) => {
      const existing = current[pageNumber];
      if (existing?.width === viewport.width && existing.height === viewport.height) return current;
      return {
        ...current,
        [pageNumber]: { width: viewport.width, height: viewport.height }
      };
    });
  }

  useEffect(() => {
    const root = scrollRef.current;
    if (!root || numPages === 0) return;
    const update = () => {
      let next = 1;
      let nearest = Infinity;
      const rootTop = root.getBoundingClientRect().top;
      for (let p = 1; p <= numPages; p++) {
        const el = pageRefs.current[p];
        if (!el) continue;
        const offset = Math.abs(el.getBoundingClientRect().top - rootTop - 24);
        if (offset < nearest) { nearest = offset; next = p; }
      }
      setCurrentPage(next);
    };
    update();
    root.addEventListener("scroll", update, { passive: true });
    return () => root.removeEventListener("scroll", update);
  }, [numPages]);

  function commitEdit() {
    if (editingFieldId) {
      onValueChange(editingFieldId, editValueRef.current);
      setEditingFieldId(null);
    }
  }

  function handleFieldClick(field: FieldDraft) {
    if (editingFieldId && editingFieldId !== field.id) {
      onValueChange(editingFieldId, editValueRef.current);
      setEditingFieldId(null);
    }

    if (field.type === "signature" || field.type === "initials") {
      setSignatureModal({ fieldId: field.id, isInitials: field.type === "initials" });
      return;
    }

    if (field.type === "checkbox") {
      const current = values[field.id] ?? "";
      onValueChange(field.id, current === "true" ? "" : "true");
      return;
    }

    // All other text-input types
    const current = values[field.id] ?? "";
    editValueRef.current = current;
    setEditValue(current);
    setEditingFieldId(field.id);
  }

  function scrollToPage(dir: -1 | 1) {
    const next = Math.min(Math.max(currentPage + dir, 1), numPages || 1);
    pageRefs.current[next]?.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  function fontFamilyStr(ff: FieldDraft["fontFamily"]) {
    if (ff === "TimesRoman") return "serif";
    if (ff === "Courier") return "monospace";
    return "sans-serif";
  }

  function inputTypeFor(field: FieldDraft): string {
    if (field.type === "date" || field.type === "date-signed") return "date";
    if (field.type === "email") return "email";
    return "text";
  }

  return (
    <div className="rounded-[28px] border bg-white p-4 shadow-card">
      {/* Controls */}
      <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
        <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 p-1">
          <button
            type="button"
            onClick={() => setZoom((v) => Math.max(0.6, Number((v - 0.1).toFixed(2))))}
            className="rounded-full p-2 text-slate-700 transition hover:bg-white"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="min-w-16 px-2 text-center text-sm font-medium text-slate-700">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((v) => Math.min(2, Number((v + 0.1).toFixed(2))))}
            className="rounded-full p-2 text-slate-700 transition hover:bg-white"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 p-1">
          <button
            type="button"
            onClick={() => scrollToPage(-1)}
            disabled={currentPage <= 1}
            className="rounded-full p-2 text-slate-700 transition hover:bg-white disabled:text-slate-300"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <span className="min-w-24 px-2 text-center text-sm font-medium text-slate-700">
            Page {currentPage}/{numPages || 1}
          </span>
          <button
            type="button"
            onClick={() => scrollToPage(1)}
            disabled={numPages === 0 || currentPage >= numPages}
            className="rounded-full p-2 text-slate-700 transition hover:bg-white disabled:text-slate-300"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* PDF canvas */}
      <div
        ref={scrollRef}
        className="h-[78vh] min-h-[520px] overflow-auto rounded-[24px] bg-slate-100 p-2 sm:min-h-[720px] sm:p-4"
      >
        <Document
          file={`/api/documents/${documentId}/source`}
          loading={
            <div className="flex h-64 items-center justify-center text-slate-500">
              <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
              Loading document...
            </div>
          }
          onLoadSuccess={({ numPages: n }) => {
            setNumPages(n);
            setIsLoaded(true);
            setLoadError(null);
          }}
          onLoadError={(e) => {
            setLoadError(e.message);
            setIsLoaded(false);
          }}
        >
          {loadError ? (
            <div className="rounded-3xl border border-rose-200 bg-rose-50 px-6 py-5 text-sm text-rose-700">
              Unable to load document. {loadError}
            </div>
          ) : null}

          {Array.from({ length: numPages }, (_, i) => {
            const pageNumber = i + 1;
            const displayWidth = Math.max(1, pageWidth * zoom);
            const originalPage = pageSizes[pageNumber];
            const displayScale = getPageScale(displayWidth, originalPage?.width);
            const displayPage = originalPage
              ? getScaledPageDimensions(originalPage, displayWidth)
              : { width: displayWidth, height: 0 };

            return (
              <div
                key={pageNumber}
                ref={(node) => { pageRefs.current[pageNumber] = node; }}
                className="relative mx-auto mb-6 overflow-hidden rounded-[20px] bg-white shadow-sm"
                style={originalPage ? { width: displayPage.width, height: displayPage.height } : undefined}
              >
                <Page
                  pageNumber={pageNumber}
                  width={displayWidth}
                  renderAnnotationLayer={false}
                  renderTextLayer={false}
                  loading={null}
                  onLoadSuccess={(page) => rememberPageDimensions(pageNumber, page)}
                />

                <div className="pointer-events-none absolute inset-0 z-10">
                  {fields
                    .filter((f) => f.pageNumber === pageNumber)
                    .map((field) => {
                      const value = values[field.id] ?? "";
                      const isFilled = !!value;
                      const isSignature = field.type === "signature" || field.type === "initials";
                      const isEditing = editingFieldId === field.id;
                      const isCheckbox = field.type === "checkbox";
                      const isDropdown = field.type === "dropdown";
                      const isRadio = field.type === "radio";
                      const rect = originalPage
                        ? getFieldRect(field, displayPage.width, displayPage.height)
                        : null;
                      const padding = getScaledFieldPadding(displayScale);

                      const textStyle = {
                        color: field.textColor,
                        fontSize: `${getScaledFontSize(field, displayScale)}px`,
                        fontWeight: field.fontWeight === "bold" ? 700 : 400,
                        fontFamily: fontFamilyStr(field.fontFamily)
                      };
                      const contentPadding = {
                        paddingInline: `${padding.x}px`,
                        paddingBlock: `${padding.y}px`
                      };
                      const checkboxSize = `${Math.min(rect?.width ?? 20, rect?.height ?? 20)}px`;

                      return (
                        <div
                          key={field.id}
                          onClick={() => { if (!isEditing) handleFieldClick(field); }}
                          className={cn(
                            "pointer-events-auto absolute rounded-[6px] border-2 transition",
                            isEditing
                              ? "cursor-text border-solid border-ink bg-white/20"
                              : isFilled
                                ? "cursor-pointer border-solid border-teal-500 bg-teal-50/50"
                                : isSignature
                                  ? "cursor-pointer border-dashed border-amber-400 bg-amber-50/70 hover:bg-amber-100/70"
                                  : field.required
                                    ? "cursor-pointer border-dashed border-amber-400 bg-amber-50/50 hover:bg-amber-100/50"
                                    : "cursor-pointer border-dashed border-slate-300 bg-slate-50/50 hover:bg-slate-100/50"
                          )}
                          style={{
                            left: rect ? `${rect.left}px` : `${field.x * 100}%`,
                            top: rect ? `${rect.top}px` : `${field.y * 100}%`,
                            width: rect ? `${rect.width}px` : `${field.width * 100}%`,
                            height: rect ? `${rect.height}px` : `${field.height * 100}%`
                          }}
                        >
                          <div className="relative h-full w-full overflow-hidden rounded-[6px]">
                            {isSignature ? (
                              isFilled ? (
                                <div className="flex h-full w-full items-center justify-center">
                                  <img
                                    src={value}
                                    alt={field.type === "initials" ? "Initials" : "Signature"}
                                    className="max-h-full max-w-full object-contain"
                                    draggable={false}
                                  />
                                </div>
                              ) : (
                                <div className="flex h-full w-full items-center justify-center gap-1.5">
                                  <PenLine
                                    className="shrink-0 text-amber-600"
                                    style={{ width: 14 * displayScale, height: 14 * displayScale }}
                                  />
                                  <span className="font-semibold text-amber-700" style={textStyle}>
                                    {field.type === "initials" ? "Click to add initials" : "Click to sign"}
                                  </span>
                                </div>
                              )
                            ) : isCheckbox ? (
                              <div
                                onClick={(e) => { e.stopPropagation(); handleFieldClick(field); }}
                                className="pointer-events-auto flex h-full w-full cursor-pointer items-center justify-center"
                              >
                                <div className={cn(
                                  "flex items-center justify-center rounded border-2 transition",
                                  value === "true"
                                    ? "border-teal-500 bg-teal-500"
                                    : "border-amber-400 bg-white hover:border-teal-400"
                                )}
                                  style={{ width: checkboxSize, height: checkboxSize }}
                                >
                                  {value === "true" && (
                                    <svg viewBox="0 0 10 8" className="h-3 w-3" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M1 4l3 3 5-6" />
                                    </svg>
                                  )}
                                </div>
                              </div>
                            ) : isDropdown ? (
                              <select
                                value={value}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  onValueChange(field.id, e.target.value);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="pointer-events-auto h-full w-full cursor-pointer bg-transparent outline-none"
                                style={{ ...textStyle, ...contentPadding }}
                              >
                                <option value="">Select…</option>
                                {(field.options ?? ["Option 1", "Option 2", "Option 3"]).map((opt) => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            ) : isRadio ? (
                              <div
                                className="pointer-events-auto flex h-full flex-col justify-center gap-1 overflow-y-auto"
                                style={contentPadding}
                              >
                                {(field.options ?? ["Option 1", "Option 2", "Option 3"]).map((opt) => (
                                  <label
                                    key={opt}
                                    onClick={(e) => e.stopPropagation()}
                                    className="flex cursor-pointer items-center gap-1.5"
                                    style={textStyle}
                                  >
                                    <input
                                      type="radio"
                                      name={`radio-${field.id}`}
                                      value={opt}
                                      checked={value === opt}
                                      onChange={() => onValueChange(field.id, opt)}
                                      className="h-3 w-3 accent-teal-600"
                                    />
                                    <span>{opt}</span>
                                  </label>
                                ))}
                              </div>
                            ) : isEditing ? (
                              <input
                                autoFocus
                                type={inputTypeFor(field)}
                                value={editValue}
                                onChange={(e) => {
                                  setEditValue(e.target.value);
                                  editValueRef.current = e.target.value;
                                }}
                                onBlur={commitEdit}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") commitEdit();
                                  if (e.key === "Escape") {
                                    editValueRef.current = values[field.id] ?? "";
                                    setEditingFieldId(null);
                                  }
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="absolute inset-0 h-full w-full cursor-text bg-white/80 outline-none"
                                style={{ ...textStyle, ...contentPadding }}
                              />
                            ) : (
                              <div className="flex h-full items-center" style={{ ...textStyle, ...contentPadding }}>
                                {isFilled ? (
                                  <span className="max-h-full overflow-hidden">{value}</span>
                                ) : (
                                  <span className="max-h-full overflow-hidden opacity-50">
                                    {field.placeholder}{field.required ? " *" : ""}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>

                <div className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
                  Page {pageNumber}
                </div>
              </div>
            );
          })}
        </Document>

        {isLoaded && numPages === 0 ? (
          <div className="flex h-64 items-center justify-center text-sm text-slate-500">
            No pages found in this document.
          </div>
        ) : null}
      </div>

      {signatureModal ? (
        <SignatureModal
          title={signatureModal.isInitials ? "Add your initials" : "Add your signature"}
          onClose={() => setSignatureModal(null)}
          onInsert={(dataUrl) => {
            onValueChange(signatureModal.fieldId, dataUrl);
            setSignatureModal(null);
          }}
        />
      ) : null}
    </div>
  );
}

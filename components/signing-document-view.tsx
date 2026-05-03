"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, LoaderCircle, Minus, PenLine, Plus } from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import type { FieldDraft } from "@/lib/types";
import { SignatureModal } from "@/components/signature-modal";
import { cn } from "@/lib/utils";

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
    const update = () => setPageWidth(Math.max(320, el.clientWidth - 48));
    update();
    const obs = new ResizeObserver(update);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

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
        className="h-[78vh] min-h-[720px] overflow-y-auto rounded-[24px] bg-slate-100 p-4"
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

            return (
              <div
                key={pageNumber}
                ref={(node) => { pageRefs.current[pageNumber] = node; }}
                className="relative mx-auto mb-6 w-fit rounded-[20px] bg-white shadow-sm"
              >
                <Page
                  pageNumber={pageNumber}
                  width={pageWidth * zoom}
                  renderAnnotationLayer={false}
                  renderTextLayer={false}
                  loading={null}
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

                      const textStyle = {
                        color: field.textColor,
                        fontSize: `${Math.max(10, field.fontSize * 0.75)}px`,
                        fontWeight: field.fontWeight === "bold" ? 700 : 400,
                        fontFamily: fontFamilyStr(field.fontFamily)
                      };

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
                            left: `${field.x * 100}%`,
                            top: `${field.y * 100}%`,
                            width: `${field.width * 100}%`,
                            height: `${field.height * 100}%`,
                            minHeight: !isSignature && !isCheckbox ? "36px" : undefined
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
                                  <PenLine className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                                  <span className="text-[11px] font-semibold text-amber-700">
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
                                  "flex h-5 w-5 items-center justify-center rounded border-2 transition",
                                  value === "true"
                                    ? "border-teal-500 bg-teal-500"
                                    : "border-amber-400 bg-white hover:border-teal-400"
                                )}>
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
                                className="pointer-events-auto h-full min-h-9 w-full cursor-pointer bg-transparent px-3 py-1 outline-none"
                                style={textStyle}
                              >
                                <option value="">Select…</option>
                                {(field.options ?? ["Option 1", "Option 2", "Option 3"]).map((opt) => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            ) : isRadio ? (
                              <div className="pointer-events-auto flex h-full min-h-9 flex-col justify-center gap-1 overflow-y-auto px-3 py-1">
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
                                    <span className="text-[10px]">{opt}</span>
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
                                className="absolute inset-0 h-full min-h-9 w-full cursor-text bg-white/80 px-3 py-1 outline-none"
                                style={textStyle}
                              />
                            ) : (
                              <div className="flex h-full min-h-9 items-center px-3 py-1" style={textStyle}>
                                {isFilled ? (
                                  <span className="line-clamp-2">{value}</span>
                                ) : (
                                  <span className="line-clamp-2 text-[10px] opacity-50">
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

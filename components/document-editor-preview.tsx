"use client";

import type { PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { CalendarCheck, CalendarDays, CheckSquare, ChevronDown, ChevronUp, Circle, LoaderCircle, Lock, Mail, Minus, PenLine, Plus, Type, User, X } from "lucide-react";
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

type ResizeMode = "move" | "resize-tl" | "resize-tr" | "resize-bl" | "resize-br";

const AUTO_FILL_TYPES = new Set(["date-signed", "email", "full-name"]);

function FieldTypeContent({
  field,
  textStyle,
  contentPadding,
  displayScale,
}: {
  field: FieldDraft;
  textStyle: React.CSSProperties;
  contentPadding: React.CSSProperties;
  displayScale: number;
}) {
  const iconSize = Math.max(9, 11 * displayScale);
  const isAuto = AUTO_FILL_TYPES.has(field.type);

  const iconNode = (() => {
    if (field.type === "date-signed") return <CalendarCheck style={{ width: iconSize, height: iconSize }} className="shrink-0" />;
    if (field.type === "full-name") return <User style={{ width: iconSize, height: iconSize }} className="shrink-0" />;
    if (field.type === "email") return <Mail style={{ width: iconSize, height: iconSize }} className="shrink-0" />;
    if (field.type === "date") return <CalendarDays style={{ width: iconSize, height: iconSize }} className="shrink-0" />;
    if (field.type === "dropdown") return <ChevronDown style={{ width: iconSize, height: iconSize }} className="shrink-0" />;
    if (field.type === "radio") return <Circle style={{ width: iconSize, height: iconSize }} className="shrink-0" />;
    return <Type style={{ width: iconSize, height: iconSize }} className="shrink-0" />;
  })();

  const label = field.value || field.placeholder;
  const showValue = !!field.value;

  return (
    <div className="flex h-full w-full items-center gap-1 overflow-hidden" style={{ ...textStyle, ...contentPadding }}>
      {!showValue && <span className="shrink-0 opacity-50">{iconNode}</span>}
      <span className={cn("flex-1 truncate", showValue ? "opacity-90" : "opacity-60")}>{label}</span>
      {isAuto && !showValue && (
        <span
          className="ml-auto shrink-0 rounded px-1 font-bold uppercase tracking-wide"
          style={{
            fontSize: Math.max(7, 8 * displayScale),
            paddingBlock: Math.max(1, 2 * displayScale),
            background: "rgba(99,102,241,0.12)",
            color: "#4f46e5",
          }}
        >
          {field.type === "email" ? <Lock style={{ width: Math.max(7, 9 * displayScale), height: Math.max(7, 9 * displayScale) }} /> : "Auto"}
        </span>
      )}
    </div>
  );
}

export function DocumentEditorPreview({
  documentId,
  documentTitle,
  fields,
  activeFieldId,
  onActiveFieldChange,
  onFieldChange,
  onFieldDuplicate,
  onFieldRemove,
  onCurrentPageChange,
  captureFieldId,
  onCaptureHandled,
  readOnly = false
}: {
  documentId: string;
  documentTitle: string;
  fields: FieldDraft[];
  activeFieldId: string | null;
  onActiveFieldChange: (fieldId: string) => void;
  onFieldChange: (fieldId: string, patch: Partial<FieldDraft>) => void;
  onFieldDuplicate?: (field: FieldDraft) => void;
  onFieldRemove?: (fieldId: string) => void;
  onCurrentPageChange: (pageNumber: number) => void;
  captureFieldId?: string | null;
  onCaptureHandled?: () => void;
  readOnly?: boolean;
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
  // ref so beginInteraction closure can read current edit state
  const editingRef = useRef<{ fieldId: string; value: string } | null>(null);

  useEffect(() => {
    if (captureFieldId) {
      const field = fields.find((f) => f.id === captureFieldId);
      setSignatureModal({ fieldId: captureFieldId, isInitials: field?.type === "initials" });
      onCaptureHandled?.();
    }
  }, [captureFieldId, fields, onCaptureHandled]);

  function clamp(value: number, min = 0, max = 1) {
    return Math.min(max, Math.max(min, value));
  }

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    const updateWidth = () => {
      const horizontalPadding = window.matchMedia("(min-width: 640px)").matches ? 32 : 16;
      setPageWidth(Math.max(1, element.clientWidth - horizontalPadding));
    };
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);
    return () => observer.disconnect();
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

    const updateCurrentPage = () => {
      let nextPage = 1;
      let nearestOffset = Number.POSITIVE_INFINITY;
      const rootTop = root.getBoundingClientRect().top;

      for (let pageNumber = 1; pageNumber <= numPages; pageNumber += 1) {
        const element = pageRefs.current[pageNumber];
        if (!element) continue;
        const offset = Math.abs(element.getBoundingClientRect().top - rootTop - 24);
        if (offset < nearestOffset) {
          nearestOffset = offset;
          nextPage = pageNumber;
        }
      }

      setCurrentPage(nextPage);
      onCurrentPageChange(nextPage);
    };

    updateCurrentPage();
    root.addEventListener("scroll", updateCurrentPage, { passive: true });
    return () => root.removeEventListener("scroll", updateCurrentPage);
  }, [numPages, onCurrentPageChange]);

  function commitEdit() {
    const current = editingRef.current;
    if (current) {
      onFieldChange(current.fieldId, { value: current.value });
      editingRef.current = null;
      setEditingFieldId(null);
    }
  }

  function startEdit(field: FieldDraft) {
    const value = field.value ?? "";
    editingRef.current = { fieldId: field.id, value };
    setEditValue(value);
    setEditingFieldId(field.id);
  }

  function beginInteraction(
    event: ReactPointerEvent<HTMLElement>,
    field: FieldDraft,
    mode: ResizeMode
  ) {
    if (readOnly) return;
    event.preventDefault();
    event.stopPropagation();

    // Commit any in-progress edit on a different field
    if (editingRef.current && editingRef.current.fieldId !== field.id) {
      commitEdit();
    }

    const pageElement = pageRefs.current[field.pageNumber];
    if (!pageElement) return;

    onActiveFieldChange(field.id);
    const rect = pageElement.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    const startingField = { ...field };
    let hasMoved = false;
    let workingFieldId = field.id;
    let altDuplicateCreated = false;
    const isAltMove = event.altKey && mode === "move";

    const handleMove = (e: PointerEvent) => {
      const dx = Math.abs(e.clientX - startX);
      const dy = Math.abs(e.clientY - startY);
      if (dx > 5 || dy > 5) hasMoved = true;
      if (!hasMoved) return;

      // Alt+drag: create duplicate on first meaningful move
      if (isAltMove && !altDuplicateCreated && onFieldDuplicate) {
        altDuplicateCreated = true;
        const duplicate: FieldDraft = {
          ...field,
          id: crypto.randomUUID(),
          placeholder: field.placeholder.endsWith(" copy")
            ? field.placeholder
            : `${field.placeholder} copy`
        };
        onFieldDuplicate(duplicate);
        onActiveFieldChange(duplicate.id);
        workingFieldId = duplicate.id;
      }

      const deltaX = (e.clientX - startX) / rect.width;
      const deltaY = (e.clientY - startY) / rect.height;

      if (mode === "move") {
        onFieldChange(workingFieldId, {
          x: clamp(startingField.x + deltaX, 0, 1 - startingField.width),
          y: clamp(startingField.y + deltaY, 0, 1 - startingField.height)
        });
        return;
      }

      if (mode === "resize-br") {
        onFieldChange(field.id, {
          width: clamp(startingField.width + deltaX, 0, 1 - startingField.x),
          height: clamp(startingField.height + deltaY, 0, 1 - startingField.y)
        });
        return;
      }

      if (mode === "resize-tl") {
        const rightEdge = startingField.x + startingField.width;
        const bottomEdge = startingField.y + startingField.height;
        const newX = clamp(startingField.x + deltaX, 0, rightEdge);
        const newY = clamp(startingField.y + deltaY, 0, bottomEdge);
        onFieldChange(field.id, {
          x: newX,
          y: newY,
          width: rightEdge - newX,
          height: bottomEdge - newY
        });
        return;
      }

      if (mode === "resize-tr") {
        const bottomEdge = startingField.y + startingField.height;
        const newY = clamp(startingField.y + deltaY, 0, bottomEdge);
        onFieldChange(field.id, {
          y: newY,
          width: clamp(startingField.width + deltaX, 0, 1 - startingField.x),
          height: bottomEdge - newY
        });
        return;
      }

      if (mode === "resize-bl") {
        const rightEdge = startingField.x + startingField.width;
        const newX = clamp(startingField.x + deltaX, 0, rightEdge);
        onFieldChange(field.id, {
          x: newX,
          width: rightEdge - newX,
          height: clamp(startingField.height + deltaY, 0, 1 - startingField.y)
        });
      }
    };

    const handleEnd = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleEnd);

      if (hasMoved || mode !== "move") return;

      // Tap on field: open appropriate interaction
      if (field.type === "image") return; // no tap action for images
      if (field.type === "signature" || field.type === "initials") {
        setSignatureModal({ fieldId: field.id, isInitials: field.type === "initials" });
      } else {
        startEdit(field);
      }
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleEnd);
  }

  function scrollToPage(direction: -1 | 1) {
    const nextPage = clamp(currentPage + direction, 1, numPages || 1);
    pageRefs.current[nextPage]?.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  function editorFontFamily(fontFamily: FieldDraft["fontFamily"]) {
    if (fontFamily === "TimesRoman") return "serif";
    if (fontFamily === "Courier") return "monospace";
    return "sans-serif";
  }

  function clearSignature(fieldId: string) {
    onFieldChange(fieldId, { value: "" });
  }

  return (
    <div className="rounded-[28px] border bg-white p-4 shadow-card">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold text-ink">{documentTitle}</h2>

        <div className="flex flex-wrap items-center gap-2">
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
      </div>

      <div
        ref={scrollRef}
        className="h-[78vh] min-h-[520px] overflow-auto rounded-[24px] bg-slate-100 p-2 sm:min-h-[720px] sm:p-4"
      >
        <Document
          file={`/api/documents/${documentId}/source`}
          loading={
            <div className="flex h-64 items-center justify-center text-slate-500">
              <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
              Loading document preview...
            </div>
          }
          onLoadSuccess={({ numPages: totalPages }) => {
            setNumPages(totalPages);
            setIsLoaded(true);
            setLoadError(null);
            onCurrentPageChange(1);
          }}
          onLoadError={(error) => {
            setLoadError(error.message);
            setIsLoaded(false);
          }}
        >
          {loadError ? (
            <div className="rounded-3xl border border-rose-200 bg-rose-50 px-6 py-5 text-sm text-rose-700">
              Unable to render the PDF preview. {loadError}
            </div>
          ) : null}

          {Array.from({ length: numPages }, (_, index) => {
            const pageNumber = index + 1;
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
                    .filter((field) => field.pageNumber === pageNumber)
                    .map((field) => {
                      const rect = originalPage
                        ? getFieldRect(field, displayPage.width, displayPage.height)
                        : null;

                      // Image overlay early return
                      if (field.type === "image" && field.value) {
                        return (
                          <div
                            key={field.id}
                            onPointerDown={(event) => beginInteraction(event, field, "move")}
                            className="pointer-events-auto absolute overflow-hidden"
                            style={{
                              left: rect ? `${rect.left}px` : `${field.x * 100}%`,
                              top: rect ? `${rect.top}px` : `${field.y * 100}%`,
                              width: rect ? `${rect.width}px` : `${field.width * 100}%`,
                              height: rect ? `${rect.height}px` : `${field.height * 100}%`,
                            }}
                          >
                            <img
                              src={field.value}
                              alt={field.placeholder}
                              className="h-full w-full object-contain select-none"
                              draggable={false}
                            />
                            {!readOnly && (
                              <>
                                {onFieldRemove && (
                                  <button
                                    type="button"
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={(e) => { e.stopPropagation(); onFieldRemove(field.id); }}
                                    className="absolute -right-2 -top-2 z-20 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-white shadow-sm"
                                    title="Remove image"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                )}
                                {/* Resize handles */}
                                <span onPointerDown={(e) => beginInteraction(e, field, "resize-tl")} className="absolute -left-1.5 -top-1.5 z-20 h-3 w-3 cursor-nwse-resize rounded-sm bg-white shadow-sm ring-1 ring-ink/50" />
                                <span onPointerDown={(e) => beginInteraction(e, field, "resize-tr")} className="absolute -right-1.5 -top-1.5 z-20 h-3 w-3 cursor-nesw-resize rounded-sm bg-white shadow-sm ring-1 ring-ink/50" />
                                <span onPointerDown={(e) => beginInteraction(e, field, "resize-bl")} className="absolute -bottom-1.5 -left-1.5 z-20 h-3 w-3 cursor-nesw-resize rounded-sm bg-white shadow-sm ring-1 ring-ink/50" />
                                <span onPointerDown={(e) => beginInteraction(e, field, "resize-br")} className="absolute -bottom-1.5 -right-1.5 z-20 h-3 w-3 cursor-nwse-resize rounded-sm bg-white shadow-sm ring-1 ring-ink/50" />
                              </>
                            )}
                          </div>
                        );
                      }

                      const isSignature = field.type === "signature" || field.type === "initials";
                      const isEditing = editingFieldId === field.id;
                      const hasCaptured = isSignature && !!field.value;
                      const isCheckbox = field.type === "checkbox";
                      const padding = getScaledFieldPadding(displayScale);

                      const fieldStyle = {
                        left: rect ? `${rect.left}px` : `${field.x * 100}%`,
                        top: rect ? `${rect.top}px` : `${field.y * 100}%`,
                        width: rect ? `${rect.width}px` : `${field.width * 100}%`,
                        height: rect ? `${rect.height}px` : `${field.height * 100}%`
                      };

                      const textStyle = {
                        color: field.textColor,
                        fontSize: `${getScaledFontSize(field, displayScale)}px`,
                        fontWeight: field.fontWeight === "bold" ? 700 : 400,
                        fontFamily: editorFontFamily(field.fontFamily)
                      };
                      const contentPadding = {
                        paddingInline: `${padding.x}px`,
                        paddingBlock: `${padding.y}px`
                      };
                      const checkboxSize = `${Math.min(rect?.width ?? 16, rect?.height ?? 16)}px`;

                      return (
                        <div
                          key={field.id}
                          onPointerDown={(event) => beginInteraction(event, field, "move")}
                          className={cn(
                            "pointer-events-auto absolute rounded-[6px] transition",
                            readOnly
                              ? "cursor-default"
                              : cn(
                                  "border-2 border-dashed",
                                  isEditing ? "cursor-text" : isSignature || isCheckbox ? "cursor-pointer" : "cursor-text",
                                  activeFieldId === field.id
                                    ? "border-[#E9967B] bg-[#E9967B]/20 shadow-[0_0_0_3px_rgba(233,150,123,0.18)]"
                                    : "border-teal-500/60 bg-teal-500/10"
                                )
                          )}
                          style={fieldStyle}
                        >
                          {/* Field content */}
                          <div className="relative h-full w-full overflow-hidden rounded-[6px]">
                            {isSignature ? (
                              hasCaptured ? (
                                <div className="relative flex h-full w-full items-center justify-center">
                                  <img
                                    src={field.value}
                                    alt="Signature"
                                    className="max-h-full max-w-full object-contain"
                                    draggable={false}
                                  />
                                  {!readOnly && (
                                  <button
                                    type="button"
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      clearSignature(field.id);
                                    }}
                                    className="absolute right-0.5 top-0.5 z-20 rounded-full bg-white/90 p-0.5 text-slate-500 shadow-sm transition hover:text-rose-600"
                                    title="Remove signature"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                  )}
                                </div>
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                  <span className="flex items-center gap-1.5 text-[10px] font-semibold opacity-60" style={textStyle}>
                                    <PenLine
                                      className="shrink-0"
                                      style={{ width: 12 * displayScale, height: 12 * displayScale }}
                                    />
                                    {field.type === "initials" ? "Add initials" : "Add signature"}
                                  </span>
                                </div>
                              )
                            ) : isCheckbox ? (
                              <div className="flex h-full w-full items-center justify-center">
                                <div
                                  className="flex items-center justify-center rounded border-2 border-teal-500 bg-white"
                                  style={{ width: checkboxSize, height: checkboxSize }}
                                >
                                  {field.value === "true" && (
                                    <svg viewBox="0 0 10 8" className="h-2.5 w-2.5" fill="none" stroke="#0d9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M1 4l3 3 5-6" />
                                    </svg>
                                  )}
                                </div>
                              </div>
                            ) : isEditing ? (
                              <input
                                autoFocus
                                type={field.type === "date" ? "date" : "text"}
                                value={editValue}
                                onChange={(e) => {
                                  setEditValue(e.target.value);
                                  if (editingRef.current) {
                                    editingRef.current.value = e.target.value;
                                  }
                                }}
                                onBlur={commitEdit}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") commitEdit();
                                  if (e.key === "Escape") {
                                    editingRef.current = null;
                                    setEditingFieldId(null);
                                  }
                                }}
                                onPointerDown={(e) => e.stopPropagation()}
                                className="absolute inset-0 h-full w-full bg-transparent outline-none"
                                style={{ ...textStyle, ...contentPadding }}
                              />
                            ) : (
                              <FieldTypeContent
                                field={field}
                                textStyle={textStyle}
                                contentPadding={contentPadding}
                                displayScale={displayScale}
                              />
                            )}
                          </div>

                          {/* Mobile delete button */}
                          {onFieldRemove && !readOnly ? (
                            <button
                              type="button"
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={(e) => {
                                e.stopPropagation();
                                onFieldRemove(field.id);
                              }}
                              className="absolute -right-2 -top-2 z-20 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-white shadow-sm xl:hidden"
                              title="Delete field"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          ) : null}

                          {/* Four-corner resize handles */}
                          {!readOnly && (
                          <>
                          <span
                            onPointerDown={(e) => beginInteraction(e, field, "resize-tl")}
                            className="absolute -left-1.5 -top-1.5 z-20 h-3 w-3 cursor-nwse-resize rounded-sm bg-white shadow-sm ring-1 ring-ink/50"
                          />
                          <span
                            onPointerDown={(e) => beginInteraction(e, field, "resize-tr")}
                            className="absolute -right-1.5 -top-1.5 z-20 h-3 w-3 cursor-nesw-resize rounded-sm bg-white shadow-sm ring-1 ring-ink/50"
                          />
                          <span
                            onPointerDown={(e) => beginInteraction(e, field, "resize-bl")}
                            className="absolute -bottom-1.5 -left-1.5 z-20 h-3 w-3 cursor-nesw-resize rounded-sm bg-white shadow-sm ring-1 ring-ink/50"
                          />
                          <span
                            onPointerDown={(e) => beginInteraction(e, field, "resize-br")}
                            className="absolute -bottom-1.5 -right-1.5 z-20 h-3 w-3 cursor-nwse-resize rounded-sm bg-white shadow-sm ring-1 ring-ink/50"
                          />
                          </>
                          )}
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
            No pages available in this document.
          </div>
        ) : null}
      </div>

      {signatureModal ? (
        <SignatureModal
          title={signatureModal.isInitials ? "Add your initials" : "Add your signature"}
          onClose={() => setSignatureModal(null)}
          onInsert={(dataUrl) => {
            onFieldChange(signatureModal.fieldId, { value: dataUrl });
            setSignatureModal(null);
          }}
        />
      ) : null}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Document, Page, pdfjs } from "react-pdf";
import {
  ArrowRight,
  Check,
  FileText,
  MoreHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { formatDate } from "@/lib/utils";
import type { DocumentBlock, DocumentRecord } from "@/lib/types";
import { cn } from "@/lib/utils";

// ── Thumbnail dimensions (A4 ratio) ─────────────────────────────────────────
const CARD_W = 168;
const CARD_H = 238;
const INNER_W = 720;
const SCALE = CARD_W / INNER_W;

// ── Block document preview ───────────────────────────────────────────────────
function BlockThumbnail({ blocks }: { blocks: DocumentBlock[] }) {
  return (
    <div
      style={{ width: CARD_W, height: CARD_H, overflow: "hidden", position: "relative", background: "#fff" }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: INNER_W,
          transformOrigin: "top left",
          transform: `scale(${SCALE})`,
          padding: "52px 60px 0",
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        {blocks.slice(0, 22).map((block) => {
          if (block.type === "heading1") {
            return (
              <div key={block.id} style={{ fontSize: 28, fontWeight: 700, color: "#0f172a", lineHeight: 1.2, letterSpacing: "-0.02em", marginBottom: 14 }}>
                {block.content}
              </div>
            );
          }
          if (block.type === "heading2") {
            return (
              <div key={block.id} style={{ fontSize: 18, fontWeight: 650, color: "#1e293b", lineHeight: 1.3, marginTop: 20, marginBottom: 8 }}>
                {block.content}
              </div>
            );
          }
          if (block.type === "heading3") {
            return (
              <div key={block.id} style={{ fontSize: 15, fontWeight: 600, color: "#1e293b", lineHeight: 1.3, marginTop: 14, marginBottom: 6 }}>
                {block.content}
              </div>
            );
          }
          if (block.type === "paragraph") {
            return (
              <div key={block.id} style={{ fontSize: 12, color: "#64748b", lineHeight: 1.7, marginBottom: 8 }}>
                {block.content}
              </div>
            );
          }
          if (block.type === "bullet" || block.type === "numbered") {
            return (
              <div key={block.id} style={{ display: "flex", gap: 7, fontSize: 12, color: "#64748b", lineHeight: 1.6, marginBottom: 5 }}>
                <span style={{ color: "#94a3b8", flexShrink: 0 }}>•</span>
                <span>{block.content}</span>
              </div>
            );
          }
          if (block.type === "divider") {
            return <div key={block.id} style={{ borderTop: "1px solid #e2e8f0", margin: "14px 0" }} />;
          }
          if (block.type === "field") {
            return (
              <div
                key={block.id}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  background: "#f0fdfa",
                  border: "1.5px solid #5eead4",
                  borderRadius: 5,
                  padding: "2px 9px",
                  fontSize: 11,
                  color: "#0f766e",
                  marginBottom: 6,
                  marginRight: 5,
                }}
              >
                {block.fieldLabel ?? block.content}
              </div>
            );
          }
          return null;
        })}
      </div>
      {/* Bottom fade */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 52,
          background: "linear-gradient(to bottom, transparent, rgba(255,255,255,0.97))",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

// ── PDF first-page thumbnail ─────────────────────────────────────────────────
function PdfThumbnail({ documentId }: { documentId: string }) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        style={{ width: CARD_W, height: CARD_H, background: "#f8fafc", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}
      >
        <FileText className="h-8 w-8 text-slate-300" />
      </div>
    );
  }

  return (
    <div style={{ width: CARD_W, height: CARD_H, overflow: "hidden", position: "relative", background: "#f8fafc" }}>
      {!ready && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-slate-500" />
        </div>
      )}
      <Document
        file={`/api/documents/${documentId}/source`}
        onLoadSuccess={() => setReady(true)}
        onLoadError={() => setFailed(true)}
        loading={null}
        error={null}
      >
        <Page
          pageNumber={1}
          width={CARD_W}
          renderAnnotationLayer={false}
          renderTextLayer={false}
          onRenderSuccess={() => setReady(true)}
        />
      </Document>
    </div>
  );
}

// ── Three-dots menu ──────────────────────────────────────────────────────────
function CardMenu({
  onDelete,
}: {
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); setOpen((v) => !v); }}
        className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute bottom-full right-0 z-20 mb-1 w-36 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); setOpen(false); onDelete(); }}
            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-rose-600 transition hover:bg-rose-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

// ── Single document card ─────────────────────────────────────────────────────
function DocumentCard({
  document,
  onDelete,
}: {
  document: DocumentRecord;
  onDelete: () => void;
}) {
  const hasBlocks = Array.isArray(document.source_blocks) && document.source_blocks.length > 0;

  return (
    <div className="group flex flex-col">
      {/* Paper thumbnail */}
      <Link href={`/documents/${document.id}/edit`} className="block">
        <div
          className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition-all group-hover:border-slate-300 group-hover:shadow-md"
          style={{ width: CARD_W, height: CARD_H }}
        >
          {hasBlocks ? (
            <BlockThumbnail blocks={document.source_blocks!} />
          ) : (
            <PdfThumbnail documentId={document.id} />
          )}
        </div>
      </Link>

      {/* Metadata */}
      <div className="mt-2.5" style={{ width: CARD_W }}>
        <Link href={`/documents/${document.id}/edit`}>
          <p className="truncate text-[13px] font-semibold text-slate-800 leading-tight hover:text-teal-700 transition-colors">
            {document.title}
          </p>
        </Link>
        <div className="mt-1.5 flex items-center justify-between gap-1">
          <StatusBadge status={document.status} />
          <CardMenu onDelete={onDelete} />
        </div>
        <p className="mt-1 whitespace-nowrap text-[11px] text-slate-400">
          {formatDate(document.updated_at)}
        </p>
      </div>
    </div>
  );
}

// ── Modal types (unchanged) ──────────────────────────────────────────────────
type ModalState =
  | { type: "idle" }
  | { type: "confirm-delete"; document: DocumentRecord }
  | { type: "delete-success"; title: string };

// ── Main export ──────────────────────────────────────────────────────────────
export function DocumentList({ documents: initialDocuments }: { documents: DocumentRecord[] }) {
  const router = useRouter();
  const [documents, setDocuments] = useState(initialDocuments);
  const [modal, setModal] = useState<ModalState>({ type: "idle" });
  const [isDeleting, setIsDeleting] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url
    ).toString();
  }, []);

  async function handleDelete(doc: DocumentRecord) {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/documents/${doc.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to delete.");
      }
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      setModal({ type: "delete-success", title: doc.title });
      router.refresh();
    } catch {
      setModal({ type: "idle" });
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      {documents.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">
          No documents yet. Start with a PDF upload or template above.
        </div>
      ) : (
        <div className="flex flex-wrap gap-6">
          {documents.map((doc) => (
            <DocumentCard
              key={doc.id}
              document={doc}
              onDelete={() => setModal({ type: "confirm-delete", document: doc })}
            />
          ))}
        </div>
      )}

      {/* Delete confirmation modal */}
      {mounted && modal.type === "confirm-delete" ? createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-sm rounded-[28px] border bg-white p-6 shadow-card">
            <div className="mb-1 flex items-start justify-between gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100">
                <Trash2 className="h-5 w-5 text-rose-600" />
              </div>
              <button
                type="button"
                onClick={() => setModal({ type: "idle" })}
                className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <h3 className="mt-3 text-lg font-semibold text-ink">Delete document?</h3>
            <p className="mt-2 text-sm text-slate-500">
              <span className="font-medium text-ink">&ldquo;{modal.document.title}&rdquo;</span> will be
              permanently deleted. This action cannot be undone.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setModal({ type: "idle" })}
                disabled={isDeleting}
                className="rounded-full border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => handleDelete(modal.document)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full bg-rose-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-rose-700 disabled:opacity-50"
                )}
              >
                <Trash2 className="h-4 w-4" />
                {isDeleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      ) : null}

      {/* Delete success modal */}
      {mounted && modal.type === "delete-success" ? createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-sm rounded-[28px] border bg-white p-6 shadow-card text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-100">
              <Check className="h-6 w-6 text-teal-600" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-ink">Document deleted</h3>
            <p className="mt-2 text-sm text-slate-500">
              <span className="font-medium text-ink">&ldquo;{modal.title}&rdquo;</span> has been
              permanently removed.
            </p>
            <button
              type="button"
              onClick={() => setModal({ type: "idle" })}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-white"
            >
              Done
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>,
        document.body
      ) : null}
    </>
  );
}

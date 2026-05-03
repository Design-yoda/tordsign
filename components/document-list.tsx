"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  CircleCheck,
  Clock3,
  FilePenLine,
  Send,
  Trash2,
  X
} from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { formatDate } from "@/lib/utils";
import type { DocumentRecord } from "@/lib/types";
import { cn } from "@/lib/utils";

const statusIcons = {
  Draft: FilePenLine,
  Sent: Send,
  Completed: CircleCheck,
  Expired: Clock3
} as const;

type ModalState =
  | { type: "idle" }
  | { type: "confirm-delete"; document: DocumentRecord }
  | { type: "delete-success"; title: string };

export function DocumentList({ documents: initialDocuments }: { documents: DocumentRecord[] }) {
  const router = useRouter();
  const [documents, setDocuments] = useState(initialDocuments);
  const [modal, setModal] = useState<ModalState>({ type: "idle" });
  const [isDeleting, setIsDeleting] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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
          No documents yet. Start with a PDF upload to create your first signing flow.
        </div>
      ) : (
        <div className="rounded-[24px] border border-slate-200 bg-white">
          <div className="w-full overflow-x-auto [-webkit-overflow-scrolling:touch]">
            <div className="min-w-[720px]">
              <div className="grid grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)_40px] gap-4 border-b border-slate-200 bg-[#f1ece6] px-5 py-4 text-sm font-medium text-slate-700">
                <div className="truncate">Document</div>
                <div className="truncate">Recipient</div>
                <div className="truncate">Status</div>
                <div className="truncate">Updated</div>
                <div />
              </div>

              <div className="divide-y divide-slate-200">
                {documents.map((document) => {
                  const Icon = statusIcons[document.status];
                  return (
                    <div key={document.id} className="group/row relative flex items-stretch">
                      <Link
                        href={`/documents/${document.id}/edit`}
                        className="grid min-w-0 flex-1 grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)] gap-4 px-5 py-5 transition hover:bg-slate-50"
                      >
                        <div className="flex min-w-0 items-start gap-4">
                          <div className="mt-0.5 shrink-0 rounded-full bg-slate-100 p-3 text-slate-700">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-[15px] font-medium text-ink">{document.title}</div>
                            <div className="mt-1 truncate text-sm text-slate-500">{document.file_name}</div>
                          </div>
                        </div>

                        <div className="min-w-0">
                          <div className="truncate text-[15px] text-ink">
                            {document.recipient_name || "Not set"}
                          </div>
                          <div className="mt-1 truncate text-sm text-slate-500">
                            {document.recipient_email || "No recipient email"}
                          </div>
                        </div>

                        <div className="flex min-w-0 items-center">
                          <StatusBadge status={document.status} />
                        </div>

                        <div className="flex min-w-0 items-center truncate text-sm text-slate-500">
                          {formatDate(document.updated_at)}
                        </div>
                      </Link>

                      <div className="flex w-10 shrink-0 items-center justify-center">
                        <button
                          type="button"
                          title="Delete document"
                          onClick={() => setModal({ type: "confirm-delete", document })}
                          className="rounded-lg p-1.5 text-slate-300 opacity-100 transition hover:bg-rose-50 hover:text-rose-500 md:opacity-0 md:group-hover/row:opacity-100"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

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

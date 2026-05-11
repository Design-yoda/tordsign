"use client";

import type { ComponentType } from "react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarCheck,
  CalendarDays,
  Check,
  ChevronDown,
  Copy,
  Download,
  Eraser,
  FileSignature,
  Link2,
  LoaderCircle,
  Mail,
  Pencil,
  PenLine,
  Pilcrow,
  Plus,
  Send,
  Type,
  User,
  X
} from "lucide-react";
import { DocumentEditorPreview } from "@/components/document-editor-preview";
import type { DocumentBlock, DocumentRecord, FieldDraft, FieldFontFamily, FieldType } from "@/lib/types";
import { cn } from "@/lib/utils";

const FONT_SIZE_OPTIONS = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32];

type FieldTool = { type: FieldType; label: string; icon: ComponentType<{ className?: string }> };

const fieldCategories: Array<{ label: string; tools: FieldTool[] }> = [
  {
    label: "Signature fields",
    tools: [
      { type: "signature", label: "Signature", icon: FileSignature },
      { type: "initials", label: "Initials", icon: Pilcrow }
    ]
  },
  {
    label: "Auto-fill fields",
    tools: [
      { type: "date-signed", label: "Date signed", icon: CalendarCheck },
      { type: "full-name", label: "Full name", icon: User },
      { type: "email", label: "Email address", icon: Mail }
    ]
  },
  {
    label: "Standard fields",
    tools: [
      { type: "text", label: "Textbox", icon: Type },
      { type: "date", label: "Date picker", icon: CalendarDays },
    ]
  }
];


type Toast = { id: number; message: string; type: "success" | "error" };

export function EditorShell({ document }: { document: DocumentRecord }) {
  const router = useRouter();
  const [fields, setFields] = useState<FieldDraft[]>(document.fields);
  const [sourceBlocks] = useState<DocumentBlock[] | undefined>(document.source_blocks);
  const [activeFieldId, setActiveFieldId] = useState<string | null>(document.fields[0]?.id ?? null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [sendStep, setSendStep] = useState<"form" | "confirm" | "success" | "link">("form");
  const [signingUrl, setSigningUrl] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [isGettingLink, setIsGettingLink] = useState(false);
  const [sendPanel, setSendPanel] = useState({
    recipientName: document.recipient_name ?? "",
    recipientEmail: document.recipient_email ?? "",
    emailSubject: document.email_subject ?? `Please sign: ${document.title}`,
    emailMessage: document.email_message ?? ""
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signatureCaptureFieldId, setSignatureCaptureFieldId] = useState<string | null>(null);
  const isReadOnly = document.status === "Completed";

  // Editable document meta
  const [docTitle, setDocTitle] = useState(document.title);
  const [senderName, setSenderName] = useState(document.sender_name);
  const [senderEmail, setSenderEmail] = useState(document.sender_email);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingSender, setIsEditingSender] = useState(false);

  // Layer panel rename
  const [renamingFieldId, setRenamingFieldId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // Keyboard shortcut clipboard
  const clipboardRef = useRef<FieldDraft | null>(null);

  // Toast
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastCounterRef = useRef(0);

  // Font size dropdowns (desktop / mobile are separate)
  const [fontSizeOpen, setFontSizeOpen] = useState(false);
  const [fontSizeMobileOpen, setFontSizeMobileOpen] = useState(false);
  const fontSizeRef = useRef<HTMLDivElement>(null);
  const fontSizeMobileRef = useRef<HTMLDivElement>(null);

  const activeField = fields.find((field) => field.id === activeFieldId) ?? null;

  function showToast(message: string, type: "success" | "error") {
    const id = ++toastCounterRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }

  function defaultFieldName(type: FieldType): string {
    const count = fields.filter((f) => f.type === type).length + 1;
    const names: Partial<Record<FieldType, string>> = {
      signature: "Signature",
      initials: "Initials",
      "date-signed": "Date signed",
      "full-name": "Full name",
      email: "Email",
      company: "Company",
      "job-title": "Title",
      text: "Text",
      date: "Date",
      checkbox: "Checkbox",
      dropdown: "Dropdown",
      radio: "Radio"
    };
    return `${names[type] ?? type} ${count}`;
  }

  function defaultDimensions(type: FieldType): { width: number; height: number } {
    if (type === "signature") return { width: 0.28, height: 0.1 };
    if (type === "initials") return { width: 0.18, height: 0.08 };
    if (type === "checkbox") return { width: 0.06, height: 0.05 };
    if (type === "dropdown" || type === "radio") return { width: 0.26, height: 0.08 };
    return { width: 0.26, height: 0.045 };
  }

  function addField(type: FieldType) {
    if (isReadOnly) return;
    const { width, height } = defaultDimensions(type);
    const defaultOptions =
      type === "dropdown" || type === "radio"
        ? ["Option 1", "Option 2", "Option 3"]
        : undefined;

    const newField: FieldDraft = {
      id: crypto.randomUUID(),
      type,
      pageNumber: currentPage,
      x: 0.12,
      y: 0.12,
      width,
      height,
      required: true,
      recipientEmail: sendPanel.recipientEmail,
      placeholder: defaultFieldName(type),
      value: "",
      fontFamily: "Helvetica",
      fontSize: 14,
      fontWeight: "normal",
      textColor: "#0f172a",
      ...(defaultOptions ? { options: defaultOptions } : {})
    };

    setFields((current) => [...current, newField]);
    setActiveFieldId(newField.id);
  }

  function updateField(fieldId: string, patch: Partial<FieldDraft>) {
    if (isReadOnly) return;
    setFields((current) =>
      current.map((field) => (field.id === fieldId ? { ...field, ...patch } : field))
    );
  }

  function removeField(fieldId: string) {
    if (isReadOnly) return;
    setFields((current) => current.filter((field) => field.id !== fieldId));
    setActiveFieldId((current) => (current === fieldId ? null : current));
  }

  function duplicateField(fieldId: string) {
    if (isReadOnly) return;
    const source = fields.find((f) => f.id === fieldId);
    if (!source) return;
    const newField: FieldDraft = {
      ...source,
      id: crypto.randomUUID(),
      x: Math.min(source.x + 0.02, 1 - source.width),
      y: Math.min(source.y + 0.02, 1 - source.height),
      placeholder: source.placeholder.endsWith(" copy")
        ? source.placeholder
        : `${source.placeholder} copy`
    };
    setFields((current) => [...current, newField]);
    setActiveFieldId(newField.id);
  }

  function addDuplicateField(field: FieldDraft) {
    if (isReadOnly) return;
    setFields((current) => [...current, field]);
    setActiveFieldId(field.id);
  }

  function startRename(field: FieldDraft) {
    if (isReadOnly) return;
    setRenameValue(field.placeholder);
    setRenamingFieldId(field.id);
  }

  function commitRename(fieldId: string) {
    if (isReadOnly) return;
    if (renameValue.trim()) {
      updateField(fieldId, { placeholder: renameValue.trim() });
    }
    setRenamingFieldId(null);
  }

  function addOption() {
    if (isReadOnly) return;
    if (!activeField) return;
    const opts = activeField.options ?? ["Option 1", "Option 2", "Option 3"];
    updateField(activeField.id, { options: [...opts, `Option ${opts.length + 1}`] });
  }

  function updateOption(index: number, value: string) {
    if (isReadOnly) return;
    if (!activeField) return;
    const opts = [...(activeField.options ?? [])];
    opts[index] = value;
    updateField(activeField.id, { options: opts });
  }

  function removeOption(index: number) {
    if (isReadOnly) return;
    if (!activeField) return;
    const opts = (activeField.options ?? []).filter((_, i) => i !== index);
    updateField(activeField.id, { options: opts });
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = /Mac/.test(navigator.platform);
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (!mod) return;

      const target = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable) return;

      const currentActive = fields.find((f) => f.id === activeFieldId);

      if (e.key === "c" && currentActive) {
        clipboardRef.current = { ...currentActive };
      }

      if (e.key === "p") {
        e.preventDefault();
        const src = clipboardRef.current;
        if (src) {
          const pasted: FieldDraft = {
            ...src,
            id: crypto.randomUUID(),
            x: Math.min(src.x + 0.02, 1 - src.width),
            y: Math.min(src.y + 0.02, 1 - src.height),
            placeholder: src.placeholder.endsWith(" copy") ? src.placeholder : `${src.placeholder} copy`
          };
          setFields((prev) => [...prev, pasted]);
          setActiveFieldId(pasted.id);
        }
      }

      if (e.key === "d") {
        e.preventDefault();
        if (currentActive) duplicateField(currentActive.id);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [fields, activeFieldId]);

  // Close font size dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (fontSizeRef.current && !fontSizeRef.current.contains(e.target as Node)) {
        setFontSizeOpen(false);
      }
      if (fontSizeMobileRef.current && !fontSizeMobileRef.current.contains(e.target as Node)) {
        setFontSizeMobileOpen(false);
      }
    }
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function saveDraft(nextStatus?: "Draft" | "Sent") {
    if (isReadOnly) {
      showToast("Completed documents are read-only.", "error");
      return;
    }
    setIsSaving(true);
    setError(null);

    try {
      const patchResponse = await fetch(`/api/documents/${document.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields,
          sourceBlocks: undefined,
          title: docTitle,
          senderName,
          senderEmail,
          recipientName: sendPanel.recipientName,
          recipientEmail: sendPanel.recipientEmail,
          emailSubject: sendPanel.emailSubject,
          emailMessage: sendPanel.emailMessage
        })
      });

      const patchData = await patchResponse.json();

      if (!patchResponse.ok) {
        const msg =
          patchData.error?.formErrors?.[0] ??
          (Object.values(patchData.error?.fieldErrors ?? {}) as string[][])[0]?.[0] ??
          (typeof patchData.error === "string" ? patchData.error : null) ??
          "Unable to save document.";
        throw new Error(msg);
      }

      if (nextStatus === "Sent") {
        const sendResponse = await fetch(`/api/documents/${document.id}/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sendPanel)
        });
        const sendData = await sendResponse.json();

        if (!sendResponse.ok) {
          const msg =
            sendData.error?.formErrors?.[0] ??
            (Object.values(sendData.error?.fieldErrors ?? {}) as string[][])[0]?.[0] ??
            (typeof sendData.error === "string" ? sendData.error : null) ??
            "Unable to send document.";
          throw new Error(msg);
        }


        const token = sendData.document?.signing_token;
        if (token) setSigningUrl(`${window.location.origin}/sign/${token}`);
        setLinkCopied(false);
        setSendStep("success");
      } else {
        showToast("Draft saved successfully", "success");

      }

      router.refresh();
    } catch (caughtError) {
      const msg = caughtError instanceof Error ? caughtError.message : "Unexpected error.";
      setError(msg);
      if (nextStatus === "Sent") {
        setSendStep("confirm");
        showToast("Couldn't send email. Please check the details and try again.", "error");
      } else {
        showToast("Couldn't save draft. Please try again.", "error");
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function getLinkOnly() {
    if (!sendPanel.recipientName.trim() || !sendPanel.recipientEmail.trim()) return;
    setError(null);
    setIsGettingLink(true);
    try {
      const patchResponse = await fetch(`/api/documents/${document.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields,
          title: docTitle,
          senderName,
          senderEmail,
          recipientName: sendPanel.recipientName,
          recipientEmail: sendPanel.recipientEmail,
          emailSubject: sendPanel.emailSubject || `Please sign: ${docTitle}`,
          emailMessage: sendPanel.emailMessage,
        }),
      });
      if (!patchResponse.ok) {
        const d = await patchResponse.json();
        throw new Error(
          d.error?.formErrors?.[0] ?? (typeof d.error === "string" ? d.error : null) ?? "Unable to save."
        );
      }

      const linkResponse = await fetch(`/api/documents/${document.id}/link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientName: sendPanel.recipientName,
          recipientEmail: sendPanel.recipientEmail,
        }),
      });
      const linkData = await linkResponse.json();
      if (!linkResponse.ok) {
        throw new Error(typeof linkData.error === "string" ? linkData.error : "Unable to generate signing link.");
      }

      setSigningUrl(linkData.signingUrl);
      setLinkCopied(false);
      setSendStep("link");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
      showToast("Couldn't generate signing link. Please try again.", "error");
    } finally {
      setIsGettingLink(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Toast stack */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium shadow-card",
              toast.type === "success"
                ? "bg-teal-600 text-white"
                : "bg-rose-600 text-white"
            )}
          >
            {toast.type === "success" ? (
              <Check className="h-4 w-4 shrink-0" />
            ) : (
              <X className="h-4 w-4 shrink-0" />
            )}
            {toast.message}
          </div>
        ))}
      </div>

      {/* Top bar — sticks below the app header (≈64 px) */}
      <div className="sticky top-16 z-40 rounded-[24px] border bg-white/95 shadow-card backdrop-blur">
        {/* Mobile: column (title → buttons). sm+: single row side-by-side. */}
        <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          {/* Title + sender — full width on mobile */}
          <div className="min-w-0 sm:flex-1">
            {isEditingTitle ? (
              <input
                autoFocus
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                onBlur={() => setIsEditingTitle(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === "Escape") setIsEditingTitle(false);
                }}
                className="w-full rounded-lg bg-slate-50 px-2 py-1 text-lg font-semibold text-ink outline-none ring-1 ring-ink/20"
              />
            ) : (
              <button
                type="button"
                onClick={() => { if (!isReadOnly) setIsEditingTitle(true); }}
                className="group flex min-w-0 w-full items-center gap-1.5 text-left"
              >
                <h1 className="truncate text-lg font-semibold text-ink">{docTitle}</h1>
                <Pencil className="h-3.5 w-3.5 shrink-0 text-slate-400 opacity-0 transition group-hover:opacity-100" />
              </button>
            )}

            {isEditingSender ? (
              <div className="mt-1 flex items-center gap-2">
                <input
                  autoFocus
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  onBlur={() => setIsEditingSender(false)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") setIsEditingSender(false); }}
                  placeholder="Sender name"
                  className="w-36 rounded bg-slate-50 px-2 py-0.5 text-xs outline-none ring-1 ring-ink/20"
                />
                <input
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  onBlur={() => setIsEditingSender(false)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") setIsEditingSender(false); }}
                  placeholder="Reply-to email"
                  className="w-44 rounded bg-slate-50 px-2 py-0.5 text-xs outline-none ring-1 ring-ink/20"
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => { if (!isReadOnly) setIsEditingSender(true); }}
                className="group mt-0.5 flex min-w-0 w-full items-center gap-1 text-left"
              >
                <p className="truncate text-sm text-slate-500">
                  {senderName} · {senderEmail}
                </p>
                <Pencil className="h-3 w-3 shrink-0 text-slate-400 opacity-0 transition group-hover:opacity-100" />
              </button>
            )}
          </div>

          {/* Actions row */}
          <div className="flex items-center gap-2 sm:shrink-0">
            {isReadOnly && document.completed_pdf_path ? (
              <a
                href={`/api/documents/${document.id}/completed`}
                download
                className="rounded-full bg-[#2A2726] px-3 py-2.5 text-sm font-medium text-white sm:px-4 sm:py-3"
              >
                <span className="hidden sm:inline">Download completed PDF</span>
                <span className="sm:hidden">Download</span>
              </a>
            ) : null}
            {!isReadOnly && (
            <>
            <a
              href={`/api/documents/${document.id}/preview`}
              download={`${document.title}.pdf`}
              title="Download PDF with fields"
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 sm:gap-2 sm:px-4 sm:py-3"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Download</span>
            </a>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => saveDraft("Draft")}
              className="rounded-full border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-700 disabled:opacity-50 sm:px-4 sm:py-3"
            >
              <span className="hidden sm:inline">Save draft</span>
              <span className="sm:hidden">Save</span>
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => { setSendStep("form"); setLinkCopied(false); setIsSendModalOpen(true); }}
              className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-2.5 text-sm font-medium text-white disabled:opacity-50 sm:gap-2 sm:px-4 sm:py-3"
            >
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">Save and send</span>
              <span className="sm:hidden">Send</span>
            </button>
            </>
            )}
          </div>
        </div>

        {/* Mobile field-type toolbar — row inside sticky bar, scrolls horizontally */}
        {!isReadOnly && (
          <div className="flex gap-1 overflow-x-auto border-t border-slate-100 px-3 pb-2.5 pt-2 xl:hidden">
            {fieldCategories.map((cat, ci) => (
              <div key={cat.label} className="flex shrink-0 gap-1">
                {ci > 0 && <div className="mx-1 w-px self-stretch bg-slate-100" />}
                {cat.tools.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <button
                      key={tool.type}
                      type="button"
                      onClick={() => addField(tool.type)}
                      title={tool.label}
                      className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-700 transition hover:bg-slate-100 active:bg-slate-200"
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {isReadOnly ? (
        <div className="rounded-2xl border border-[#E9967B]/30 bg-[#E9967B]/10 px-4 py-3 text-sm text-[#5f3328]">
          This document is completed and locked. You can preview or download it, but edits and updates are disabled.
        </div>
      ) : null}

      <div className={cn(
        "grid gap-4",
        !isReadOnly && "xl:grid-cols-[260px_minmax(0,1fr)_340px]"
      )}>
        {/* Left sidebar — desktop only */}
        {!isReadOnly && (
        <aside className="hidden rounded-[28px] border bg-white p-4 shadow-card xl:block">
          <div className="space-y-5">
            {fieldCategories.map((cat) => (
              <div key={cat.label}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{cat.label}</p>
                <div className="mt-2 grid gap-1.5">
                  {cat.tools.map((tool) => {
                    const Icon = tool.icon;
                    return (
                      <button
                        key={tool.type}
                        type="button"
                        onClick={() => addField(tool.type)}
                        className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 text-left text-sm transition hover:border-slate-400 hover:bg-slate-50"
                      >
                        <Icon className="h-4 w-4 shrink-0 text-slate-600" />
                        <span className="text-sm text-slate-700">{tool.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

        </aside>
        )}

        <DocumentEditorPreview
          documentId={document.id}
          documentTitle={docTitle}
          fields={fields}
          activeFieldId={activeFieldId}
          onActiveFieldChange={setActiveFieldId}
          onFieldChange={updateField}
          onFieldDuplicate={addDuplicateField}
          onFieldRemove={removeField}
          onCurrentPageChange={setCurrentPage}
          captureFieldId={signatureCaptureFieldId}
          onCaptureHandled={() => setSignatureCaptureFieldId(null)}
          readOnly={isReadOnly}
        />

        {/* Right sidebar — desktop only */}
        {!isReadOnly && <aside className="hidden rounded-[28px] border bg-white p-4 shadow-card xl:block">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Field properties</p>
            {sourceBlocks && !isReadOnly ? (
              <a
                href={`/documents/${document.id}/content`}
                className="mt-4 flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-white hover:text-slate-800"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Edit document
              </a>
            ) : null}
            <div className="mt-4 rounded-2xl border border-[#E9967B]/25 bg-[#E9967B]/5 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9f5844]">Current fields</p>
              <div className="mt-3 max-h-56 space-y-1 overflow-y-auto px-1 pb-1">
                {fields.length === 0 ? (
                  <p className="text-sm text-slate-400">No fields yet.</p>
                ) : (
                  fields.map((field) => (
                    <div
                      key={field.id}
                      className={cn(
                        "group flex items-center justify-between rounded-xl px-3 transition",
                        activeFieldId === field.id
                          ? "bg-[#E9967B]/20 text-[#5f3328] ring-1 ring-[#E9967B]/60"
                          : "text-slate-700 hover:bg-white/70"
                      )}
                      style={{ paddingTop: 10, paddingBottom: 10 }}
                    >
                      {renamingFieldId === field.id ? (
                        <input
                          autoFocus
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onBlur={() => commitRename(field.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitRename(field.id);
                            if (e.key === "Escape") setRenamingFieldId(null);
                          }}
                          className="flex-1 border-b border-current bg-transparent text-sm outline-none"
                          style={{ fontSize: 14 }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setActiveFieldId(field.id)}
                          className="flex-1 truncate text-left text-sm"
                          style={{ fontSize: 14 }}
                        >
                          {field.placeholder}
                        </button>
                      )}

                      <div className="ml-1 flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
                        <button
                          type="button"
                          title="Rename"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => { e.stopPropagation(); startRename(field); }}
                          className="rounded p-1 hover:bg-white/60"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          title="Duplicate"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => { e.stopPropagation(); duplicateField(field.id); }}
                          className="rounded p-1 hover:bg-white/60"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          title="Delete"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => { e.stopPropagation(); removeField(field.id); }}
                          className="rounded p-1 text-rose-500 hover:bg-white/60"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            {activeField ? (
              <div className="mt-4 space-y-3">
                <label className="grid gap-2 text-sm">
                  <span className="font-medium text-slate-700">Page number</span>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={activeField.pageNumber}
                    onChange={(event) =>
                      updateField(activeField.id, { pageNumber: Number(event.target.value) || 1 })
                    }
                    className="h-9 rounded-[6px] border border-slate-200 px-3 text-sm outline-none"
                  />
                </label>

               {/* <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  Drag and resize directly on the document canvas to position this field.
                </p> */}

                <label className="flex min-h-9 items-center gap-3 rounded-[6px] border border-slate-200 px-3 text-sm">
                  <input
                    type="checkbox"
                    checked={activeField.required}
                    onChange={(event) => updateField(activeField.id, { required: event.target.checked })}
                  />
                  Required field
                </label>

                {activeField.type === "signature" || activeField.type === "initials" ? (
                  <button
                    type="button"
                    onClick={() => setSignatureCaptureFieldId(activeField.id)}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-teal-400 bg-teal-50 px-4 py-3 text-sm font-medium text-teal-700 transition hover:bg-teal-100"
                  >
                    <PenLine className="h-4 w-4" />
                    {activeField.type === "initials" ? "Add initials" : "Add signature"}
                  </button>
                ) : activeField.type !== "checkbox" ? (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="grid gap-2 text-sm">
                        <span className="font-medium text-slate-700">Font</span>
                        <select
                          value={activeField.fontFamily}
                          onChange={(event) =>
                            updateField(activeField.id, {
                              fontFamily: event.target.value as FieldFontFamily
                            })
                          }
                          className="h-9 rounded-[6px] border border-slate-200 px-3 text-sm outline-none"
                        >
                          <option value="Helvetica">Helvetica</option>
                          <option value="TimesRoman">Times</option>
                          <option value="Courier">Courier</option>
                        </select>
                      </label>
                      <label className="grid gap-2 text-sm">
                        <span className="font-medium text-slate-700">Weight</span>
                        <select
                          value={activeField.fontWeight}
                          onChange={(event) =>
                            updateField(activeField.id, {
                              fontWeight: event.target.value as FieldDraft["fontWeight"]
                            })
                          }
                          className="h-9 rounded-[6px] border border-slate-200 px-3 text-sm outline-none"
                        >
                          <option value="normal">Regular</option>
                          <option value="bold">Bold</option>
                        </select>
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Font size combo */}
                      <div className="grid gap-2 text-sm">
                        <span className="font-medium text-slate-700">Size</span>
                        <div ref={fontSizeRef} className="relative">
                          <div className="flex h-9 overflow-hidden rounded-[6px] border border-slate-200">
                            <input
                              type="number"
                              min={6}
                              max={72}
                              value={activeField.fontSize}
                              onChange={(e) =>
                                updateField(activeField.id, {
                                  fontSize: Math.max(6, Math.min(72, Number(e.target.value) || 14))
                                })
                              }
                              className="flex-1 bg-transparent px-3 text-sm outline-none [appearance:textfield]"
                            />
                            <button
                              type="button"
                              onClick={() => setFontSizeOpen((v) => !v)}
                              className="border-l border-slate-200 px-2 text-slate-500 hover:bg-slate-50"
                            >
                              <ChevronDown className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          {fontSizeOpen && (
                            <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-card">
                              {FONT_SIZE_OPTIONS.map((s) => (
                                <button
                                  key={s}
                                  type="button"
                                  onClick={() => {
                                    updateField(activeField.id, { fontSize: s });
                                    setFontSizeOpen(false);
                                  }}
                                  className={cn(
                                    "w-full px-4 py-2 text-left text-sm transition hover:bg-slate-50",
                                    activeField.fontSize === s && "bg-slate-100 font-medium"
                                  )}
                                >
                                  {s}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Color swatch */}
                      <div className="grid gap-2 text-sm">
                        <span className="font-medium text-slate-700">Color</span>
                        <div className="relative inline-block">
                          <input
                            type="color"
                            id={`color-${activeField.id}`}
                            value={activeField.textColor}
                            onChange={(event) =>
                              updateField(activeField.id, { textColor: event.target.value })
                            }
                            className="absolute inset-0 h-8 w-8 cursor-pointer opacity-0"
                          />
                          <label
                            htmlFor={`color-${activeField.id}`}
                            className="block h-8 w-8 cursor-pointer rounded-lg border border-slate-300 shadow-sm"
                            style={{ backgroundColor: activeField.textColor }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Options editor for dropdown / radio */}
                    {(activeField.type === "dropdown" || activeField.type === "radio") && (
                      <div className="grid gap-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-slate-700">Options</span>
                          <button
                            type="button"
                            onClick={addOption}
                            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-teal-700 transition hover:bg-teal-50"
                          >
                            <Plus className="h-3 w-3" />
                            Add
                          </button>
                        </div>
                        <div className="space-y-1.5">
                          {(activeField.options ?? ["Option 1", "Option 2", "Option 3"]).map((opt, i) => (
                            <div key={i} className="flex gap-1.5">
                              <input
                                value={opt}
                                onChange={(e) => updateOption(i, e.target.value)}
                                className="h-9 flex-1 rounded-[6px] border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"
                              />
                              <button
                                type="button"
                                onClick={() => removeOption(i)}
                                className="flex items-center justify-center rounded-xl border border-slate-200 px-2 text-slate-400 transition hover:border-rose-300 hover:text-rose-500"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : null}

                <button
                  type="button"
                  onClick={() => removeField(activeField.id)}
                  className="inline-flex items-center gap-2 text-sm text-rose-600"
                >
                  <Eraser className="h-4 w-4" />
                  Delete field
                </button>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">Select a field to update its properties.</p>
            )}
          </div>

          <div className="mt-8 border-t pt-6">
            {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}
          </div>
        </aside>}
      </div>

      {/* Mobile bottom sheet — field properties */}
      {activeField && !isReadOnly ? (
        <div className="fixed bottom-0 left-0 right-0 z-40 xl:hidden">
          <div className="rounded-t-[28px] border-t bg-white px-4 pb-6 pt-4 shadow-[0_-8px_32px_rgba(0,0,0,0.10)]">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200" />
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-ink">{activeField.placeholder}</p>
              <button
                type="button"
                onClick={() => setActiveFieldId(null)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              {activeField.type === "signature" || activeField.type === "initials" ? (
                <button
                  type="button"
                  onClick={() => setSignatureCaptureFieldId(activeField.id)}
                  className="inline-flex items-center gap-2 rounded-xl border border-teal-400 bg-teal-50 px-3 py-2 text-sm font-medium text-teal-700"
                >
                  <PenLine className="h-4 w-4" />
                  {activeField.type === "initials" ? "Add initials" : "Add signature"}
                </button>
              ) : activeField.type !== "checkbox" ? (
                <>
                  {/* Font size */}
                  <div className="relative" ref={fontSizeMobileRef}>
                    <div className="flex h-9 overflow-hidden rounded-[6px] border border-slate-200">
                      <input
                        type="number"
                        min={6}
                        max={72}
                        value={activeField.fontSize}
                        onChange={(e) =>
                          updateField(activeField.id, {
                            fontSize: Math.max(6, Math.min(72, Number(e.target.value) || 14))
                          })
                        }
                        className="w-14 bg-transparent px-3 text-sm outline-none [appearance:textfield]"
                      />
                      <button
                        type="button"
                        onClick={() => setFontSizeMobileOpen((v) => !v)}
                        className="border-l border-slate-200 px-2 text-slate-500 hover:bg-slate-50"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {fontSizeMobileOpen && (
                      <div className="absolute bottom-full left-0 right-0 z-20 mb-1 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-card">
                        {FONT_SIZE_OPTIONS.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => {
                              updateField(activeField.id, { fontSize: s });
                              setFontSizeMobileOpen(false);
                            }}
                            className={cn(
                              "w-full px-4 py-2 text-left text-sm hover:bg-slate-50",
                              activeField.fontSize === s && "bg-slate-100 font-medium"
                            )}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Color */}
                  <div className="relative">
                    <input
                      type="color"
                      id={`color-mobile-${activeField.id}`}
                      value={activeField.textColor}
                      onChange={(e) => updateField(activeField.id, { textColor: e.target.value })}
                      className="absolute inset-0 h-8 w-8 cursor-pointer opacity-0"
                    />
                    <label
                      htmlFor={`color-mobile-${activeField.id}`}
                      className="block h-8 w-8 cursor-pointer rounded-lg border border-slate-300 shadow-sm"
                      style={{ backgroundColor: activeField.textColor }}
                    />
                  </div>
                </>
              ) : null}

              {/* Required toggle */}
              <label className="flex min-h-9 items-center gap-2 rounded-[6px] border border-slate-200 px-3 text-sm">
                <input
                  type="checkbox"
                  checked={activeField.required}
                  onChange={(e) => updateField(activeField.id, { required: e.target.checked })}
                />
                Required
              </label>

              {/* Delete */}
              <button
                type="button"
                onClick={() => removeField(activeField.id)}
                className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600"
              >
                <Eraser className="h-4 w-4" />
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Send modal */}
      {isSendModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-xl rounded-[28px] border bg-white p-6 shadow-card">

            {/* Step 1 — form */}
            {sendStep === "form" ? (
              <>
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Delivery
                    </p>
                    <h3 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
                      Review and send
                    </h3>
                    <p className="mt-2 text-sm text-slate-500">
                      Finalize the recipient details and message before sending the signing link.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsSendModalOpen(false)}
                    className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-3">
                  <label className="grid gap-2 text-sm">
                    <span className="font-medium text-slate-700">Recipient name</span>
                    <input
                      value={sendPanel.recipientName}
                      onChange={(event) =>
                        setSendPanel((current) => ({ ...current, recipientName: event.target.value }))
                      }
                      className="h-9 rounded-[6px] border border-slate-200 px-3 text-sm outline-none"
                    />
                  </label>
                  <label className="grid gap-2 text-sm">
                    <span className="font-medium text-slate-700">Recipient email</span>
                    <input
                      type="email"
                      value={sendPanel.recipientEmail}
                      onChange={(event) =>
                        setSendPanel((current) => ({ ...current, recipientEmail: event.target.value }))
                      }
                      className="h-9 rounded-[6px] border border-slate-200 px-3 text-sm outline-none"
                    />
                  </label>
                  <label className="grid gap-2 text-sm">
                    <span className="font-medium text-slate-700">Email subject</span>
                    <input
                      value={sendPanel.emailSubject}
                      onChange={(event) =>
                        setSendPanel((current) => ({ ...current, emailSubject: event.target.value }))
                      }
                      className="h-9 rounded-[6px] border border-slate-200 px-3 text-sm outline-none"
                    />
                  </label>
                  <label className="grid gap-2 text-sm">
                    <span className="font-medium text-slate-700">Optional message</span>
                    <textarea
                      rows={5}
                      value={sendPanel.emailMessage}
                      onChange={(event) =>
                        setSendPanel((current) => ({ ...current, emailMessage: event.target.value }))
                      }
                      className="rounded-2xl border border-slate-200 px-4 py-3"
                    />
                  </label>
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setIsSendModalOpen(false)}
                    className="rounded-full border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700"
                  >
                    Cancel
                  </button>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={!sendPanel.recipientEmail.trim() || !sendPanel.recipientName.trim() || isGettingLink}
                      onClick={getLinkOnly}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 disabled:opacity-50"
                    >
                      {isGettingLink
                        ? <LoaderCircle className="h-4 w-4 animate-spin" />
                        : <Link2 className="h-4 w-4" />}
                      <span className="hidden sm:inline">Copy link</span>
                    </button>
                    <button
                      type="button"
                      disabled={!sendPanel.recipientEmail.trim() || !sendPanel.recipientName.trim() || isGettingLink}
                      onClick={() => setSendStep("confirm")}
                      className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-3 text-sm font-medium text-white disabled:opacity-50 sm:px-5"
                    >
                      <Send className="h-4 w-4" />
                      <span className="hidden sm:inline">Review &amp; confirm</span>
                      <span className="sm:hidden">Confirm</span>
                    </button>
                  </div>
                </div>
              </>
            ) : null}

            {/* Step 2 — confirm */}
            {sendStep === "confirm" ? (
              <>
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                    <Send className="h-5 w-5 text-amber-600" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsSendModalOpen(false)}
                    className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <h3 className="mt-1 text-xl font-semibold tracking-tight text-ink">
                  Send this document?
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  A signing link will be emailed to{" "}
                  <span className="font-medium text-ink">{sendPanel.recipientName}</span> at{" "}
                  <span className="font-medium text-ink">{sendPanel.recipientEmail}</span>. The
                  document will be locked from further edits once sent.
                </p>

                {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}

                <div className="mt-6 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setSendStep("form")}
                    disabled={isSaving}
                    className="rounded-full border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 disabled:opacity-50"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => saveDraft("Sent")}
                    className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-medium text-white disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    {isSaving ? "Sending…" : "Yes, send now"}
                  </button>
                </div>
              </>
            ) : null}

            {/* Step 3 — success */}
            {sendStep === "success" ? (
              <div className="py-4 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-teal-100">
                  <Check className="h-7 w-7 text-teal-600" />
                </div>
                <h3 className="mt-4 text-xl font-semibold text-ink">Document sent!</h3>
                <p className="mt-2 text-sm text-slate-500">
                  A signing link has been delivered to{" "}
                  <span className="font-medium text-ink">{sendPanel.recipientEmail}</span>. You&apos;ll
                  be notified when they complete signing.
                </p>
                {signingUrl && (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-left">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Signing link</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 truncate rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-700 select-all">
                        {signingUrl}
                      </code>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(signingUrl);
                          setLinkCopied(true);
                          setTimeout(() => setLinkCopied(false), 2000);
                        }}
                        className={cn(
                          "shrink-0 inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition",
                          linkCopied ? "bg-teal-600 text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        )}
                      >
                        {linkCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        {linkCopied ? "Copied!" : "Copy"}
                      </button>
                    </div>
                  </div>
                )}
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => { setIsSendModalOpen(false); router.push("/"); }}
                    className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-medium text-white"
                  >
                    Back to documents
                  </button>
                </div>
              </div>
            ) : null}

            {/* Step 4 — link only */}
            {sendStep === "link" ? (
              <div className="py-2 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-teal-100">
                  <Link2 className="h-7 w-7 text-teal-600" />
                </div>
                <h3 className="mt-4 text-xl font-semibold text-ink">Signing link ready</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Share this link with{" "}
                  <span className="font-medium text-ink">{sendPanel.recipientName}</span> so they can sign.
                </p>
                {signingUrl && (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-left">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Signing link</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 truncate rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-700 select-all">
                        {signingUrl}
                      </code>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(signingUrl);
                          setLinkCopied(true);
                          setTimeout(() => setLinkCopied(false), 2000);
                        }}
                        className={cn(
                          "shrink-0 inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition",
                          linkCopied ? "bg-teal-600 text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        )}
                      >
                        {linkCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        {linkCopied ? "Copied!" : "Copy link"}
                      </button>
                    </div>
                  </div>
                )}
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => { setIsSendModalOpen(false); router.push("/"); }}
                    className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-medium text-white"
                  >
                    Back to documents
                  </button>
                </div>
              </div>
            ) : null}

          </div>
        </div>
      ) : null}
    </div>
  );
}

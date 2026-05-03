"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle, Circle, Download } from "lucide-react";
import type { SigningRequestRecord } from "@/lib/types";
import { SigningDocumentView } from "@/components/signing-document-view";
import { cn } from "@/lib/utils";

export function SigningFlow({ request }: { request: SigningRequestRecord }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [signerName, setSignerName] = useState(request.recipient_name ?? "");
  const [values, setValues] = useState<Record<string, string>>(() => {
    const today = new Date().toISOString().split("T")[0];
    return Object.fromEntries(
      request.document.fields.map((f) => {
        const stored = f.value ?? "";
        if (stored) return [f.id, stored];
        if (f.type === "date-signed") return [f.id, today];
        if (f.type === "full-name") return [f.id, request.recipient_name ?? ""];
        if (f.type === "email") return [f.id, request.recipient_email ?? ""];
        return [f.id, ""];
      })
    );
  });

  const fields = request.document.fields;
  const requiredFields = fields.filter((f) => f.required);
  const completedRequired = requiredFields.filter((f) => !!values[f.id]?.trim()).length;
  const progressPct = requiredFields.length > 0
    ? Math.round((completedRequired / requiredFields.length) * 100)
    : 100;
  const canSubmit = completedRequired === requiredFields.length && !!signerName.trim() && !isPending;

  function updateValue(fieldId: string, value: string) {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
  }

  function submit() {
    if (!canSubmit) return;
    setError(null);

    const signatureField = fields.find((f) => f.type === "signature");
    const signatureDataUrl = signatureField ? (values[signatureField.id] ?? "") : "";

    const fieldValues = fields.map((f) => ({
      fieldId: f.id,
      type: f.type,
      value: values[f.id] ?? ""
    }));

    startTransition(async () => {
      try {
        const response = await fetch(`/api/sign/${request.signing_token}/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ signerName, signatureDataUrl, fieldValues })
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(
            data.error?.formErrors?.[0] ??
            (typeof data.error === "string" ? data.error : null) ??
            "Unable to complete signing."
          );
        }
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unexpected error.");
      }
    });
  }

  if (request.document.status === "Completed") {
    return (
      <section className="mx-auto max-w-lg rounded-[32px] border bg-white p-10 text-center shadow-card">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-teal-50">
          <CheckCircle className="h-8 w-8 text-teal-600" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Document completed</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          This document has been signed. Both the sender and signer received a copy by email
          with the signed PDF and a certificate of completion attached.
        </p>
        <a
          href={`/api/documents/${request.document.id}/completed`}
          download
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          <Download className="h-4 w-4" />
          Download signed PDF
        </a>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-[24px] border bg-white px-6 py-5 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">
              Signing request
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
              {request.document.title}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              From {request.document.sender_name} &middot; {request.document.sender_email}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right text-sm">
              <span className="font-semibold text-ink">{completedRequired}</span>
              <span className="text-slate-400">/{requiredFields.length} required</span>
            </div>
            <div className="h-10 w-10 rounded-full">
              <svg viewBox="0 0 36 36" className="h-10 w-10 -rotate-90">
                <circle cx="18" cy="18" r="15" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="15"
                  fill="none" stroke="#0d9488" strokeWidth="3"
                  strokeDasharray={`${progressPct * 0.942} 94.2`}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        {/* PDF with interactive fields */}
        <SigningDocumentView
          documentId={request.document.id}
          fields={fields}
          values={values}
          onValueChange={updateValue}
        />

        {/* Sidebar */}
        <div className="flex flex-col gap-4">
          {/* Signer identity */}
          <div className="rounded-[28px] border bg-white p-5 shadow-card">
            <h2 className="text-sm font-semibold text-ink">Signing as</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Your name will appear on the certificate of completion.
            </p>
            <input
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="Your full name"
              className="mt-3 h-9 w-full rounded-[6px] border border-slate-200 px-3 text-sm outline-none transition focus:border-ink"
            />
          </div>

          {/* Field checklist */}
          <div className="rounded-[28px] border bg-white p-5 shadow-card">
            <h2 className="text-sm font-semibold text-ink">Fields to complete</h2>

            {/* Progress bar */}
            <div className="mt-3">
              <div className="flex justify-between text-xs text-slate-500">
                <span>{completedRequired} of {requiredFields.length} required fields filled</span>
                <span>{progressPct}%</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-teal-500 transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            {/* Field list */}
            <div className="mt-4 space-y-2">
              {requiredFields.map((field) => {
                const isFilled = !!values[field.id]?.trim();
                return (
                  <div
                    key={field.id}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm",
                      isFilled
                        ? "bg-teal-50"
                        : field.required
                          ? "bg-amber-50"
                          : "bg-slate-50"
                    )}
                  >
                    {isFilled ? (
                      <CheckCircle className="h-4 w-4 shrink-0 text-teal-600" />
                    ) : field.required ? (
                      <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />
                    ) : (
                      <Circle className="h-4 w-4 shrink-0 text-slate-400" />
                    )}
                    <span className={cn("flex-1 truncate", isFilled ? "text-teal-800" : "text-slate-700")}>
                      {field.placeholder}
                    </span>
                    {field.required && !isFilled && (
                      <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-amber-500">
                        Required
                      </span>
                    )}
                    {isFilled && (
                      <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-teal-600">
                        Done
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Submit */}
          <div className="rounded-[28px] border bg-white p-5 shadow-card">
            {error ? (
              <div className="mb-4 flex items-start gap-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
              </div>
            ) : null}

            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit}
              className="w-full rounded-full bg-ink px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
            >
              {isPending ? "Submitting..." : "Complete & sign document"}
            </button>

            {!canSubmit && !isPending && (
              <p className="mt-3 text-center text-xs text-slate-500">
                {!signerName.trim()
                  ? "Enter your name above to continue."
                  : `${requiredFields.length - completedRequired} required field${requiredFields.length - completedRequired !== 1 ? "s" : ""} still need${requiredFields.length - completedRequired === 1 ? "s" : ""} to be filled.`}
              </p>
            )}

            <p className="mt-4 text-center text-xs text-slate-400">
              By submitting you agree this constitutes a legally binding e-signature.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

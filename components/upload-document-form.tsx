"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileUp, LoaderCircle } from "lucide-react";

export function UploadDocumentForm() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  async function handleSubmit(formData: FormData) {
    setError(null);

    startTransition(async () => {
      const response = await fetch("/api/documents", {
        method: "POST",
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error?.formErrors?.[0] ?? data.error ?? "Unable to create document.");
        return;
      }

      router.push(`/documents/${data.document.id}/edit`);
    });
  }

  return (
    <form action={handleSubmit} className="space-y-6 rounded-[28px] border bg-white p-6 shadow-card">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm">
          <span className="font-medium text-slate-700">Sender name</span>
          <input
            name="senderName"
            required
            className="rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-0 transition focus:border-slate-400"
            placeholder="Jane Founder"
          />
        </label>
        <label className="grid gap-2 text-sm">
          <span className="font-medium text-slate-700">Sender email</span>
          <input
            name="senderEmail"
            type="email"
            required
            className="rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-0 transition focus:border-slate-400"
            placeholder="jane@company.com"
          />
        </label>
      </div>

      <label className="grid gap-2 text-sm">
        <span className="font-medium text-slate-700">Document title</span>
        <input
          name="title"
          className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-slate-400"
          placeholder="NDA - Acme Inc"
        />
      </label>

      <div
        onClick={() => fileInputRef.current?.click()}
        className="cursor-pointer rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center transition hover:border-slate-400 hover:bg-slate-100"
      >
        <input
          ref={fileInputRef}
          name="file"
          type="file"
          accept="application/pdf"
          required
          className="hidden"
          onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
        />
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm">
          <FileUp className="h-6 w-6" />
        </div>
        <p className="font-medium text-ink">
          {selectedFile ? selectedFile.name : "Choose a PDF to start"}
        </p>
        <p className="mt-2 text-sm text-slate-500">Click to browse. PDF only, up to 10MB by default.</p>
      </div>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <button
        type="submit"
        disabled={isPending || !selectedFile}
        className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
        Continue to field editor
      </button>
    </form>
  );
}

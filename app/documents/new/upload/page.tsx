import { UploadDocumentForm } from "@/components/upload-document-form";

export default function UploadDocumentPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-700">Upload PDF</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Start with a PDF</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Upload your existing PDF and place signature fields on top. PDF only, up to 10MB by default.
        </p>
      </div>
      <UploadDocumentForm />
    </main>
  );
}

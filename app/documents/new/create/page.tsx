import { DocumentCreator } from "@/components/document-creator";

export default function CreateDocumentPage() {
  return (
    <main className="px-4 py-8 md:px-8">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-700">Create new</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Write your document</h1>
        <p className="mt-2 text-sm text-slate-500">
          Add content blocks and embed fields. We&apos;ll generate a PDF automatically.
        </p>
      </div>
      <DocumentCreator />
    </main>
  );
}

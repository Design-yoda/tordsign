import Link from "next/link";
import { FileUp, PenLine } from "lucide-react";

export default function NewDocumentPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <div className="mb-12 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-700">New document</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">How would you like to start?</h1>
        <p className="mt-3 text-sm text-slate-500">Choose an option below to get started.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/documents/new/upload"
          className="group flex flex-col gap-5 rounded-[28px] border-2 border-slate-200 bg-white p-8 transition hover:border-slate-400 hover:shadow-card"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 transition group-hover:bg-slate-200">
            <FileUp className="h-7 w-7 text-slate-700" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-ink">Upload PDF</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Start with an existing PDF and drag-and-drop signature fields onto the pages.
            </p>
          </div>
          <span className="mt-auto text-sm font-medium text-slate-600 transition group-hover:text-ink">
            Upload a file →
          </span>
        </Link>

        <Link
          href="/documents/new/create"
          className="group flex flex-col gap-5 rounded-[28px] border-2 border-teal-100 bg-teal-50 p-8 transition hover:border-teal-300 hover:shadow-card"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-100 transition group-hover:bg-teal-200">
            <PenLine className="h-7 w-7 text-teal-700" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-ink">Create new</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Write your document from scratch in a Notion-style editor, then embed signature and form fields.
            </p>
          </div>
          <span className="mt-auto text-sm font-medium text-teal-700 transition group-hover:text-teal-900">
            Start writing →
          </span>
        </Link>
      </div>
    </main>
  );
}

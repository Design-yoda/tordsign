import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getRecentDocuments } from "@/lib/data";
import { DocumentList } from "@/components/document-list";

export default async function HomePage() {
  const documents = await getRecentDocuments();

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-10">
      <section className="rounded-[32px] border border-white/70 bg-white/80 p-8 shadow-card backdrop-blur md:p-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-semibold tracking-tight text-ink md:text-5xl">
              Upload. Place fields. Send once. Get the signed PDF back.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-slate-600 md:text-base">
              Tord Sign keeps the product surface narrow: sender uploads a PDF, places fields,
              sends a unique signing link, and both parties receive the completed copy.
            </p>
          </div>
          <Link
            href="/documents/new"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Create new document
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="mt-10 rounded-[28px] border border-slate-200/80 bg-white/85 p-6 shadow-card backdrop-blur">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-ink">Recent documents</h2>
            <p className="text-sm text-slate-500">Draft, sent, completed, and expired records.</p>
          </div>
        </div>

        <DocumentList documents={documents} />
      </section>
    </main>
  );
}

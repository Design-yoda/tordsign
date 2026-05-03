import { notFound } from "next/navigation";
import { getDocumentById } from "@/lib/data";
import { DocumentCreator } from "@/components/document-creator";

export default async function EditContentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const document = await getDocumentById(id);

  if (!document || !document.source_blocks) {
    notFound();
  }

  return (
    <main className="px-4 py-8 md:px-8">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-700">Edit content</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Edit document</h1>
        <p className="mt-2 text-sm text-slate-500">
          Make changes to the document content. Regenerating will rebuild the PDF and reset field positions.
        </p>
      </div>
      <DocumentCreator
        documentId={document.id}
        initialTitle={document.title}
        initialSenderName={document.sender_name}
        initialSenderEmail={document.sender_email}
        initialBlocks={document.source_blocks}
      />
    </main>
  );
}

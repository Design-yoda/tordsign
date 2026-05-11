import { DocumentCreator } from "@/components/document-creator";
import { TEMPLATES } from "@/lib/templates";

export default async function CreateDocumentPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>;
}) {
  const { template } = await searchParams;
  const templateDef = template ? TEMPLATES[template] : undefined;

  return (
    <main className="px-4 py-8 md:px-8">
      <div className="mb-8">
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">
          {templateDef ? templateDef.name : "Write your document"}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Add content blocks and embed fields. We&apos;ll generate a PDF automatically.
        </p>
      </div>
      <DocumentCreator initialBlocks={templateDef?.blocks} initialTitle={templateDef?.name} />
    </main>
  );
}

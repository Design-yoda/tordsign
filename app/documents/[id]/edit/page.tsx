import { notFound } from "next/navigation";
import { EditorShell } from "@/components/editor-shell";
import { getDocumentById } from "@/lib/data";

export default async function EditDocumentPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const document = await getDocumentById(id);

  if (!document) {
    notFound();
  }

  return (
    <main className="min-h-screen px-4 py-4 md:px-6 md:py-6">
      <EditorShell document={document} />
    </main>
  );
}

import { NextResponse } from "next/server";
import { deleteDocument, updateDocumentDraft } from "@/lib/data";
import { renderBlocksToPdf } from "@/lib/pdf";
import { uploadSourcePdf } from "@/lib/storage";
import { updateDocumentSchema } from "@/lib/validators";
import type { FieldDraft } from "@/lib/types";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deleteDocument(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateDocumentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    let input: Parameters<typeof updateDocumentDraft>[1] = parsed.data;

    if (input.sourceBlocks?.length) {
      const title = input.title?.trim() || "Untitled document";
      const { pdfBytes, fields: rawFields } = await renderBlocksToPdf(input.sourceBlocks, title);
      const fileName = `${title.replace(/[^a-zA-Z0-9]/g, "-").slice(0, 40)}.pdf`;
      const sourcePdfPath = await uploadSourcePdf({
        documentId: id,
        fileName,
        bytes: pdfBytes.buffer as ArrayBuffer,
        upsert: true
      });
      const fields: FieldDraft[] = rawFields.map((field) => ({
        ...field,
        recipientEmail: "",
        value: ""
      }));
      input = { ...input, fields, sourcePdfPath };
    }

    const document = await updateDocumentDraft(id, input);
    return NextResponse.json({ document });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

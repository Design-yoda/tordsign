import { NextResponse } from "next/server";
import { getDocumentById, updateDocumentDraft } from "@/lib/data";
import { renderBlocksToPdf } from "@/lib/pdf";
import { uploadSourcePdf } from "@/lib/storage";
import { createFromBlocksSchema } from "@/lib/validators";
import type { FieldDraft } from "@/lib/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await getDocumentById(id);
    if (!existing) {
      return NextResponse.json({ error: "Document not found." }, { status: 404 });
    }

    const body = await request.json();
    const parsed = createFromBlocksSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { title, senderName, senderEmail, blocks, pageSize } = parsed.data;

    const { pdfBytes, fields: rawFields } = await renderBlocksToPdf(blocks, title, pageSize);

    const fileName = `${title.replace(/[^a-zA-Z0-9]/g, "-").slice(0, 40)}.pdf`;
    const storagePath = await uploadSourcePdf({
      documentId: id,
      fileName,
      bytes: pdfBytes.buffer as ArrayBuffer,
      upsert: true,
    });

    const newFields: FieldDraft[] = rawFields.map((f) => ({
      ...f,
      recipientEmail: "",
      value: "",
    }));

    await updateDocumentDraft(id, {
      fields: newFields,
      title,
      senderName,
      senderEmail,
      recipientName: existing.recipient_name ?? "",
      recipientEmail: existing.recipient_email ?? "",
      emailSubject: existing.email_subject ?? "",
      emailMessage: existing.email_message ?? "",
      sourceBlocks: blocks,
      sourcePdfPath: storagePath,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

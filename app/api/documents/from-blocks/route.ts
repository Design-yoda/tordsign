import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { createDraftDocument } from "@/lib/data";
import { renderBlocksToPdf } from "@/lib/pdf";
import { uploadSourcePdf } from "@/lib/storage";
import { createFromBlocksSchema } from "@/lib/validators";
import type { FieldDraft } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createFromBlocksSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { title, senderName, senderEmail, blocks, pageSize, pageMargins } = parsed.data;

    const { pdfBytes, fields: rawFields } = await renderBlocksToPdf(blocks, title, pageSize, pageMargins);

    const docId = nanoid(12);
    const fileName = `${title.replace(/[^a-zA-Z0-9]/g, "-").slice(0, 40)}.pdf`;

    const storagePath = await uploadSourcePdf({
      documentId: docId,
      fileName,
      bytes: pdfBytes.buffer as ArrayBuffer
    });

    const initialFields: FieldDraft[] = rawFields.map((f) => ({
      ...f,
      recipientEmail: "",
      value: ""
    }));

    const document = await createDraftDocument({
      title,
      fileName,
      senderName,
      senderEmail,
      sourcePdfPath: storagePath,
      initialFields,
      sourceBlocks: blocks,
      pageSize,
      pageMargins,
    });

    return NextResponse.json({ document });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

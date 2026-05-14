import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { createDraftDocument } from "@/lib/data";
import { createDocumentSchema } from "@/lib/validators";
import { uploadSourcePdf } from "@/lib/storage";
import { trackSessionDocument } from "@/lib/session-documents";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    const payload = createDocumentSchema.safeParse({
      title: formData.get("title"),
      senderName: formData.get("senderName"),
      senderEmail: formData.get("senderEmail")
    });

    if (!payload.success) {
      return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });
    }

    if (!(file instanceof File) || file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF files are supported." }, { status: 400 });
    }

    const maxFileSize = Number(process.env.MAX_UPLOAD_MB ?? "10") * 1024 * 1024;

    if (file.size > maxFileSize) {
      return NextResponse.json(
        { error: `File exceeds ${process.env.MAX_UPLOAD_MB ?? "10"}MB upload limit.` },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const storagePath = await uploadSourcePdf({
      documentId: nanoid(12),
      fileName: file.name,
      bytes: arrayBuffer
    });

    const document = await createDraftDocument({
      title: payload.data.title || file.name.replace(/\.pdf$/i, ""),
      fileName: file.name,
      senderName: payload.data.senderName,
      senderEmail: payload.data.senderEmail,
      sourcePdfPath: storagePath
    });

    const response = NextResponse.json({ document });
    trackSessionDocument(response, request.cookies, document.id);
    return response;
  } catch (error) {
    console.error("[POST /api/documents]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

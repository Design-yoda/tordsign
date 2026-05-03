import { NextResponse } from "next/server";
import { getDocumentById } from "@/lib/data";
import { fetchStoredPdf } from "@/lib/storage";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const document = await getDocumentById(id);

  if (!document) {
    return new NextResponse("Document not found.", { status: 404 });
  }

  try {
    const pdfBytes = await fetchStoredPdf(document.source_pdf_path);

    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    return new NextResponse(
      error instanceof Error ? error.message : "Unable to load source PDF.",
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { getDocumentById } from "@/lib/data";
import { fetchStoredPdf } from "@/lib/storage";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const document = await getDocumentById(id);

    if (!document || !document.completed_pdf_path) {
      return NextResponse.json({ error: "Completed document not found." }, { status: 404 });
    }

    const bytes = await fetchStoredPdf(document.completed_pdf_path);
    const safeName = document.title.replace(/[^a-zA-Z0-9\s-]/g, "").trim().replace(/\s+/g, "-") || "document";

    return new Response(bytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeName}-signed.pdf"`
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

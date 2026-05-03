import { NextResponse } from "next/server";
import { completeSigningRequest, getSigningRequestByToken } from "@/lib/data";
import { sendCompletedEmail } from "@/lib/email";
import { renderCompletedPdf } from "@/lib/pdf";
import { uploadCompletedPdf } from "@/lib/storage";
import { completeSigningSchema } from "@/lib/validators";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await request.json();
    const parsed = completeSigningSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const signingRequest = await getSigningRequestByToken(token);
    if (!signingRequest) {
      return NextResponse.json({ error: "Signing request not found." }, { status: 404 });
    }

    const completedAt = new Date().toISOString();
    const signerIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "Unknown";
    const userAgent = request.headers.get("user-agent") ?? undefined;

    const pdfBytes = await renderCompletedPdf(
      signingRequest.document,
      parsed.data.fieldValues,
      { signerName: parsed.data.signerName, completedAt, signerIp, userAgent }
    );

    const completedPdfPath = await uploadCompletedPdf({
      documentId: signingRequest.document.id,
      bytes: pdfBytes
    });

    const completedDocument = await completeSigningRequest(signingRequest.document.id, {
      completedPdfPath,
      fieldValues: parsed.data.fieldValues,
      signerName: parsed.data.signerName,
      signerEmail: signingRequest.recipient_email,
      signatureDataUrl: parsed.data.signatureDataUrl
    });

    await sendCompletedEmail(completedDocument);

    return NextResponse.json({ document: completedDocument });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

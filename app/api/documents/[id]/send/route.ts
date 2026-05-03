import { NextResponse } from "next/server";
import { markDocumentSent } from "@/lib/data";
import { sendSigningEmail } from "@/lib/email";
import { sendDocumentSchema } from "@/lib/validators";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = sendDocumentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const senderIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      undefined;

    const document = await markDocumentSent(id, { ...parsed.data, senderIp });
    await sendSigningEmail(document);

    return NextResponse.json({ document });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

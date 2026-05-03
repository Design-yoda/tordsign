import { NextResponse } from "next/server";
import { z } from "zod";
import { markDocumentSent } from "@/lib/data";

const getLinkSchema = z.object({
  recipientName: z.string().min(1),
  recipientEmail: z.string().email(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = getLinkSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { recipientName, recipientEmail } = parsed.data;

    const document = await markDocumentSent(id, {
      recipientName,
      recipientEmail,
      emailSubject: `Please sign`,
    });

    const origin = new URL(request.url).origin;
    const signingUrl = `${origin}/sign/${document.signing_token}`;

    return NextResponse.json({ signingUrl, document });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

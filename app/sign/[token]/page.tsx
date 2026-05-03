import { notFound } from "next/navigation";
import { SigningFlow } from "@/components/signing-flow";
import { getSigningRequestByToken } from "@/lib/data";

export default async function SigningPage({
  params
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const request = await getSigningRequestByToken(token);

  if (!request) {
    notFound();
  }

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-8 md:px-6">
      <SigningFlow request={request} />
    </main>
  );
}

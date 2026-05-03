import { getEnv } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase";

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9.\-_]/g, "-");
}

export async function uploadSourcePdf(input: {
  documentId: string;
  fileName: string;
  bytes: ArrayBuffer;
  upsert?: boolean;
}) {
  const env = getEnv();
  const supabase = createServerSupabaseClient();
  const path = `source/${input.documentId}/${sanitizeFileName(input.fileName)}`;

  const { error } = await supabase.storage
    .from(env.SUPABASE_STORAGE_BUCKET)
    .upload(path, input.bytes, {
      contentType: "application/pdf",
      upsert: input.upsert ?? false
    });

  if (error) {
    throw new Error(error.message);
  }

  return path;
}

export async function fetchStoredPdf(path: string) {
  const env = getEnv();
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.storage.from(env.SUPABASE_STORAGE_BUCKET).download(path);

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to download PDF.");
  }

  return data.arrayBuffer();
}

export async function uploadCompletedPdf(input: {
  documentId: string;
  bytes: Uint8Array;
}) {
  const env = getEnv();
  const supabase = createServerSupabaseClient();
  const path = `completed/${input.documentId}/signed.pdf`;
  const { error } = await supabase.storage.from(env.SUPABASE_STORAGE_BUCKET).upload(path, input.bytes, {
    contentType: "application/pdf",
    upsert: true
  });

  if (error) {
    throw new Error(error.message);
  }

  return path;
}

import { nanoid } from "nanoid";
import { hasEnv } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase";
import type { AuditEvent, CompletedFieldValue, DocumentBlock, DocumentRecord, FieldDraft, PageMargins, PageSize, SigningRequestRecord } from "@/lib/types";

type DocumentRow = Omit<DocumentRecord, "fields" | "audit_trail"> & {
  fields: unknown;
  audit_trail: unknown;
};

function normalizeDocument(row: DocumentRow): DocumentRecord {
  const rawFields = ((row.fields as FieldDraft[]) ?? []).map((field) => ({
    ...field,
    fontFamily: field.fontFamily ?? "Helvetica",
    fontSize: field.fontSize ?? 14,
    fontWeight: field.fontWeight ?? "normal",
    textColor: field.textColor ?? "#0f172a"
  }));

  const auditTrail = (row.audit_trail as AuditEvent[]) ?? [];
  const latestContentEvent = [...auditTrail]
    .reverse()
    .find((event) => event.metadata?.sourceBlocks);

  let sourceBlocks: DocumentBlock[] | undefined;
  if (latestContentEvent?.metadata?.sourceBlocks) {
    try {
      sourceBlocks = JSON.parse(latestContentEvent.metadata.sourceBlocks) as DocumentBlock[];
    } catch {
      sourceBlocks = undefined;
    }
  }

  let sourcePageSize: PageSize | undefined;
  let sourcePageMargins: PageMargins | undefined;
  if (latestContentEvent?.metadata?.pageSize) {
    sourcePageSize = latestContentEvent.metadata.pageSize as PageSize;
  }
  if (latestContentEvent?.metadata?.pageMargins) {
    try {
      sourcePageMargins = JSON.parse(latestContentEvent.metadata.pageMargins) as PageMargins;
    } catch {
      sourcePageMargins = undefined;
    }
  }

  return {
    ...row,
    fields: rawFields,
    audit_trail: auditTrail,
    source_blocks: sourceBlocks,
    source_page_size: sourcePageSize,
    source_page_margins: sourcePageMargins,
  };
}

export async function getRecentDocuments() {
  if (!hasEnv()) {
    return [];
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(12);

  if (error || !data) {
    return [];
  }

  return data.map((row) => normalizeDocument(row as DocumentRow));
}

export async function getDocumentById(id: string) {
  if (!hasEnv()) {
    return null;
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from("documents").select("*").eq("id", id).single();

  if (error || !data) {
    return null;
  }

  return normalizeDocument(data as DocumentRow);
}

export async function createDraftDocument(input: {
  title: string;
  fileName: string;
  senderName: string;
  senderEmail: string;
  sourcePdfPath: string;
  initialFields?: FieldDraft[];
  sourceBlocks?: DocumentBlock[];
  pageSize?: PageSize;
  pageMargins?: PageMargins;
}) {
  const supabase = createServerSupabaseClient();
  const contentMeta: Record<string, string> = {};
  if (input.sourceBlocks) contentMeta.sourceBlocks = JSON.stringify(input.sourceBlocks);
  if (input.pageSize) contentMeta.pageSize = input.pageSize;
  if (input.pageMargins) contentMeta.pageMargins = JSON.stringify(input.pageMargins);

  const initialAudit: AuditEvent[] = [
    {
      action: "draft_created",
      actorEmail: input.senderEmail,
      timestamp: new Date().toISOString(),
      ...(Object.keys(contentMeta).length ? { metadata: contentMeta } : {})
    }
  ];

  const { data, error } = await supabase
    .from("documents")
    .insert({
      title: input.title,
      file_name: input.fileName,
      source_pdf_path: input.sourcePdfPath,
      sender_name: input.senderName,
      sender_email: input.senderEmail,
      status: "Draft",
      fields: input.initialFields ?? [],
      audit_trail: initialAudit
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to create document.");
  }

  return normalizeDocument(data as DocumentRow);
}

export async function updateDocumentDraft(
  id: string,
  input: {
    fields: FieldDraft[];
    title?: string;
    senderName?: string;
    senderEmail?: string;
    recipientName: string;
    recipientEmail: string;
    emailSubject: string;
    emailMessage?: string;
    sourceBlocks?: DocumentBlock[];
    sourcePdfPath?: string;
    pageSize?: PageSize;
    pageMargins?: PageMargins;
  }
) {
  const document = await getDocumentById(id);
  if (!document) {
    throw new Error("Document not found.");
  }
  if (document.status === "Completed") {
    throw new Error("Completed documents are read-only.");
  }

  const updateMeta: Record<string, string> = {};
  if (input.sourceBlocks) updateMeta.sourceBlocks = JSON.stringify(input.sourceBlocks);
  if (input.pageSize) updateMeta.pageSize = input.pageSize;
  if (input.pageMargins) updateMeta.pageMargins = JSON.stringify(input.pageMargins);

  const auditTrail = [
    ...document.audit_trail,
    {
      action: "draft_updated",
      actorEmail: document.sender_email,
      timestamp: new Date().toISOString(),
      ...(Object.keys(updateMeta).length ? { metadata: updateMeta } : {})
    }
  ];

  const updatePayload: Record<string, unknown> = {
    fields: input.fields,
    ...(input.sourcePdfPath ? { source_pdf_path: input.sourcePdfPath } : {}),
    recipient_name: input.recipientName,
    recipient_email: input.recipientEmail,
    email_subject: input.emailSubject,
    email_message: input.emailMessage ?? "",
    audit_trail: auditTrail
  };

  if (input.title?.trim()) updatePayload.title = input.title.trim();
  if (input.senderName?.trim()) updatePayload.sender_name = input.senderName.trim();
  if (input.senderEmail?.trim()) updatePayload.sender_email = input.senderEmail.trim();

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("documents")
    .update(updatePayload)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to update document.");
  }

  return normalizeDocument(data as DocumentRow);
}

export async function markDocumentSent(
  id: string,
  input: {
    recipientName: string;
    recipientEmail: string;
    emailSubject: string;
    emailMessage?: string;
    senderIp?: string;
  }
) {
  const document = await getDocumentById(id);
  if (!document) {
    throw new Error("Document not found.");
  }
  if (document.status === "Completed") {
    throw new Error("Completed documents are read-only.");
  }

  const token = document.signing_token ?? nanoid(32);
  const auditTrail = [
    ...document.audit_trail,
    {
      action: "sent",
      actorEmail: document.sender_email,
      timestamp: new Date().toISOString(),
      metadata: {
        recipientEmail: input.recipientEmail,
        ...(input.senderIp ? { senderIp: input.senderIp } : {})
      }
    }
  ];

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("documents")
    .update({
      recipient_name: input.recipientName,
      recipient_email: input.recipientEmail,
      email_subject: input.emailSubject,
      email_message: input.emailMessage ?? "",
      signing_token: token,
      status: "Sent",
      audit_trail: auditTrail
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to mark document as sent.");
  }

  return normalizeDocument(data as DocumentRow);
}

export async function getSigningRequestByToken(token: string): Promise<SigningRequestRecord | null> {
  if (!hasEnv()) {
    return null;
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("signing_token", token)
    .single();

  if (error || !data) {
    return null;
  }

  const document = normalizeDocument(data as DocumentRow);

  if (!document.recipient_email || !document.recipient_name || !document.signing_token) {
    return null;
  }

  return {
    signing_token: document.signing_token,
    recipient_email: document.recipient_email,
    recipient_name: document.recipient_name,
    document
  };
}

export async function deleteDocument(id: string) {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) {
    throw new Error(error.message ?? "Unable to delete document.");
  }
}

export async function completeSigningRequest(
  documentId: string,
  input: {
    completedPdfPath: string;
    signerName: string;
    signerEmail: string;
    signatureDataUrl: string;
    fieldValues: CompletedFieldValue[];
  }
) {
  const document = await getDocumentById(documentId);
  if (!document) {
    throw new Error("Document not found.");
  }
  if (document.status === "Completed") {
    throw new Error("Document is already completed.");
  }

  const auditTrail = [
    ...document.audit_trail,
    {
      action: "completed",
      actorEmail: input.signerEmail,
      timestamp: new Date().toISOString(),
      metadata: {
        signerName: input.signerName
      }
    }
  ];

  const filledFields = document.fields.map((field) => {
    const nextValue = input.fieldValues.find((value) => value.fieldId === field.id);
    return {
      ...field,
      value: nextValue?.value ?? field.value
    };
  });

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("documents")
    .update({
      completed_pdf_path: input.completedPdfPath,
      status: "Completed",
      fields: filledFields,
      audit_trail: auditTrail
    })
    .eq("id", documentId)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to complete document.");
  }

  return normalizeDocument(data as DocumentRow);
}

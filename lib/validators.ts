import { z } from "zod";

const fieldTypeEnum = z.enum([
  "signature",
  "initials",
  "date-signed",
  "full-name",
  "email",
  "company",
  "job-title",
  "text",
  "date",
  "checkbox",
  "dropdown",
  "radio"
]);

const fieldSchema = z.object({
  id: z.string(),
  type: fieldTypeEnum,
  pageNumber: z.number().int().min(1),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().min(0).max(1),
  height: z.number().min(0).max(1),
  required: z.boolean(),
  recipientEmail: z.string().email().or(z.literal("")),
  placeholder: z.string().min(1),
  value: z.string(),
  fontFamily: z.enum(["Helvetica", "TimesRoman", "Courier"]),
  fontSize: z.number().min(6).max(72),
  fontWeight: z.enum(["normal", "bold"]),
  textColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  options: z.array(z.string()).optional()
});

export const createDocumentSchema = z.object({
  title: z.string().optional().default(""),
  senderName: z.string().min(1),
  senderEmail: z.string().email()
});

export const updateDocumentSchema = z.object({
  fields: z.array(fieldSchema),
  sourceBlocks: z.array(
    z.object({
      id: z.string(),
      type: z.enum(["paragraph", "heading1", "heading2", "heading3", "bullet", "numbered", "quote", "divider", "field"]),
      content: z.string(),
      highlighted: z.boolean().optional(),
      textColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
      backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
      fieldType: fieldTypeEnum.optional(),
      fieldLabel: z.string().optional(),
      fieldOptions: z.array(z.string()).optional()
    })
  ).optional(),
  title: z.string().optional(),
  senderName: z.string().optional(),
  senderEmail: z.string().email().or(z.literal("")).optional(),
  recipientName: z.string(),
  recipientEmail: z.string().email().or(z.literal("")),
  emailSubject: z.string(),
  emailMessage: z.string().optional()
});

export const sendDocumentSchema = z.object({
  recipientName: z.string().min(1),
  recipientEmail: z.string().email(),
  emailSubject: z.string().min(1),
  emailMessage: z.string().optional()
});

export const completeSigningSchema = z.object({
  signerName: z.string().min(1),
  signatureDataUrl: z.string().optional().default(""),
  fieldValues: z.array(
    z.object({
      fieldId: z.string(),
      type: fieldTypeEnum,
      value: z.string()
    })
  )
});

const segmentSchema = z.object({
  text: z.string(),
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
  underline: z.boolean().optional(),
  color: z.string().optional(),
  fontSize: z.number().optional(),
  fontFamily: z.string().optional(),
});

const blockSchema = z.object({
  id: z.string(),
  type: z.enum(["paragraph", "heading1", "heading2", "heading3", "bullet", "numbered", "quote", "divider", "field"]),
  content: z.string(),
  segments: z.array(segmentSchema).optional(),
  highlighted: z.boolean().optional(),
  textColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  textAlign: z.enum(["left", "center", "right", "justify"]).optional(),
  fieldType: fieldTypeEnum.optional(),
  fieldLabel: z.string().optional(),
  fieldOptions: z.array(z.string()).optional()
});

export const createFromBlocksSchema = z.object({
  title: z.string().min(1),
  senderName: z.string().min(1),
  senderEmail: z.string().email(),
  blocks: z.array(blockSchema),
  pageSize: z.enum(["a4", "letter", "legal", "a5"]).optional().default("a4"),
});

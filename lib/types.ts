export type DocumentStatus = "Draft" | "Sent" | "Completed" | "Expired";

export type PageSize = "a4" | "letter" | "legal" | "a5";

export type PageMargins = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export type FieldType =
  | "signature"
  | "initials"
  | "date-signed"
  | "full-name"
  | "email"
  | "company"
  | "job-title"
  | "text"
  | "date"
  | "checkbox"
  | "dropdown"
  | "radio"
  | "image";

export type FieldFontFamily = "Helvetica" | "TimesRoman" | "Courier";
export type FieldFontWeight = "normal" | "bold";

export type FieldDraft = {
  id: string;
  type: FieldType;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  required: boolean;
  recipientEmail: string;
  placeholder: string;
  value: string;
  fontFamily: FieldFontFamily;
  fontSize: number;
  fontWeight: FieldFontWeight;
  textColor: string;
  options?: string[];
};

export type DocumentRecord = {
  id: string;
  title: string;
  file_name: string;
  source_pdf_path: string;
  completed_pdf_path: string | null;
  sender_name: string;
  sender_email: string;
  recipient_name: string | null;
  recipient_email: string | null;
  email_subject: string | null;
  email_message: string | null;
  signing_token: string | null;
  status: DocumentStatus;
  fields: FieldDraft[];
  audit_trail: AuditEvent[];
  source_blocks?: DocumentBlock[];
  source_page_size?: PageSize;
  source_page_margins?: PageMargins;
  updated_at: string;
};

export type AuditEvent = {
  action: string;
  actorEmail: string;
  timestamp: string;
  metadata?: Record<string, string>;
};

export type SigningRequestRecord = {
  signing_token: string;
  recipient_email: string;
  recipient_name: string;
  document: DocumentRecord;
};

export type CompletedFieldValue = {
  fieldId: string;
  type: FieldType;
  value: string;
};

export type TextSegment = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
  fontSize?: number;
  fontFamily?: string;
};

// Block editor types for "Create new document" flow
export type DocumentBlockType =
  | "paragraph"
  | "heading1"
  | "heading2"
  | "heading3"
  | "bullet"
  | "numbered"
  | "quote"
  | "divider"
  | "field"
  | "pageBreak"
  | "checkboxItem"
  | "radioGroup"
  | "image";

export type DocumentBlock = {
  id: string;
  type: DocumentBlockType;
  content: string;
  segments?: TextSegment[];
  highlighted?: boolean;
  textColor?: string;
  backgroundColor?: string;
  textAlign?: "left" | "center" | "right" | "justify";
  fieldType?: FieldType;
  fieldLabel?: string;
  fieldOptions?: string[];
  imageWidthPct?: number;
};

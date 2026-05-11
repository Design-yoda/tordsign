import type { DocumentBlock } from "@/lib/types";

export type TemplateDefinition = {
  id: string;
  name: string;
  description: string;
  category: string;
  blocks: DocumentBlock[];
};

function b(
  id: string,
  type: DocumentBlock["type"],
  content: string,
  extra?: Partial<Omit<DocumentBlock, "id" | "type" | "content">>
): DocumentBlock {
  return { id, type, content, ...extra };
}

// ─── 1. Non-Disclosure Agreement ─────────────────────────────────────────────

const ndaBlocks: DocumentBlock[] = [
  b("n1", "heading1", "Non-Disclosure Agreement"),
  b("n2", "paragraph", 'This Non-Disclosure Agreement ("Agreement") is entered into as of the date signed below, between the Disclosing Party and the Receiving Party.'),
  b("n3", "heading2", "1. Confidential Information"),
  b("n4", "paragraph", '"Confidential Information" means any non-public information disclosed by either party, whether in writing, orally, or by any other means, that is designated as confidential or that reasonably should be understood to be confidential given the nature of the information and the circumstances of disclosure.'),
  b("n5", "heading2", "2. Obligations of Receiving Party"),
  b("n6", "paragraph", "The Receiving Party agrees to: (a) hold the Confidential Information in strict confidence; (b) not disclose it to any third party without prior written consent of the Disclosing Party; and (c) use it solely to evaluate a potential business relationship."),
  b("n7", "heading2", "3. Exceptions"),
  b("n8", "paragraph", "These obligations do not apply to information that: (a) is or becomes publicly known through no breach by the Receiving Party; (b) is rightfully received from a third party without restriction; or (c) is independently developed without use of Confidential Information."),
  b("n9", "heading2", "4. Term"),
  b("n10", "paragraph", "This Agreement remains in effect for two (2) years from the date of execution, unless earlier terminated in writing by mutual agreement."),
  b("n11", "heading2", "5. Governing Law"),
  b("n12", "paragraph", "This Agreement is governed by applicable law. Any disputes shall be resolved through binding arbitration in the applicable jurisdiction."),
  b("n13", "divider", ""),
  b("n14", "paragraph", "By signing below, the parties agree to be bound by the terms of this Agreement."),
  b("n15", "field", "Full Name", { fieldType: "full-name", fieldLabel: "Full Name" }),
  b("n16", "field", "Company", { fieldType: "company", fieldLabel: "Company" }),
  b("n17", "field", "Signature", { fieldType: "signature", fieldLabel: "Signature" }),
  b("n18", "field", "Date Signed", { fieldType: "date-signed", fieldLabel: "Date Signed" }),
];

// ─── 2. Freelance Service Agreement ──────────────────────────────────────────

const serviceBlocks: DocumentBlock[] = [
  b("s1", "heading1", "Service Agreement"),
  b("s2", "paragraph", 'This Service Agreement ("Agreement") is made between the Client and Service Provider named below, effective as of the date signed.'),
  b("s3", "heading2", "1. Services"),
  b("s4", "paragraph", "Service Provider agrees to perform the following services for Client: [describe the scope of services in detail here]. All work shall be completed professionally and in accordance with any timelines agreed in writing."),
  b("s5", "heading2", "2. Payment Terms"),
  b("s6", "paragraph", "Client agrees to pay Service Provider the agreed fee. Payment is due within 30 days of invoice. Late payments accrue interest at 1.5% per month. Client shall not withhold payment for work completed to specification."),
  b("s7", "heading2", "3. Intellectual Property"),
  b("s8", "paragraph", "Upon receipt of full payment, all deliverables created specifically for Client under this Agreement become the property of Client. Service Provider retains ownership of all pre-existing tools, code, frameworks, and general methodologies."),
  b("s9", "heading2", "4. Confidentiality"),
  b("s10", "paragraph", "Both parties agree to keep confidential any proprietary or sensitive information shared during this engagement, and not to use such information for any purpose outside this Agreement."),
  b("s11", "heading2", "5. Termination"),
  b("s12", "paragraph", "Either party may terminate this Agreement with 14 days written notice. Client shall pay for all work completed to the date of termination. Cancellation of work in progress without cause may incur a kill fee."),
  b("s13", "heading2", "6. Limitation of Liability"),
  b("s14", "paragraph", "Service Provider's total liability shall not exceed the fees paid under this Agreement. Neither party is liable for indirect, incidental, or consequential damages."),
  b("s15", "divider", ""),
  b("s16", "field", "Full Name", { fieldType: "full-name", fieldLabel: "Client Full Name" }),
  b("s17", "field", "Email Address", { fieldType: "email", fieldLabel: "Client Email" }),
  b("s18", "field", "Signature", { fieldType: "signature", fieldLabel: "Client Signature" }),
  b("s19", "field", "Date Signed", { fieldType: "date-signed", fieldLabel: "Date Signed" }),
];

// ─── 3. Employment Offer Letter ───────────────────────────────────────────────

const offerLetterBlocks: DocumentBlock[] = [
  b("o1", "heading1", "Employment Offer Letter"),
  b("o2", "paragraph", "Dear [Candidate Name],"),
  b("o3", "paragraph", "We are delighted to offer you the position of [Job Title] at [Company Name]. This letter summarises the terms of our offer, subject to your acceptance and the conditions below."),
  b("o4", "heading2", "Position Details"),
  b("o5", "bullet", "Title: [Job Title]"),
  b("o6", "bullet", "Department: [Department]"),
  b("o7", "bullet", "Reports to: [Manager Name]"),
  b("o8", "bullet", "Start Date: [Start Date]"),
  b("o9", "bullet", "Employment type: Full-time, permanent"),
  b("o10", "heading2", "Compensation"),
  b("o11", "paragraph", "Base Salary: [Salary Amount] per year, paid [monthly / bi-weekly]. You may also be eligible for a discretionary annual performance bonus, subject to company and individual results."),
  b("o12", "heading2", "Benefits"),
  b("o13", "bullet", "Health, dental, and vision insurance"),
  b("o14", "bullet", "401(k) with company match (if applicable)"),
  b("o15", "bullet", "[X] days paid annual leave"),
  b("o16", "bullet", "Remote / hybrid working options (where applicable)"),
  b("o17", "heading2", "Conditions of Employment"),
  b("o18", "paragraph", "This offer is contingent upon satisfactory completion of a background check and verification of your right to work. Employment is at-will and may be terminated by either party at any time with appropriate notice."),
  b("o19", "paragraph", "Please sign below to confirm your acceptance of this offer. We look forward to welcoming you to the team."),
  b("o20", "divider", ""),
  b("o21", "field", "Full Name", { fieldType: "full-name", fieldLabel: "Candidate Full Name" }),
  b("o22", "field", "Initials", { fieldType: "initials", fieldLabel: "Initials" }),
  b("o23", "field", "Signature", { fieldType: "signature", fieldLabel: "Signature" }),
  b("o24", "field", "Date Signed", { fieldType: "date-signed", fieldLabel: "Date Signed" }),
];

// ─── 4. Consulting Agreement ──────────────────────────────────────────────────

const consultingBlocks: DocumentBlock[] = [
  b("c1", "heading1", "Consulting Agreement"),
  b("c2", "paragraph", 'This Consulting Agreement ("Agreement") is entered into between the Client and Consultant identified below.'),
  b("c3", "heading2", "1. Scope of Work"),
  b("c4", "paragraph", "Consultant agrees to provide consulting services in the area of [strategy / technology / marketing / finance — specify]. Specific deliverables, milestones, and timelines will be mutually agreed in a written Statement of Work prior to commencement."),
  b("c5", "heading2", "2. Fees and Expenses"),
  b("c6", "paragraph", "Client agrees to pay Consultant at a rate of [$ amount] per [hour / day / project]. Invoices are payable within 30 days. Pre-approved out-of-pocket expenses will be reimbursed upon submission of receipts."),
  b("c7", "heading2", "3. Independent Contractor"),
  b("c8", "paragraph", "Consultant is an independent contractor, not an employee of Client. Consultant is solely responsible for all applicable taxes on compensation received and is not entitled to employee benefits."),
  b("c9", "heading2", "4. Intellectual Property"),
  b("c10", "paragraph", "Work product created exclusively for Client under this Agreement vests in Client upon receipt of full payment. Consultant retains all rights to pre-existing tools, methodologies, and background intellectual property."),
  b("c11", "heading2", "5. Non-Solicitation"),
  b("c12", "paragraph", "During the term and for 12 months thereafter, neither party will solicit or hire the other party's employees or key contractors without prior written consent."),
  b("c13", "heading2", "6. Termination"),
  b("c14", "paragraph", "Either party may terminate this Agreement with 14 days written notice. Outstanding fees for work completed remain payable upon termination."),
  b("c15", "divider", ""),
  b("c16", "field", "Full Name", { fieldType: "full-name", fieldLabel: "Full Name" }),
  b("c17", "field", "Company", { fieldType: "company", fieldLabel: "Company" }),
  b("c18", "field", "Job Title", { fieldType: "job-title", fieldLabel: "Job Title" }),
  b("c19", "field", "Signature", { fieldType: "signature", fieldLabel: "Signature" }),
  b("c20", "field", "Date Signed", { fieldType: "date-signed", fieldLabel: "Date Signed" }),
];

// ─── 5. Residential Rental Agreement ─────────────────────────────────────────

const rentalBlocks: DocumentBlock[] = [
  b("r1", "heading1", "Residential Rental Agreement"),
  b("r2", "paragraph", 'This Rental Agreement ("Agreement") is made between the Landlord and Tenant named below, for the property at: [Property Address].'),
  b("r3", "heading2", "1. Lease Term"),
  b("r4", "paragraph", "This lease commences on [Start Date] and expires on [End Date], unless extended in writing. After expiration, the tenancy converts to a rolling month-to-month arrangement until either party gives 30 days written notice."),
  b("r5", "heading2", "2. Rent"),
  b("r6", "paragraph", "Monthly rent: $[Amount], due on the 1st of each month. A late fee of $[Fee] applies to payments received after the 5th. Rent is payable to Landlord at [address / bank account]."),
  b("r7", "heading2", "3. Security Deposit"),
  b("r8", "paragraph", "Tenant shall pay a security deposit of $[Amount] prior to moving in. The deposit will be returned within [X] days of vacating, minus any lawful deductions for damage beyond normal wear and tear."),
  b("r9", "heading2", "4. Tenant Responsibilities"),
  b("r10", "bullet", "Keep the property clean and in good condition."),
  b("r11", "bullet", "No alterations or modifications without Landlord's prior written consent."),
  b("r12", "bullet", "Tenant is responsible for utilities unless otherwise agreed in writing."),
  b("r13", "bullet", "No subletting or assignment without Landlord's written approval."),
  b("r14", "bullet", "Promptly report any maintenance issues or damage to the Landlord."),
  b("r15", "heading2", "5. Termination"),
  b("r16", "paragraph", "At the end of the lease term, either party may terminate by giving 30 days written notice. Early termination by Tenant may result in forfeiture of the security deposit and liability for remaining rent."),
  b("r17", "divider", ""),
  b("r18", "paragraph", "By signing below, Tenant confirms they have read and agree to the terms of this Agreement."),
  b("r19", "field", "Full Name", { fieldType: "full-name", fieldLabel: "Tenant Full Name" }),
  b("r20", "field", "Email Address", { fieldType: "email", fieldLabel: "Tenant Email" }),
  b("r21", "field", "Signature", { fieldType: "signature", fieldLabel: "Tenant Signature" }),
  b("r22", "field", "Date Signed", { fieldType: "date-signed", fieldLabel: "Date Signed" }),
];

// ─── 6. Letter of Intent ──────────────────────────────────────────────────────

const loiBlocks: DocumentBlock[] = [
  b("l1", "heading1", "Letter of Intent"),
  b("l2", "paragraph", "This Letter of Intent (\"LOI\") sets out the principal terms under which the parties named below intend to proceed with the transaction described herein, subject to completion of due diligence and execution of a definitive agreement."),
  b("l3", "heading2", "1. Transaction Overview"),
  b("l4", "paragraph", "The parties intend to [describe the proposed transaction: e.g., enter a partnership, complete an acquisition, form a joint venture]. The terms set out below are indicative and non-binding except where expressly stated as binding."),
  b("l5", "heading2", "2. Key Terms"),
  b("l6", "bullet", "Consideration: [describe price, equity, or other compensation]"),
  b("l7", "bullet", "Structure: [asset purchase / equity acquisition / partnership / other]"),
  b("l8", "bullet", "Target Closing Date: [proposed date]"),
  b("l9", "bullet", "Exclusivity Period: [X] days from execution of this LOI"),
  b("l10", "heading2", "3. Due Diligence"),
  b("l11", "paragraph", "Party A shall conduct due diligence for [X] business days following execution. Party B agrees to provide reasonable access to relevant records, financial statements, personnel, and information as requested."),
  b("l12", "heading2", "4. Binding Provisions"),
  b("l13", "paragraph", "Notwithstanding the non-binding nature of this LOI, the following provisions are legally binding on both parties: (a) Confidentiality obligations regarding all information exchanged; (b) Exclusivity during the agreed period; (c) Governing law provisions."),
  b("l14", "heading2", "5. Expiration"),
  b("l15", "paragraph", "This LOI shall expire if a definitive agreement has not been executed within [X] days of the date signed, unless extended in writing by mutual consent."),
  b("l16", "divider", ""),
  b("l17", "field", "Full Name", { fieldType: "full-name", fieldLabel: "Full Name" }),
  b("l18", "field", "Company", { fieldType: "company", fieldLabel: "Company" }),
  b("l19", "field", "Signature", { fieldType: "signature", fieldLabel: "Signature" }),
  b("l20", "field", "Date Signed", { fieldType: "date-signed", fieldLabel: "Date Signed" }),
];

// ─── Registry ─────────────────────────────────────────────────────────────────

export const TEMPLATES: Record<string, TemplateDefinition> = {
  nda: {
    id: "nda",
    name: "Non-Disclosure Agreement",
    description: "Protect confidential information shared between two parties during business discussions.",
    category: "Legal",
    blocks: ndaBlocks,
  },
  service: {
    id: "service",
    name: "Freelance Service Agreement",
    description: "Define scope, payment terms, IP ownership, and responsibilities for freelance work.",
    category: "Business",
    blocks: serviceBlocks,
  },
  "offer-letter": {
    id: "offer-letter",
    name: "Employment Offer Letter",
    description: "Extend a formal job offer with compensation, benefits, and start-date details.",
    category: "HR",
    blocks: offerLetterBlocks,
  },
  consulting: {
    id: "consulting",
    name: "Consulting Agreement",
    description: "Set clear terms for a consulting engagement including fees, IP, and deliverables.",
    category: "Business",
    blocks: consultingBlocks,
  },
  rental: {
    id: "rental",
    name: "Residential Rental Agreement",
    description: "Cover rent, deposit, tenant obligations, and lease terms for a residential property.",
    category: "Real Estate",
    blocks: rentalBlocks,
  },
  loi: {
    id: "loi",
    name: "Letter of Intent",
    description: "Outline key terms of a proposed deal or acquisition before a formal agreement.",
    category: "Legal",
    blocks: loiBlocks,
  },
};

export const TEMPLATE_LIST: TemplateDefinition[] = Object.values(TEMPLATES);

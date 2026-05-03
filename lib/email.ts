import { Resend } from "resend";
import { getEnv } from "@/lib/env";
import type { DocumentRecord } from "@/lib/types";

function escapeHtml(value: string | null | undefined) {
  return (value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function logoMarkup(appUrl: string) {
  return `
    <table cellpadding="0" cellspacing="0" border="0" role="presentation">
      <tr>
        <td style="vertical-align:middle;padding-right:10px;">
          <img src="${appUrl}/Favicon.png" width="34" height="34" alt="Tord Sign" style="display:block;border-radius:10px;">
        </td>
        <td style="vertical-align:middle;">
          <span style="font-size:20px;font-weight:800;letter-spacing:-0.03em;color:#2A2726;">Tord Sign</span>
        </td>
      </tr>
    </table>
  `;
}

function emailShell(appUrl: string, inner: string) {
  return `
    <div style="margin:0;padding:32px 16px;background:#f8f4ed;font-family:Inter,Segoe UI,Arial,sans-serif;color:#2A2726;">
      <div style="max-width:620px;margin:0 auto;">
        <div style="padding:0 8px 18px;">${logoMarkup(appUrl)}</div>
        <div style="overflow:hidden;border:1px solid #eadfd3;border-radius:28px;background:#fffdf9;box-shadow:0 24px 70px rgba(42,39,38,0.10);">
          <div style="height:8px;background:linear-gradient(90deg,#E9967B,#2A2726);"></div>
          <div style="padding:34px;">${inner}</div>
        </div>
        <p style="margin:18px 8px 0;color:#8a817a;font-size:12px;line-height:1.6;">Tord Sign sends secure signing links directly to recipients. No login is required to sign.</p>
      </div>
    </div>
  `;
}

export async function sendSigningEmail(document: DocumentRecord) {
  const env = getEnv();
  const resend = new Resend(env.RESEND_API_KEY);

  if (!document.recipient_email || !document.signing_token) {
    throw new Error("Recipient email and signing token are required.");
  }

  const link = `${env.NEXT_PUBLIC_APP_URL}/sign/${document.signing_token}`;
  const title = escapeHtml(document.title);
  const senderName = escapeHtml(document.sender_name);
  const senderEmail = escapeHtml(document.sender_email);
  const message = escapeHtml(document.email_message || "You have received a document to review and sign.");

  await resend.emails.send({
    from: `${document.sender_name} via Tord Sign <${env.EMAIL_FROM}>`,
    to: document.recipient_email,
    replyTo: document.sender_email,
    subject: document.email_subject ?? `Please sign: ${document.title}`,
    html: emailShell(env.NEXT_PUBLIC_APP_URL, `
      <div style="display:inline-block;margin-bottom:18px;border:1px solid #f0c8bb;border-radius:999px;background:#fff2ed;padding:6px 12px;color:#9f5844;font-size:12px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;">Signature requested</div>
      <h1 style="margin:0 0 12px;font-size:28px;line-height:1.15;letter-spacing:-0.04em;color:#2A2726;">${title}</h1>
      <p style="margin:0 0 22px;color:#645c56;font-size:15px;line-height:1.7;">${message}</p>
      <div style="margin:0 0 26px;border:1px solid #efe6dc;border-radius:18px;background:#fbf7f0;padding:16px;">
        <p style="margin:0;color:#8a817a;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;">Sent by</p>
        <p style="margin:6px 0 0;color:#2A2726;font-size:14px;font-weight:700;">${senderName}</p>
        <p style="margin:2px 0 0;color:#645c56;font-size:13px;">${senderEmail}</p>
      </div>
      <a href="${link}" style="display:inline-block;background:#2A2726;color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:999px;font-size:14px;font-weight:800;">Open signing link</a>
      <p style="margin:18px 0 0;color:#8a817a;font-size:13px;line-height:1.6;">This secure link opens in the browser and guides the recipient through required fields only.</p>
    `)
  });
}

export async function sendCompletedEmail(document: DocumentRecord) {
  const env = getEnv();
  const resend = new Resend(env.RESEND_API_KEY);
  const recipients = [document.sender_email, document.recipient_email].filter(Boolean) as string[];
  const downloadUrl = `${env.NEXT_PUBLIC_APP_URL}/api/documents/${document.id}/completed`;
  const title = escapeHtml(document.title);
  const sender = `${escapeHtml(document.sender_name)} &lt;${escapeHtml(document.sender_email)}&gt;`;
  const signer = `${escapeHtml(document.recipient_name)} &lt;${escapeHtml(document.recipient_email)}&gt;`;

  await resend.emails.send({
    from: `${document.sender_name} via Tord Sign <${env.EMAIL_FROM}>`,
    to: recipients,
    replyTo: document.sender_email,
    subject: `Signed & completed: ${document.title}`,
    html: emailShell(env.NEXT_PUBLIC_APP_URL, `
      <div style="display:inline-block;margin-bottom:18px;border:1px solid #cfe8dc;border-radius:999px;background:#effaf4;padding:6px 12px;color:#247451;font-size:12px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;">Document completed</div>
      <h1 style="margin:0 0 10px;font-size:28px;line-height:1.15;letter-spacing:-0.04em;color:#2A2726;">${title}</h1>
      <p style="margin:0 0 24px;color:#645c56;font-size:15px;line-height:1.7;">This document has been electronically signed. The final PDF includes all completed fields and a branded certificate of completion.</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:26px;font-size:14px;">
        <tr style="border-bottom:1px solid #efe6dc;">
          <td style="padding:12px 0;color:#8a817a;width:120px;">Sender</td>
          <td style="padding:12px 0;font-weight:700;color:#2A2726;">${sender}</td>
        </tr>
        ${document.recipient_name ? `
        <tr style="border-bottom:1px solid #efe6dc;">
          <td style="padding:12px 0;color:#8a817a;">Signer</td>
          <td style="padding:12px 0;font-weight:700;color:#2A2726;">${signer}</td>
        </tr>` : ""}
        <tr>
          <td style="padding:12px 0;color:#8a817a;">Document ID</td>
          <td style="padding:12px 0;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;color:#645c56;">${document.id}</td>
        </tr>
      </table>
      <a href="${downloadUrl}" style="display:inline-block;background:#2A2726;color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:999px;font-size:14px;font-weight:800;">Download signed PDF</a>
    `)
  });
}

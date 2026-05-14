import { NextResponse } from "next/server";

export const SESSION_DOCUMENT_IDS_COOKIE = "tord_session_document_ids";

const MAX_SESSION_DOCUMENT_IDS = 24;
const DOCUMENT_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type CookieReader = {
  get(name: string): { value: string } | undefined;
};

export function parseSessionDocumentIds(cookieValue: string | undefined) {
  if (!cookieValue) {
    return [];
  }

  return cookieValue
    .split(".")
    .filter((id, index, ids) => DOCUMENT_ID_PATTERN.test(id) && ids.indexOf(id) === index)
    .slice(0, MAX_SESSION_DOCUMENT_IDS);
}

export function getSessionDocumentIds(cookies: CookieReader) {
  return parseSessionDocumentIds(cookies.get(SESSION_DOCUMENT_IDS_COOKIE)?.value);
}

export function trackSessionDocument(
  response: NextResponse,
  cookies: CookieReader,
  documentId: string
) {
  const ids = getSessionDocumentIds(cookies).filter((id) => id !== documentId);
  ids.unshift(documentId);

  response.cookies.set(SESSION_DOCUMENT_IDS_COOKIE, ids.slice(0, MAX_SESSION_DOCUMENT_IDS).join("."), {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });
}

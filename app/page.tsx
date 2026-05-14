import Link from "next/link";
import { cookies } from "next/headers";
import { getRecentDocuments } from "@/lib/data";
import { getSessionDocumentIds } from "@/lib/session-documents";
import { DocumentList } from "@/components/document-list";
import { NewDocumentButton } from "@/components/new-document-button";
import { TEMPLATE_LIST } from "@/lib/templates";
import type { TemplateDefinition } from "@/lib/templates";
import type { DocumentBlock } from "@/lib/types";

// ── Shared thumbnail constants (must match document-list.tsx) ────────────────
const CARD_W = 168;
const CARD_H = 238;
const INNER_W = 720;
const SCALE = CARD_W / INNER_W;

function TemplateThumbnail({ blocks }: { blocks: DocumentBlock[] }) {
  return (
    <div style={{ width: CARD_W, height: CARD_H, overflow: "hidden", position: "relative", background: "#fff" }}>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: INNER_W,
          transformOrigin: "top left",
          transform: `scale(${SCALE})`,
          padding: "52px 60px 0",
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        {blocks.slice(0, 22).map((block) => {
          if (block.type === "heading1") return (
            <div key={block.id} style={{ fontSize: 28, fontWeight: 700, color: "#0f172a", lineHeight: 1.2, letterSpacing: "-0.02em", marginBottom: 14 }}>{block.content}</div>
          );
          if (block.type === "heading2") return (
            <div key={block.id} style={{ fontSize: 18, fontWeight: 650, color: "#1e293b", lineHeight: 1.3, marginTop: 20, marginBottom: 8 }}>{block.content}</div>
          );
          if (block.type === "paragraph") return (
            <div key={block.id} style={{ fontSize: 12, color: "#64748b", lineHeight: 1.7, marginBottom: 8 }}>{block.content}</div>
          );
          if (block.type === "bullet" || block.type === "numbered") return (
            <div key={block.id} style={{ display: "flex", gap: 7, fontSize: 12, color: "#64748b", lineHeight: 1.6, marginBottom: 5 }}>
              <span style={{ color: "#94a3b8", flexShrink: 0 }}>•</span>
              <span>{block.content}</span>
            </div>
          );
          if (block.type === "divider") return (
            <div key={block.id} style={{ borderTop: "1px solid #e2e8f0", margin: "14px 0" }} />
          );
          if (block.type === "field") return (
            <div key={block.id} style={{ display: "inline-flex", alignItems: "center", background: "#f0fdfa", border: "1.5px solid #5eead4", borderRadius: 5, padding: "2px 9px", fontSize: 11, color: "#0f766e", marginBottom: 6, marginRight: 5 }}>
              {block.fieldLabel ?? block.content}
            </div>
          );
          return null;
        })}
      </div>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 52, background: "linear-gradient(to bottom, transparent, rgba(255,255,255,0.97))", pointerEvents: "none" }} />
    </div>
  );
}

function TemplateThumbCard({ tpl }: { tpl: TemplateDefinition }) {
  return (
    <Link href={`/documents/new/create?template=${tpl.id}`} className="group shrink-0 flex flex-col" style={{ width: CARD_W }}>
      <div
        className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition-all group-hover:border-slate-300 group-hover:shadow-md"
        style={{ width: CARD_W, height: CARD_H }}
      >
        <TemplateThumbnail blocks={tpl.blocks} />
      </div>
      <div className="mt-2.5" style={{ width: CARD_W }}>
        <p className="truncate text-[13px] font-semibold text-slate-800 leading-tight group-hover:text-teal-700 transition-colors">
          {tpl.name}
        </p>
        <p className="mt-1 text-[11px] text-slate-400">{tpl.category}</p>
      </div>
    </Link>
  );
}

export default async function HomePage() {
  const cookieStore = await cookies();
  const documents = await getRecentDocuments(getSessionDocumentIds(cookieStore));

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-10 px-6 py-10">
      {/* Hero */}
      <section className="rounded-[32px] border border-white/70 bg-white/80 p-8 shadow-card backdrop-blur md:p-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-semibold tracking-tight text-ink md:text-5xl">
              Upload. Place fields. Send once. Get the signed PDF back.
            </h1>
           {/*} <p className="mt-4 max-w-xl text-sm leading-6 text-slate-600 md:text-base">
              Tord Sign keeps the product surface narrow: sender uploads a PDF, places fields,
              sends a unique signing link, and both parties receive the completed copy.
            </p> */}
          </div>
          <NewDocumentButton />
        </div>
      </section>

      {/* Templates */}
      <section className="rounded-[28px] border border-slate-200/80 bg-white/85 p-6 shadow-card backdrop-blur md:p-8">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-ink">Start from a template</h2>
          <p className="mt-1 text-sm text-slate-500">
            Pick a ready-made document, customise the content, then send it for signing.
          </p>
        </div>
        <div className="flex gap-6 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {TEMPLATE_LIST.map((tpl) => (
            <TemplateThumbCard key={tpl.id} tpl={tpl} />
          ))}
        </div>
      </section>

      {/* Recent documents */}
      <section className="rounded-[28px] border border-slate-200/80 bg-white/85 p-6 shadow-card backdrop-blur">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-ink">Recent documents</h2>
            <p className="text-sm text-slate-500">Draft, sent, completed, and expired records.</p>
          </div>
        </div>
        <DocumentList documents={documents} />
      </section>
    </main>
  );
}

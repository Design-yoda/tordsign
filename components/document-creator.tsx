"use client";

import React, { useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useEditor, EditorContent, NodeViewWrapper, ReactNodeViewRenderer, useEditorState } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import UnderlineExt from "@tiptap/extension-underline";
import { TextStyle, FontFamily as FontFamilyExt } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import { Extension, Node, mergeAttributes, type Editor } from "@tiptap/core";
import type { ComponentType } from "react";
import {
  AlignCenter, AlignJustify, AlignLeft, AlignRight,
  Briefcase, Building2, CalendarCheck, CalendarDays,
  CheckSquare, ChevronDown, ChevronRight, Circle, FileSignature,
  GripVertical, Heading1, Heading2, Heading3, Highlighter,
  List, ListOrdered, LoaderCircle, Mail, Minus,
  Pencil, Pilcrow, Quote, Redo2, Type,
  Bold, Italic, Underline, User, X, Undo2
} from "lucide-react";
import type { DocumentBlock, DocumentBlockType, FieldType, PageSize, TextSegment } from "@/lib/types";
import { cn } from "@/lib/utils";

// ─── Google Fonts ─────────────────────────────────────────────────────────────
type GoogleFont = { name: string; category: "sans-serif" | "serif" | "monospace" };

const GOOGLE_FONTS: GoogleFont[] = [
  // Sans-serif
  { name: "Inter", category: "sans-serif" },
  { name: "Roboto", category: "sans-serif" },
  { name: "Open Sans", category: "sans-serif" },
  { name: "Lato", category: "sans-serif" },
  { name: "Montserrat", category: "sans-serif" },
  { name: "Poppins", category: "sans-serif" },
  { name: "Raleway", category: "sans-serif" },
  { name: "Oswald", category: "sans-serif" },
  { name: "Josefin Sans", category: "sans-serif" },
  { name: "Work Sans", category: "sans-serif" },
  { name: "DM Sans", category: "sans-serif" },
  { name: "Plus Jakarta Sans", category: "sans-serif" },
  { name: "Nunito", category: "sans-serif" },
  { name: "Fira Sans", category: "sans-serif" },
  { name: "Ubuntu", category: "sans-serif" },
  { name: "Rubik", category: "sans-serif" },
  { name: "Space Grotesk", category: "sans-serif" },
  { name: "Outfit", category: "sans-serif" },
  { name: "Manrope", category: "sans-serif" },
  { name: "Figtree", category: "sans-serif" },
  { name: "Source Sans 3", category: "sans-serif" },
  { name: "Noto Sans", category: "sans-serif" },
  { name: "Mulish", category: "sans-serif" },
  { name: "Karla", category: "sans-serif" },
  { name: "Cabin", category: "sans-serif" },
  // Serif
  { name: "Playfair Display", category: "serif" },
  { name: "Merriweather", category: "serif" },
  { name: "Libre Baskerville", category: "serif" },
  { name: "EB Garamond", category: "serif" },
  { name: "Cormorant Garamond", category: "serif" },
  { name: "Lora", category: "serif" },
  { name: "PT Serif", category: "serif" },
  { name: "Crimson Text", category: "serif" },
  { name: "Bitter", category: "serif" },
  { name: "DM Serif Display", category: "serif" },
  { name: "Spectral", category: "serif" },
  { name: "Noto Serif", category: "serif" },
  { name: "Alegreya", category: "serif" },
  { name: "Domine", category: "serif" },
  // Monospace
  { name: "Space Mono", category: "monospace" },
  { name: "Fira Code", category: "monospace" },
  { name: "Source Code Pro", category: "monospace" },
  { name: "IBM Plex Mono", category: "monospace" },
  { name: "Roboto Mono", category: "monospace" },
  { name: "JetBrains Mono", category: "monospace" },
];

function useGoogleFonts() {
  React.useEffect(() => {
    const id = "tord-google-fonts";
    if (document.getElementById(id)) return;
    const families = GOOGLE_FONTS.map((f) =>
      `family=${encodeURIComponent(f.name)}:ital,wght@0,400;0,700;1,400;1,700`
    ).join("&");
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?${families}&display=swap`;
    document.head.appendChild(link);
  }, []);
}

// ─── Custom FontSize extension ────────────────────────────────────────────────
declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (size: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
  }
}

const FontSize = Extension.create({
  name: "fontSize",
  addGlobalAttributes() {
    return [{
      types: ["textStyle"],
      attributes: {
        fontSize: {
          default: null,
          parseHTML: (el) => (el as HTMLElement).style.fontSize || null,
          renderHTML: (attrs) => attrs.fontSize ? { style: `font-size:${attrs.fontSize}` } : {},
        },
      },
    }];
  },
  addCommands() {
    return {
      setFontSize: (size: string) => ({ chain }) => chain().setMark("textStyle", { fontSize: size }).run(),
      unsetFontSize: () => ({ chain }) => chain().setMark("textStyle", { fontSize: null }).run(),
    };
  },
});

// ─── Field block types ────────────────────────────────────────────────────────
type FieldTool = { type: FieldType; label: string; icon: ComponentType<{ className?: string }> };

const FIELD_CATEGORIES: Array<{ label: string; tools: FieldTool[] }> = [
  {
    label: "Signature fields",
    tools: [
      { type: "signature", label: "Signature", icon: FileSignature },
      { type: "initials", label: "Initials", icon: Pilcrow },
    ],
  },
  {
    label: "Auto-fill fields",
    tools: [
      { type: "date-signed", label: "Date signed", icon: CalendarCheck },
      { type: "full-name", label: "Full name", icon: User },
      { type: "email", label: "Email address", icon: Mail },
      { type: "company", label: "Company", icon: Building2 },
      { type: "job-title", label: "Title", icon: Briefcase },
    ],
  },
  {
    label: "Standard fields",
    tools: [
      { type: "text", label: "Textbox", icon: Type },
      { type: "checkbox", label: "Checkbox", icon: CheckSquare },
      { type: "dropdown", label: "Dropdown", icon: AlignJustify },
      { type: "radio", label: "Radio group", icon: Circle },
      { type: "date", label: "Date", icon: CalendarDays },
    ],
  },
];

const FIELD_LABEL: Partial<Record<FieldType, string>> = {
  signature: "Signature", initials: "Initials",
  "date-signed": "Date signed", "full-name": "Full name",
  email: "Email address", company: "Company", "job-title": "Title",
  text: "Textbox", date: "Date", checkbox: "Checkbox",
  dropdown: "Dropdown", radio: "Radio group",
};

// ─── Custom FieldBlock Tiptap node ────────────────────────────────────────────
const FieldNodeViewComponent = React.memo(({ node, deleteNode }: NodeViewProps) => {
  const fieldType = node.attrs.fieldType as FieldType;
  const fieldLabel = node.attrs.fieldLabel as string;
  const iconDef = FIELD_CATEGORIES.flatMap((c) => c.tools).find((t) => t.type === fieldType);
  const Icon = iconDef?.icon ?? Pencil;

  return (
    <NodeViewWrapper className="tord-field-block">
      <span
        contentEditable={false}
        className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1 text-sm font-medium text-teal-700 ring-1 ring-teal-200"
      >
        <Icon className="h-3.5 w-3.5 shrink-0 text-teal-500" />
        {fieldLabel}
        <button
          type="button"
          onClick={deleteNode}
          className="ml-0.5 rounded-full p-0.5 text-teal-300 transition hover:text-rose-500"
        >
          <X className="h-3 w-3" />
        </button>
      </span>
    </NodeViewWrapper>
  );
});
FieldNodeViewComponent.displayName = "FieldNodeView";

const FieldBlockNode = Node.create({
  name: "fieldBlock",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      fieldType: { default: "text" },
      fieldLabel: { default: "Field" },
      fieldOptions: { default: null },
    };
  },
  parseHTML() {
    return [{ tag: "div[data-tord-field]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-tord-field": "" })];
  },
  addNodeView() {
    return ReactNodeViewRenderer(FieldNodeViewComponent);
  },
});

// ─── Tiptap JSON → DocumentBlock[] conversion ─────────────────────────────────
type TiptapMark = { type: string; attrs?: Record<string, unknown> };
type TiptapNode = {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  marks?: TiptapMark[];
};

function extractText(nodes: TiptapNode[] = []): string {
  return nodes.map((n) => n.text ?? extractText(n.content)).join("");
}

function extractSegments(nodes: TiptapNode[] = []): TextSegment[] {
  return nodes
    .filter((n) => n.type === "text" && n.text)
    .map((n) => {
      const marks = n.marks ?? [];
      const textStyle = marks.find((m) => m.type === "textStyle")?.attrs ?? {};
      const seg: TextSegment = { text: n.text! };
      if (marks.some((m) => m.type === "bold")) seg.bold = true;
      if (marks.some((m) => m.type === "italic")) seg.italic = true;
      if (marks.some((m) => m.type === "underline")) seg.underline = true;
      if (textStyle.color) seg.color = textStyle.color as string;
      if (textStyle.fontSize) {
        const px = parseFloat(String(textStyle.fontSize));
        if (!isNaN(px)) seg.fontSize = px;
      }
      if (textStyle.fontFamily) seg.fontFamily = textStyle.fontFamily as string;
      return seg;
    });
}

function tiptapToBlocks(doc: { content?: TiptapNode[] }): DocumentBlock[] {
  const blocks: DocumentBlock[] = [];

  for (const node of doc.content ?? []) {
    const id = crypto.randomUUID();

    if (node.type === "paragraph") {
      const content = extractText(node.content);
      const segments = extractSegments(node.content);
      const textAlign = node.attrs?.textAlign as DocumentBlock["textAlign"] | undefined;
      blocks.push({ id, type: "paragraph", content, segments, ...(textAlign ? { textAlign } : {}) });
      continue;
    }

    if (node.type === "heading") {
      const level = (node.attrs?.level as number) ?? 1;
      const type: DocumentBlockType = level === 1 ? "heading1" : level === 2 ? "heading2" : "heading3";
      const textAlign = node.attrs?.textAlign as DocumentBlock["textAlign"] | undefined;
      blocks.push({ id, type, content: extractText(node.content), ...(textAlign ? { textAlign } : {}) });
      continue;
    }

    if (node.type === "bulletList") {
      for (const item of node.content ?? []) {
        const para = item.content?.[0];
        const paraContent = para?.content ?? [];
        const textAlign = para?.attrs?.textAlign as DocumentBlock["textAlign"] | undefined;
        blocks.push({
          id: crypto.randomUUID(),
          type: "bullet",
          content: extractText(paraContent),
          segments: extractSegments(paraContent),
          ...(textAlign ? { textAlign } : {}),
        });
      }
      continue;
    }

    if (node.type === "orderedList") {
      for (const item of node.content ?? []) {
        const para = item.content?.[0];
        const paraContent = para?.content ?? [];
        const textAlign = para?.attrs?.textAlign as DocumentBlock["textAlign"] | undefined;
        blocks.push({
          id: crypto.randomUUID(),
          type: "numbered",
          content: extractText(paraContent),
          segments: extractSegments(paraContent),
          ...(textAlign ? { textAlign } : {}),
        });
      }
      continue;
    }

    if (node.type === "blockquote") {
      const inner = node.content?.[0]?.content ?? [];
      blocks.push({ id, type: "quote", content: extractText(inner) });
      continue;
    }

    if (node.type === "horizontalRule") {
      blocks.push({ id, type: "divider", content: "" });
      continue;
    }

    if (node.type === "fieldBlock") {
      blocks.push({
        id,
        type: "field",
        content: (node.attrs?.fieldLabel as string) ?? "Field",
        fieldType: node.attrs?.fieldType as FieldType,
        fieldLabel: node.attrs?.fieldLabel as string,
        fieldOptions: (node.attrs?.fieldOptions as string[] | null) ?? undefined,
      });
      continue;
    }
  }

  return blocks.filter((b) => b.type === "divider" || b.type === "field" || b.content.trim() !== "");
}

// ─── DocumentBlock[] → Tiptap JSON conversion ────────────────────────────────
function segmentsToTiptapContent(segments?: TextSegment[], fallback?: string): TiptapNode[] {
  if (segments && segments.length > 0) {
    return segments.map((seg) => {
      const styleAttrs: Record<string, unknown> = {};
      if (seg.color) styleAttrs.color = seg.color;
      if (seg.fontSize) styleAttrs.fontSize = `${seg.fontSize}px`;
      if (seg.fontFamily) styleAttrs.fontFamily = seg.fontFamily;
      return {
        type: "text",
        text: seg.text,
        marks: [
          ...(seg.bold ? [{ type: "bold" }] : []),
          ...(seg.italic ? [{ type: "italic" }] : []),
          ...(seg.underline ? [{ type: "underline" }] : []),
          ...(Object.keys(styleAttrs).length ? [{ type: "textStyle", attrs: styleAttrs }] : []),
        ],
      };
    });
  }
  return fallback ? [{ type: "text", text: fallback }] : [];
}

function blocksToTiptap(blocks: DocumentBlock[]): { type: string; content: TiptapNode[] } {
  const nodes: TiptapNode[] = [];

  for (const block of blocks) {
    if (block.type === "paragraph") {
      nodes.push({ type: "paragraph", content: segmentsToTiptapContent(block.segments, block.content) });
    } else if (block.type === "heading1") {
      nodes.push({ type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: block.content }] });
    } else if (block.type === "heading2") {
      nodes.push({ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: block.content }] });
    } else if (block.type === "heading3") {
      nodes.push({ type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: block.content }] });
    } else if (block.type === "bullet") {
      nodes.push({
        type: "bulletList",
        content: [{ type: "listItem", content: [{ type: "paragraph", content: segmentsToTiptapContent(block.segments, block.content) }] }],
      });
    } else if (block.type === "numbered") {
      nodes.push({
        type: "orderedList",
        content: [{ type: "listItem", content: [{ type: "paragraph", content: segmentsToTiptapContent(block.segments, block.content) }] }],
      });
    } else if (block.type === "quote") {
      nodes.push({ type: "blockquote", content: [{ type: "paragraph", content: [{ type: "text", text: block.content }] }] });
    } else if (block.type === "divider") {
      nodes.push({ type: "horizontalRule" });
    } else if (block.type === "field") {
      nodes.push({
        type: "fieldBlock",
        attrs: {
          fieldType: block.fieldType ?? "text",
          fieldLabel: block.fieldLabel ?? block.content,
          fieldOptions: block.fieldOptions ?? null,
        },
      });
    }
  }

  return { type: "doc", content: nodes };
}

// ─── Color utilities ──────────────────────────────────────────────────────────
function hexToHsv(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return [h * 360, max === 0 ? 0 : d / max, max];
}

function hsvToHex(h: number, s: number, v: number): string {
  h /= 360;
  const i = Math.floor(h * 6), f = h * 6 - i;
  const p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
  const [r, g, b] = ([
    [v, t, p], [q, v, p], [p, v, t],
    [p, q, v], [t, p, v], [v, p, q],
  ] as [number, number, number][])[i % 6];
  return "#" + [r, g, b].map((x) => Math.round(x * 255).toString(16).padStart(2, "0")).join("");
}

const COLOR_PRESETS = [
  "#0f172a", "#dc2626", "#d97706", "#16a34a",
  "#2563eb", "#7c3aed", "#db2777", "#0891b2",
  "#64748b", "#ffffff",
];

function DraggableColorPicker({ color, onChange }: { color: string; onChange: (hex: string) => void }) {
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState({ x: 0, y: 0 });
  const [hsv, setHsv] = React.useState<[number, number, number]>(() => hexToHsv(color));
  const [hexInput, setHexInput] = React.useState(color);
  const hsvRef = React.useRef(hsv);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const svRef = React.useRef<HTMLDivElement>(null);
  const hueRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const h = hexToHsv(color);
    setHsv(h);
    hsvRef.current = h;
    setHexInput(color);
  }, [color]);

  // Close on outside click
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Element | null;
      if (
        panelRef.current && !panelRef.current.contains(t) &&
        triggerRef.current && !triggerRef.current.contains(t)
      ) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  function openPicker() {
    if (open) { setOpen(false); return; }
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) setPos({ x: rect.left, y: rect.bottom + 8 });
    setOpen(true);
  }

  // Panel drag
  function onPanelDragStart(e: React.MouseEvent) {
    e.preventDefault();
    const start = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y };
    const onMove = (ev: MouseEvent) =>
      setPos({ x: start.px + ev.clientX - start.x, y: start.py + ev.clientY - start.y });
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  // SV area
  function pickSv(e: MouseEvent | React.MouseEvent) {
    const el = svRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const s = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const v = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));
    const next: [number, number, number] = [hsvRef.current[0], s, v];
    hsvRef.current = next;
    setHsv([...next]);
    const hex = hsvToHex(...next);
    setHexInput(hex);
    onChange(hex);
  }
  function onSvDown(e: React.MouseEvent) {
    pickSv(e);
    const onMove = (ev: MouseEvent) => pickSv(ev);
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  // Hue slider
  function pickHue(e: MouseEvent | React.MouseEvent) {
    const el = hueRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const h = Math.max(0, Math.min(360, ((e.clientX - rect.left) / rect.width) * 360));
    const next: [number, number, number] = [h, hsvRef.current[1], hsvRef.current[2]];
    hsvRef.current = next;
    setHsv([...next]);
    const hex = hsvToHex(...next);
    setHexInput(hex);
    onChange(hex);
  }
  function onHueDown(e: React.MouseEvent) {
    pickHue(e);
    const onMove = (ev: MouseEvent) => pickHue(ev);
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  const [h, s, v] = hsv;
  const hueColor = hsvToHex(h, 1, 1);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        title="Text color"
        onMouseDown={(e) => e.preventDefault()}
        onClick={openPicker}
        className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white transition hover:bg-slate-50"
      >
        <Highlighter className="h-3.5 w-3.5 text-slate-600" style={{ color }} />
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          style={{ position: "fixed", top: pos.y, left: pos.x, zIndex: 9999, userSelect: "none" }}
          className="w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        >
          {/* Drag handle */}
          <div
            onMouseDown={onPanelDragStart}
            className="flex cursor-grab items-center justify-between border-b border-slate-100 px-3 py-2 active:cursor-grabbing"
          >
            <span className="text-xs font-semibold text-slate-500">Text color</span>
            <button
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => setOpen(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* SV gradient */}
          <div className="px-3 pt-3">
            <div
              ref={svRef}
              onMouseDown={onSvDown}
              style={{
                background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hueColor})`,
                height: 140,
                borderRadius: 10,
                position: "relative",
                cursor: "crosshair",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: `${s * 100}%`,
                  top: `${(1 - v) * 100}%`,
                  transform: "translate(-50%, -50%)",
                  width: 14, height: 14,
                  borderRadius: "50%",
                  border: "2px solid white",
                  boxShadow: "0 0 0 1px rgba(0,0,0,0.35)",
                  background: color,
                  pointerEvents: "none",
                }}
              />
            </div>
          </div>

          {/* Hue slider */}
          <div className="px-3 pt-3">
            <div
              ref={hueRef}
              onMouseDown={onHueDown}
              style={{
                height: 12,
                borderRadius: 6,
                background: "linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)",
                position: "relative",
                cursor: "ew-resize",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: `${(h / 360) * 100}%`,
                  top: "50%",
                  transform: "translate(-50%, -50%)",
                  width: 16, height: 16,
                  borderRadius: "50%",
                  border: "2px solid white",
                  boxShadow: "0 0 0 1px rgba(0,0,0,0.35)",
                  background: hueColor,
                  pointerEvents: "none",
                }}
              />
            </div>
          </div>

          {/* Hex input + swatch */}
          <div className="flex items-center gap-2 px-3 py-3">
            <div
              style={{
                width: 24, height: 24, borderRadius: 6,
                background: color,
                border: "1px solid rgba(0,0,0,0.1)",
                flexShrink: 0,
              }}
            />
            <input
              value={hexInput}
              onChange={(e) => {
                const val = e.target.value;
                setHexInput(val);
                if (/^#[0-9a-fA-F]{6}$/.test(val)) {
                  const next = hexToHsv(val);
                  hsvRef.current = next;
                  setHsv(next);
                  onChange(val);
                }
              }}
              className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-1 font-mono text-xs text-slate-700 outline-none focus:border-slate-400"
              spellCheck={false}
            />
          </div>

          {/* Preset swatches */}
          <div className="flex flex-wrap gap-1.5 px-3 pb-3">
            {COLOR_PRESETS.map((swatch) => (
              <button
                key={swatch}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  const next = hexToHsv(swatch);
                  hsvRef.current = next;
                  setHsv(next);
                  setHexInput(swatch);
                  onChange(swatch);
                }}
                style={{
                  width: 18, height: 18, borderRadius: 4,
                  background: swatch,
                  border: swatch === "#ffffff" ? "1px solid #e2e8f0" : "none",
                  outline: color.toLowerCase() === swatch ? "2px solid #3b82f6" : "none",
                  outlineOffset: 1,
                }}
              />
            ))}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

// ─── Toolbar ──────────────────────────────────────────────────────────────────
const FONT_SIZES = ["10", "11", "12", "14", "16", "18", "20", "24", "28", "32"];

function ToolbarBtn({
  active, onClick, title, children, className,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 transition",
        active ? "bg-ink text-white" : "hover:bg-slate-100",
        className,
      )}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <div className="mx-0.5 h-4 w-px bg-slate-200" />;
}

function FontPicker({ editor }: { editor: Editor }) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const ref = React.useRef<HTMLDivElement>(null);

  const currentFont = useEditorState({
    editor,
    selector: (ctx) => (ctx.editor?.getAttributes("textStyle").fontFamily as string | undefined) ?? "",
  });

  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Element)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const categories: GoogleFont["category"][] = ["sans-serif", "serif", "monospace"];
  const filtered = GOOGLE_FONTS.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );
  const hasSearch = search.length > 0;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        title="Font family"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((o) => !o)}
        style={{ fontFamily: currentFont || undefined }}
        className="flex h-7 min-w-[88px] items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 transition hover:border-slate-300"
      >
        <span className="flex-1 truncate text-left">{currentFont || "Font"}</span>
        <ChevronDown className="h-3 w-3 shrink-0 text-slate-400" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
          <div className="border-b border-slate-100 p-2">
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search fonts…"
              className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-slate-400"
            />
          </div>
          <div className="max-h-64 overflow-y-auto">
            {/* Default / reset */}
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                editor.chain().focus().unsetFontFamily().run();
                setOpen(false); setSearch("");
              }}
              className={cn(
                "w-full px-3 py-2 text-left text-xs transition hover:bg-slate-50",
                !currentFont ? "font-semibold text-slate-900" : "text-slate-500"
              )}
            >
              Default
            </button>
            <div className="mx-3 my-1 border-t border-slate-100" />

            {(hasSearch ? [{ label: "Results", fonts: filtered }] : categories.map((cat) => ({
              label: cat === "sans-serif" ? "Sans-serif" : cat === "serif" ? "Serif" : "Monospace",
              fonts: GOOGLE_FONTS.filter((f) => f.category === cat),
            }))).map(({ label, fonts }) => (
              fonts.length === 0 ? null : (
                <div key={label}>
                  {!hasSearch && (
                    <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">{label}</p>
                  )}
                  {fonts.map((font) => (
                    <button
                      key={font.name}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        editor.chain().focus().setFontFamily(font.name).run();
                        setOpen(false); setSearch("");
                      }}
                      style={{ fontFamily: font.name }}
                      className={cn(
                        "w-full px-3 py-2 text-left text-sm transition hover:bg-slate-50",
                        currentFont === font.name ? "bg-teal-50 text-teal-700" : "text-slate-700"
                      )}
                    >
                      {font.name}
                    </button>
                  ))}
                </div>
              )
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BubbleSep() {
  return <div className="mx-1 h-4 w-px bg-white/15" />;
}

function BubbleToolbar({ editor }: { editor: Editor }) {
  const state = useEditorState({
    editor,
    selector: (ctx) => {
      if (!ctx.editor) return null;
      const e = ctx.editor;
      return {
        isBold: e.isActive("bold"),
        isItalic: e.isActive("italic"),
        isUnderline: e.isActive("underline"),
        isParagraph: e.isActive("paragraph"),
        isH1: e.isActive("heading", { level: 1 }),
        isH2: e.isActive("heading", { level: 2 }),
        isH3: e.isActive("heading", { level: 3 }),
        isBullet: e.isActive("bulletList"),
        isOrdered: e.isActive("orderedList"),
      };
    },
  });

  if (!editor || !state) return null;
  const { isBold, isItalic, isUnderline, isParagraph, isH1, isH2, isH3, isBullet, isOrdered } = state;

  const btn = (active: boolean, onClick: () => void, children: React.ReactNode) => (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn("flex h-7 w-7 items-center justify-center rounded-lg transition",
        active ? "bg-white/20 text-white" : "text-white/60 hover:bg-white/10 hover:text-white")}
    >
      {children}
    </button>
  );

  return (
    <>
      {btn(isBold, () => editor.chain().focus().toggleBold().run(), <Bold className="h-3.5 w-3.5" />)}
      {btn(isItalic, () => editor.chain().focus().toggleItalic().run(), <Italic className="h-3.5 w-3.5" />)}
      {btn(isUnderline, () => editor.chain().focus().toggleUnderline().run(), <Underline className="h-3.5 w-3.5" />)}
      <BubbleSep />
      {btn(isParagraph, () => editor.chain().focus().setParagraph().run(), <Type className="h-3.5 w-3.5" />)}
      {btn(isH1, () => editor.chain().focus().toggleHeading({ level: 1 }).run(), <Heading1 className="h-3.5 w-3.5" />)}
      {btn(isH2, () => editor.chain().focus().toggleHeading({ level: 2 }).run(), <Heading2 className="h-3.5 w-3.5" />)}
      {btn(isH3, () => editor.chain().focus().toggleHeading({ level: 3 }).run(), <Heading3 className="h-3.5 w-3.5" />)}
      <BubbleSep />
      {btn(isBullet, () => editor.chain().focus().toggleBulletList().run(), <List className="h-3.5 w-3.5" />)}
      {btn(isOrdered, () => editor.chain().focus().toggleOrderedList().run(), <ListOrdered className="h-3.5 w-3.5" />)}
    </>
  );
}

function FloatingBubbleToolbar({ editor }: { editor: Editor }) {
  const [pos, setPos] = React.useState<{ x: number; y: number } | null>(null);
  const [dragged, setDragged] = React.useState(false);
  const panelRef = React.useRef<HTMLDivElement>(null);

  const hasSelection = useEditorState({
    editor,
    selector: (ctx) => {
      if (!ctx.editor) return false;
      const { from, to } = ctx.editor.state.selection;
      return from !== to;
    },
  });

  // Auto-position above the selection whenever it changes (and user hasn't dragged)
  React.useEffect(() => {
    if (!hasSelection || dragged) return;
    requestAnimationFrame(() => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const rect = sel.getRangeAt(0).getBoundingClientRect();
      if (!rect.width && !rect.height) return;
      setPos({ x: rect.left + rect.width / 2, y: rect.top - 12 });
    });
  }, [hasSelection, dragged]);

  // Reset when selection disappears so next selection auto-positions fresh
  React.useEffect(() => {
    if (!hasSelection) {
      setDragged(false);
      setPos(null);
    }
  }, [hasSelection]);

  function onDragStart(e: React.MouseEvent) {
    e.preventDefault();
    // Capture actual rendered position (accounts for the translateX(-50%) offset)
    const rect = panelRef.current!.getBoundingClientRect();
    const startLeft = rect.left;
    const startTop = rect.top;
    const startMx = e.clientX;
    const startMy = e.clientY;

    setPos({ x: startLeft, y: startTop });
    setDragged(true);

    const onMove = (ev: MouseEvent) =>
      setPos({ x: startLeft + ev.clientX - startMx, y: startTop + ev.clientY - startMy });
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  if (!hasSelection || !pos) return null;

  return createPortal(
    <div
      ref={panelRef}
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        transform: dragged ? "none" : "translate(-50%, -100%)",
        zIndex: 9999,
        userSelect: "none",
      }}
      className="flex items-center gap-px rounded-xl border border-white/10 bg-[#1c1c1e] p-1 shadow-2xl shadow-black/40"
    >
      {/* Drag handle */}
      <div
        onMouseDown={onDragStart}
        className="flex h-7 w-5 cursor-grab items-center justify-center rounded-lg text-white/25 transition hover:text-white/60 active:cursor-grabbing"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </div>
      <div className="mx-0.5 h-4 w-px bg-white/15" />
      <BubbleToolbar editor={editor} />
    </div>,
    document.body
  );
}

function EditorToolbar({ editor }: { editor: Editor }) {
  const state = useEditorState({
    editor,
    selector: (ctx) => {
      if (!ctx.editor) return null;
      const e = ctx.editor;
      return {
        isBold: e.isActive("bold"),
        isItalic: e.isActive("italic"),
        isUnderline: e.isActive("underline"),
        isParagraph: e.isActive("paragraph"),
        isH1: e.isActive("heading", { level: 1 }),
        isH2: e.isActive("heading", { level: 2 }),
        isH3: e.isActive("heading", { level: 3 }),
        isBullet: e.isActive("bulletList"),
        isOrdered: e.isActive("orderedList"),
        isBlockquote: e.isActive("blockquote"),
        isAlignLeft: e.isActive({ textAlign: "left" }),
        isAlignCenter: e.isActive({ textAlign: "center" }),
        isAlignRight: e.isActive({ textAlign: "right" }),
        isAlignJustify: e.isActive({ textAlign: "justify" }),
        fontSize: e.getAttributes("textStyle").fontSize?.replace("px", "") ?? "",
        color: e.getAttributes("textStyle").color ?? "#0f172a",
      };
    },
  });

  if (!editor || !state) return null;

  const { isBold, isItalic, isUnderline, isParagraph, isH1, isH2, isH3,
    isBullet, isOrdered, isBlockquote, isAlignLeft, isAlignCenter,
    isAlignRight, isAlignJustify, fontSize, color } = state;

  return (
    <div className="flex flex-wrap items-center gap-1 rounded-t-2xl border border-b-0 border-slate-200 bg-slate-50 px-3 py-2">
      {/* History */}
      <ToolbarBtn title="Undo" onClick={() => editor.chain().focus().undo().run()} active={false}>
        <Undo2 className="h-3.5 w-3.5" />
      </ToolbarBtn>
      <ToolbarBtn title="Redo" onClick={() => editor.chain().focus().redo().run()} active={false}>
        <Redo2 className="h-3.5 w-3.5" />
      </ToolbarBtn>

      <Sep />

      {/* Inline marks */}
      <ToolbarBtn title="Bold" active={isBold} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold className="h-3.5 w-3.5" />
      </ToolbarBtn>
      <ToolbarBtn title="Italic" active={isItalic} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic className="h-3.5 w-3.5" />
      </ToolbarBtn>
      <ToolbarBtn title="Underline" active={isUnderline} onClick={() => editor.chain().focus().toggleUnderline().run()}>
        <Underline className="h-3.5 w-3.5" />
      </ToolbarBtn>

      <Sep />

      {/* Block type */}
      <ToolbarBtn title="Paragraph" active={isParagraph} onClick={() => editor.chain().focus().setParagraph().run()}>
        <Type className="h-3.5 w-3.5" />
      </ToolbarBtn>
      <ToolbarBtn title="Heading 1" active={isH1} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
        <Heading1 className="h-3.5 w-3.5" />
      </ToolbarBtn>
      <ToolbarBtn title="Heading 2" active={isH2} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        <Heading2 className="h-3.5 w-3.5" />
      </ToolbarBtn>
      <ToolbarBtn title="Heading 3" active={isH3} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
        <Heading3 className="h-3.5 w-3.5" />
      </ToolbarBtn>

      <Sep />

      {/* Lists */}
      <ToolbarBtn title="Bullet list" active={isBullet} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List className="h-3.5 w-3.5" />
      </ToolbarBtn>
      <ToolbarBtn title="Numbered list" active={isOrdered} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrdered className="h-3.5 w-3.5" />
      </ToolbarBtn>
      <ToolbarBtn title="Blockquote" active={isBlockquote} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <Quote className="h-3.5 w-3.5" />
      </ToolbarBtn>
      <ToolbarBtn title="Divider" active={false} onClick={() => editor.chain().focus().setHorizontalRule().run()}>
        <Minus className="h-3.5 w-3.5" />
      </ToolbarBtn>

      <Sep />

      {/* Alignment */}
      <ToolbarBtn title="Align left" active={isAlignLeft} onClick={() => editor.chain().focus().setTextAlign("left").run()}>
        <AlignLeft className="h-3.5 w-3.5" />
      </ToolbarBtn>
      <ToolbarBtn title="Align center" active={isAlignCenter} onClick={() => editor.chain().focus().setTextAlign("center").run()}>
        <AlignCenter className="h-3.5 w-3.5" />
      </ToolbarBtn>
      <ToolbarBtn title="Align right" active={isAlignRight} onClick={() => editor.chain().focus().setTextAlign("right").run()}>
        <AlignRight className="h-3.5 w-3.5" />
      </ToolbarBtn>
      <ToolbarBtn title="Justify" active={isAlignJustify} onClick={() => editor.chain().focus().setTextAlign("justify").run()}>
        <AlignJustify className="h-3.5 w-3.5" />
      </ToolbarBtn>

      <Sep />

      {/* Font family */}
      <FontPicker editor={editor} />

      {/* Font size */}
      <select
        title="Font size"
        value={fontSize}
        onChange={(e) => {
          if (e.target.value) {
            editor.chain().focus().setFontSize(e.target.value + "px").run();
          } else {
            editor.chain().focus().unsetFontSize().run();
          }
        }}
        className="h-7 rounded-lg border border-slate-200 bg-white px-1.5 text-xs text-slate-600 outline-none"
      >
        <option value="">Size</option>
        {FONT_SIZES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      {/* Text color */}
      <DraggableColorPicker
        color={color}
        onChange={(hex) => editor.chain().focus().setColor(hex).run()}
      />
    </div>
  );
}

// ─── Page size config ─────────────────────────────────────────────────────────
type PageSizeConfig = { label: string; shortLabel: string; pdfWidth: number; pdfHeight: number };

const PAGE_SIZE_CONFIG: Record<PageSize, PageSizeConfig> = {
  a4:     { label: "A4 (210 × 297 mm)",     shortLabel: "A4",     pdfWidth: 595, pdfHeight: 842  },
  letter: { label: "US Letter (8.5 × 11 in)", shortLabel: "Letter", pdfWidth: 612, pdfHeight: 792  },
  legal:  { label: "US Legal (8.5 × 14 in)",  shortLabel: "Legal",  pdfWidth: 612, pdfHeight: 1008 },
  a5:     { label: "A5 (148 × 210 mm)",      shortLabel: "A5",     pdfWidth: 420, pdfHeight: 595  },
};

function estimatePageCount(
  doc: { content?: TiptapNode[] },
  pdfTextW: number,
  pdfPageH: number
): number {
  const usableH = pdfPageH - 160;
  const charsPerLine = Math.max(1, Math.floor(pdfTextW / 6.5));
  let usedH = 0;
  let pages = 1;

  for (const node of doc.content ?? []) {
    let blockH = 0;
    if (node.type === "paragraph") {
      const text = extractText(node.content);
      const lines = Math.max(1, Math.ceil((text.length || 1) / charsPerLine));
      blockH = lines * 18 + 6;
    } else if (node.type === "heading") {
      const level = ((node.attrs?.level as number) ?? 1);
      blockH = level === 1 ? 52 : level === 2 ? 38 : 30;
    } else if (node.type === "bulletList" || node.type === "orderedList") {
      blockH = (node.content?.length ?? 1) * 24 + 6;
    } else if (node.type === "horizontalRule") {
      blockH = 24;
    } else if (node.type === "blockquote") {
      blockH = 36;
    } else if (node.type === "fieldBlock") {
      blockH = 64;
    } else {
      blockH = 20;
    }

    if (usedH + blockH > usableH && usedH > 0) {
      pages++;
      usedH = blockH;
    } else {
      usedH += blockH;
    }
  }

  return Math.max(1, pages);
}

function PageBreakOverlay({
  wrapperRef,
  pageHeightPx,
}: {
  wrapperRef: React.RefObject<HTMLDivElement | null>;
  pageHeightPx: number;
}) {
  const [height, setHeight] = React.useState(0);

  React.useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => setHeight(el.scrollHeight));
    obs.observe(el);
    setHeight(el.scrollHeight);
    return () => obs.disconnect();
  }, [wrapperRef]);

  if (pageHeightPx <= 0 || height < pageHeightPx) return null;

  const breaks: number[] = [];
  for (let y = pageHeightPx; y < height; y += pageHeightPx) {
    breaks.push(y);
  }

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <span className="absolute left-3 top-3 select-none text-[10px] text-slate-300">Page 1</span>
      {breaks.map((y, i) => (
        <React.Fragment key={y}>
          <div
            className="absolute left-6 right-6"
            style={{ top: Math.round(y), borderTop: "1.5px dashed #e2e8f0" }}
          />
          <span
            className="absolute right-3 select-none text-[10px] text-slate-300"
            style={{ top: Math.round(y) + 4 }}
          >
            Page {i + 2}
          </span>
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
type DocumentCreatorProps = {
  documentId?: string;
  initialTitle?: string;
  initialSenderName?: string;
  initialSenderEmail?: string;
  initialBlocks?: DocumentBlock[];
};

export function DocumentCreator({
  documentId,
  initialTitle,
  initialSenderName,
  initialSenderEmail,
  initialBlocks,
}: DocumentCreatorProps = {}) {
  useGoogleFonts();
  const router = useRouter();
  const [title, setTitle] = React.useState(initialTitle ?? "Untitled document");
  const [senderName, setSenderName] = React.useState(initialSenderName ?? "");
  const [senderEmail, setSenderEmail] = React.useState(initialSenderEmail ?? "");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pageSize, setPageSize] = React.useState<PageSize>("a4");
  const editorWrapRef = React.useRef<HTMLDivElement>(null);
  const [editorContainerWidth, setEditorContainerWidth] = React.useState(0);
  const [estimatedPages, setEstimatedPages] = React.useState(1);

  React.useEffect(() => {
    const el = editorWrapRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => setEditorContainerWidth(el.clientWidth));
    obs.observe(el);
    setEditorContainerWidth(el.clientWidth);
    return () => obs.disconnect();
  }, []);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      UnderlineExt,
      TextStyle,
      Color,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({
        placeholder: "Start writing, paste an agreement, or use the toolbar above…",
      }),
      FontSize,
      FontFamilyExt,
      FieldBlockNode,
    ],
    content: initialBlocks ? blocksToTiptap(initialBlocks) : undefined,
    editorProps: {
      attributes: { class: "px-8 py-6 focus:outline-none" },
    },
  });

  React.useEffect(() => {
    if (!editor) return;
    const cfg = PAGE_SIZE_CONFIG[pageSize];
    const textW = cfg.pdfWidth - 144;
    const update = () => {
      const json = editor.getJSON() as { content?: TiptapNode[] };
      setEstimatedPages(estimatePageCount(json, textW, cfg.pdfHeight));
    };
    editor.on("update", update);
    update();
    return () => { editor.off("update", update); };
  }, [editor, pageSize]);

  const addFieldBlock = useCallback(
    (tool: FieldTool) => {
      if (!editor) return;
      editor
        .chain()
        .focus()
        .insertContent({
          type: "fieldBlock",
          attrs: {
            fieldType: tool.type,
            fieldLabel: FIELD_LABEL[tool.type] ?? tool.label,
            fieldOptions:
              tool.type === "dropdown" || tool.type === "radio"
                ? ["Option 1", "Option 2", "Option 3"]
                : null,
          },
        })
        .run();
    },
    [editor],
  );

  async function handleSubmit() {
    setError(null);
    if (!title.trim()) { setError("Document title is required."); return; }
    if (!senderName.trim()) { setError("Sender name is required."); return; }
    if (!senderEmail.trim()) { setError("Sender email is required."); return; }
    if (!editor) return;

    const json = editor.getJSON() as { content?: TiptapNode[] };
    const blocks = tiptapToBlocks(json);
    if (blocks.length === 0) { setError("Add some content before generating."); return; }

    setIsSubmitting(true);
    try {
      let docId: string;
      if (documentId) {
        const res = await fetch(`/api/documents/${documentId}/rebuild`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: title.trim(), senderName: senderName.trim(), senderEmail: senderEmail.trim(), blocks, pageSize }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Unable to update document.");
        docId = documentId;
      } else {
        const res = await fetch("/api/documents/from-blocks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: title.trim(), senderName: senderName.trim(), senderEmail: senderEmail.trim(), blocks, pageSize }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.formErrors?.[0] ?? (typeof data.error === "string" ? data.error : null) ?? "Unable to create document.");
        docId = data.document.id;
      }
      router.push(`/documents/${docId}/edit`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
      {/* Left: editor */}
      <div className="space-y-4">
        {/* Document meta */}
        <div className="rounded-[28px] border bg-white p-6 shadow-card">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-3xl font-bold tracking-tight text-ink outline-none placeholder:text-slate-300"
            placeholder="Untitled document"
          />
          <div className="mt-4 flex flex-wrap gap-3">
            <input
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder="Your name"
              className="min-w-[160px] flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-slate-400"
            />
            <input
              type="email"
              value={senderEmail}
              onChange={(e) => setSenderEmail(e.target.value)}
              placeholder="your@email.com"
              className="min-w-[200px] flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-slate-400"
            />
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-slate-400">Page size</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(e.target.value as PageSize)}
              className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-600 outline-none transition hover:border-slate-300"
            >
              {(Object.entries(PAGE_SIZE_CONFIG) as [PageSize, PageSizeConfig][]).map(([key, cfg]) => (
                <option key={key} value={key}>{cfg.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Rich text editor */}
        <div className="overflow-hidden rounded-[28px] border bg-white shadow-card">
          {editor && <EditorToolbar editor={editor} />}

          {editor && <FloatingBubbleToolbar editor={editor} />}

          <div ref={editorWrapRef} className="relative">
            <EditorContent editor={editor} />
            {(() => {
              const cfg = PAGE_SIZE_CONFIG[pageSize];
              const textW = cfg.pdfWidth - 144;
              const ph = editorContainerWidth > 0
                ? (editorContainerWidth - 64) * (cfg.pdfHeight / textW)
                : 0;
              return ph > 0 ? <PageBreakOverlay wrapperRef={editorWrapRef} pageHeightPx={ph} /> : null;
            })()}
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2 text-xs text-slate-400">
            <span>~{estimatedPages} {estimatedPages === 1 ? "page" : "pages"}</span>
            <span>{PAGE_SIZE_CONFIG[pageSize].shortLabel}</span>
          </div>
        </div>

        {/* Submit */}
        {error && (
          <div className="flex items-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <X className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
            {isSubmitting ? "Generating…" : documentId ? "Regenerate document" : "Generate document"}
          </button>
          <p className="text-xs text-slate-400">We&apos;ll create a PDF and open the field editor.</p>
        </div>
      </div>

      {/* Right: field palette */}
      <aside className="hidden xl:block">
        <div className="sticky top-4 rounded-[28px] border bg-white p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Insert field</p>
          <p className="mb-4 mt-1 text-xs text-slate-400">Click to insert at cursor position</p>
          <div className="space-y-4">
            {FIELD_CATEGORIES.map((cat) => (
              <div key={cat.label}>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {cat.label}
                </p>
                <div className="grid gap-1.5">
                  {cat.tools.map((tool) => {
                    const Icon = tool.icon;
                    return (
                      <button
                        key={tool.type}
                        type="button"
                        onClick={() => addFieldBlock(tool)}
                        className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 text-left transition hover:border-slate-400 hover:bg-slate-50"
                      >
                        <Icon className="h-4 w-4 shrink-0 text-slate-600" />
                        <span className="text-sm text-slate-700">{tool.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}

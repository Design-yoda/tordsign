"use client";

import React, { useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useEditor, EditorContent, NodeViewWrapper, NodeViewContent, ReactNodeViewRenderer, useEditorState } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import UnderlineExt from "@tiptap/extension-underline";
import { TextStyle, FontFamily as FontFamilyExt } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import { Extension, Node, mergeAttributes, type Editor } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { ComponentType } from "react";
import {
  AlignCenter, AlignLeft, AlignRight, AlignJustify,
  CalendarCheck, CalendarDays,
  CheckSquare, ChevronDown, ChevronRight, Circle, FileSignature,
  GripVertical, Heading1, Heading2, Heading3, Highlighter,
  ImagePlus, List, ListOrdered, LoaderCircle, Mail, Minus,
  Pencil, Pilcrow, Plus, Quote, Redo2, Scissors, Trash2, Type, ZoomIn, ZoomOut,
  Bold, Italic, Underline, User, X, Undo2
} from "lucide-react";
import type { DocumentBlock, DocumentBlockType, FieldType, PageMargins, PageSize, TextSegment } from "@/lib/types";
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
    ],
  },
  {
    label: "Standard fields",
    tools: [
      { type: "text", label: "Textbox", icon: Type },
      { type: "date", label: "Date", icon: CalendarDays },
    ],
  },
];

const FIELD_LABEL: Partial<Record<FieldType, string>> = {
  signature: "Signature", initials: "Initials",
  "date-signed": "Date signed", "full-name": "Full name",
  email: "Email address", company: "Company", "job-title": "Title",
  text: "Textbox", date: "Date", dropdown: "Dropdown",
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

// ─── Page break node ──────────────────────────────────────────────────────────
const PageBreakNode = Node.create({
  name: "pageBreak",
  group: "block",
  atom: true,
  parseHTML() {
    return [{ tag: "div[data-page-break]" }];
  },
  renderHTML() {
    return ["div", { "data-page-break": "", style: "page-break-after:always;break-after:page;" }];
  },
  addNodeView() {
    return () => {
      const dom = document.createElement("div");
      dom.setAttribute("contenteditable", "false");
      dom.dataset.pageBreak = "";
      dom.style.cssText = "display:flex;align-items:center;gap:10px;padding:4px 0;margin:0;user-select:none;cursor:default;";
      const lineL = document.createElement("div");
      lineL.style.cssText = "flex:1;height:1.5px;background:linear-gradient(to right,transparent,#cbd5e1)";
      const label = document.createElement("span");
      label.style.cssText = "flex-shrink:0;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#94a3b8;padding:2px 10px;border:1.5px dashed #cbd5e1;border-radius:4px";
      label.textContent = "Page Break";
      const lineR = document.createElement("div");
      lineR.style.cssText = "flex:1;height:1.5px;background:linear-gradient(to left,transparent,#cbd5e1)";
      dom.appendChild(lineL);
      dom.appendChild(label);
      dom.appendChild(lineR);
      return { dom };
    };
  },
  addKeyboardShortcuts() {
    return {
      "Mod-Enter": () => this.editor.commands.insertContent({ type: "pageBreak" }),
    };
  },
});

// ─── Compressed image helper ──────────────────────────────────────────────────
async function fileToCompressedDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      const img = new window.Image();
      img.onload = () => {
        const MAX = 1400;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          const ratio = Math.min(MAX / width, MAX / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = reject;
      img.src = src;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── CheckboxItem node (Notion-style checklist) ───────────────────────────────
const CheckboxItemNodeViewComponent = React.memo(({ node: _node, getPos, editor }: NodeViewProps) => {
  return (
    <NodeViewWrapper as="div" className="flex items-start gap-2 py-0.5">
      <span
        contentEditable={false}
        className="mt-[3px] flex h-4 w-4 shrink-0 items-center justify-center rounded border-[1.5px] border-slate-400 bg-white"
        style={{ minWidth: 16 }}
      />
      <NodeViewContent className="flex-1 min-w-0 outline-none" />
    </NodeViewWrapper>
  );
});
CheckboxItemNodeViewComponent.displayName = "CheckboxItemNodeView";

const CheckboxItemNode = Node.create({
  name: "checkboxItem",
  group: "block",
  content: "inline*",
  parseHTML() { return [{ tag: "div[data-checkbox-item]" }]; },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-checkbox-item": "" }), 0];
  },
  addNodeView() {
    return ReactNodeViewRenderer(CheckboxItemNodeViewComponent);
  },
  addKeyboardShortcuts() {
    return {
      Enter: () => {
        if (!this.editor.isActive("checkboxItem")) return false;
        const { $from } = this.editor.state.selection;
        if ($from.parent.textContent === "") {
          return this.editor.chain().setNode("paragraph").run();
        }
        return this.editor.commands.splitBlock();
      },
      Backspace: () => {
        if (!this.editor.isActive("checkboxItem")) return false;
        const { $from, empty } = this.editor.state.selection;
        if (!empty || $from.parentOffset !== 0) return false;
        return this.editor.chain().setNode("paragraph").run();
      },
    };
  },
});

// ─── RadioGroup node (atom, stores options as attrs) ─────────────────────────
const RadioGroupNodeViewComponent = React.memo(({ node, updateAttributes, deleteNode }: NodeViewProps) => {
  const options: string[] = node.attrs.options ?? ["Option 1", "Option 2", "Option 3"];
  const label: string = node.attrs.label ?? "Radio group";

  return (
    <NodeViewWrapper as="div" className="my-1 rounded-xl border border-indigo-200 bg-indigo-50/50 p-3">
      <div contentEditable={false} className="select-none">
        <div className="mb-2 flex items-center gap-2">
          <input
            value={label}
            onChange={(e) => updateAttributes({ label: e.target.value })}
            placeholder="Group label…"
            className="flex-1 rounded-lg border border-indigo-200 bg-white px-2 py-1 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-400"
          />
          <button
            type="button"
            onClick={deleteNode}
            title="Delete radio group"
            className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-500"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="space-y-1">
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-[1.5px] border-indigo-400" />
              <input
                value={opt}
                onChange={(e) => {
                  const next = [...options];
                  next[i] = e.target.value;
                  updateAttributes({ options: next });
                }}
                className="flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 text-sm text-slate-700 outline-none focus:border-indigo-300 focus:bg-white"
              />
              {options.length > 1 && (
                <button
                  type="button"
                  onClick={() => updateAttributes({ options: options.filter((_, idx) => idx !== i) })}
                  className="rounded p-0.5 text-slate-300 hover:text-rose-500"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => updateAttributes({ options: [...options, `Option ${options.length + 1}`] })}
          className="mt-2 flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-100"
        >
          <Plus className="h-3 w-3" />
          Add option
        </button>
      </div>
    </NodeViewWrapper>
  );
});
RadioGroupNodeViewComponent.displayName = "RadioGroupNodeView";

const RadioGroupNode = Node.create({
  name: "radioGroup",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      label: { default: "Radio group" },
      options: { default: ["Option 1", "Option 2", "Option 3"] },
    };
  },
  parseHTML() { return [{ tag: "div[data-radio-group]" }]; },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-radio-group": "" })];
  },
  addNodeView() {
    return ReactNodeViewRenderer(RadioGroupNodeViewComponent);
  },
});

// ─── ImageBlock node (inline image in document body) ─────────────────────────
const ImageBlockNodeViewComponent = React.memo(({ node, updateAttributes, deleteNode }: NodeViewProps) => {
  const src: string = node.attrs.src ?? "";
  const widthPct: number = node.attrs.widthPct ?? 100;
  const containerRef = React.useRef<HTMLDivElement>(null);

  function startResize(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const container = containerRef.current;
    if (!container) return;
    const startX = e.clientX;
    const startWidth = container.getBoundingClientRect().width;
    const parentEl = container.closest('[contenteditable="true"]') ?? container.parentElement;
    const parentWidth = parentEl ? parentEl.getBoundingClientRect().width : startWidth;

    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startX;
      const newPct = Math.max(10, Math.min(100, ((startWidth + delta) / parentWidth) * 100));
      updateAttributes({ widthPct: Math.round(newPct) });
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  return (
    <NodeViewWrapper as="div" className="my-2">
      <div
        ref={containerRef}
        contentEditable={false}
        className="group relative inline-block"
        style={{ width: `${widthPct}%` }}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="block w-full rounded-lg border border-slate-200" style={{ maxHeight: 480 }} />
        ) : (
          <div className="flex h-32 w-full items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-sm text-slate-400">
            Image
          </div>
        )}
        <button
          type="button"
          onClick={deleteNode}
          title="Remove image"
          className="absolute right-1.5 top-1.5 rounded-full bg-white/90 p-1 text-slate-400 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 hover:text-rose-500"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        {/* Right-edge resize handle */}
        <div
          onMouseDown={startResize}
          className="absolute right-0 top-0 bottom-0 w-3 -translate-x-px cursor-ew-resize opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-end pr-0.5"
          style={{ transform: "translateX(50%)" }}
        >
          <div className="h-10 w-1.5 rounded-full bg-blue-400 shadow-sm" />
        </div>
        {/* Width badge */}
        <span className="absolute bottom-1.5 right-3 rounded bg-black/40 px-1.5 py-0.5 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 select-none">
          {widthPct}%
        </span>
      </div>
    </NodeViewWrapper>
  );
});
ImageBlockNodeViewComponent.displayName = "ImageBlockNodeView";

const ImageBlockNode = Node.create({
  name: "imageBlock",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      src: { default: "" },
      alt: { default: "" },
      widthPct: { default: 100 },
    };
  },
  parseHTML() { return [{ tag: "div[data-image-block]" }]; },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-image-block": "" })];
  },
  addNodeView() {
    return ReactNodeViewRenderer(ImageBlockNodeViewComponent);
  },
});

// ─── Heading Enter fix: Enter after any heading → new paragraph ───────────────
const HeadingEnterFix = Extension.create({
  name: "headingEnterFix",
  addKeyboardShortcuts() {
    return {
      Enter: () => {
        if (!this.editor.isActive("heading")) return false;
        return this.editor.chain().splitBlock().setNode("paragraph").run();
      },
    };
  },
});

// Apply heading only to the block under cursor, never the whole document
function applyHeadingToBlock(editor: Editor, level: 1 | 2 | 3) {
  const { $from } = editor.state.selection;
  const from = $from.start($from.depth);
  const to = $from.end($from.depth);
  editor.chain().focus().setTextSelection({ from, to }).toggleHeading({ level }).run();
}

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

    if (node.type === "pageBreak") {
      blocks.push({ id, type: "pageBreak", content: "" });
      continue;
    }

    if (node.type === "checkboxItem") {
      const segments = extractSegments(node.content ?? []);
      const content = extractText(node.content ?? []);
      blocks.push({ id, type: "checkboxItem", content, segments });
      continue;
    }

    if (node.type === "radioGroup") {
      const label = (node.attrs?.label as string) ?? "Radio group";
      const options = (node.attrs?.options as string[]) ?? ["Option 1", "Option 2", "Option 3"];
      blocks.push({ id, type: "radioGroup", content: label, fieldOptions: options });
      continue;
    }

    if (node.type === "imageBlock") {
      const src = (node.attrs?.src as string) ?? "";
      const widthPct = (node.attrs?.widthPct as number | undefined) ?? undefined;
      if (src) blocks.push({ id, type: "image", content: src, ...(widthPct !== undefined && widthPct !== 100 ? { imageWidthPct: widthPct } : {}) });
      continue;
    }
  }

  return blocks.filter((b) =>
    b.type === "divider" || b.type === "field" || b.type === "pageBreak" ||
    b.type === "checkboxItem" || b.type === "radioGroup" || b.type === "image" ||
    b.content.trim() !== ""
  );
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
    } else if (block.type === "pageBreak") {
      nodes.push({ type: "pageBreak" });
    } else if (block.type === "field") {
      nodes.push({
        type: "fieldBlock",
        attrs: {
          fieldType: block.fieldType ?? "text",
          fieldLabel: block.fieldLabel ?? block.content,
          fieldOptions: block.fieldOptions ?? null,
        },
      });
    } else if (block.type === "checkboxItem") {
      nodes.push({
        type: "checkboxItem",
        content: segmentsToTiptapContent(block.segments, block.content),
      });
    } else if (block.type === "radioGroup") {
      nodes.push({
        type: "radioGroup",
        attrs: {
          label: block.content || "Radio group",
          options: block.fieldOptions ?? ["Option 1", "Option 2", "Option 3"],
        },
      });
    } else if (block.type === "image") {
      nodes.push({
        type: "imageBlock",
        attrs: { src: block.content, alt: "", widthPct: block.imageWidthPct ?? 100 },
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
const ZOOM_MIN = 0.75;
const ZOOM_MAX = 1.5;
const ZOOM_STEP = 0.1;
const PAGE_MARGIN_MIN = 0;
const PAGE_MARGIN_MAX = 300;

function clampZoom(value: number) {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(value * 100) / 100));
}

function clampPageMargin(value: number) {
  if (!Number.isFinite(value)) return PAGE_MARGIN_MIN;
  return Math.min(PAGE_MARGIN_MAX, Math.max(PAGE_MARGIN_MIN, Math.round(value)));
}

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
  const [pos, setPos] = React.useState({ left: 0, top: 0 });
  const ref = React.useRef<HTMLDivElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  const currentFont = useEditorState({
    editor,
    selector: (ctx) => (ctx.editor?.getAttributes("textStyle").fontFamily as string | undefined) ?? "",
  });

  const updatePosition = React.useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPos({
      left: Math.max(8, Math.min(rect.left, window.innerWidth - 232)),
      top: Math.max(8, Math.min(rect.bottom + 8, window.innerHeight - 320)),
    });
  }, []);

  React.useEffect(() => {
    if (!open) return;
    updatePosition();
    const handler = (e: MouseEvent) => {
      const target = e.target as Element;
      if (
        ref.current && !ref.current.contains(target) &&
        panelRef.current && !panelRef.current.contains(target)
      ) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      document.removeEventListener("mousedown", handler);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, updatePosition]);

  const categories: GoogleFont["category"][] = ["sans-serif", "serif", "monospace"];
  const filtered = GOOGLE_FONTS.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );
  const hasSearch = search.length > 0;

  return (
    <div ref={ref} className="relative">
      <button
        ref={triggerRef}
        type="button"
        title="Font family"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          updatePosition();
          setOpen((o) => !o);
        }}
        style={{ fontFamily: currentFont || undefined }}
        className="flex h-7 min-w-[88px] items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 transition hover:border-slate-300"
      >
        <span className="flex-1 truncate text-left">{currentFont || "Font"}</span>
        <ChevronDown className="h-3 w-3 shrink-0 text-slate-400" />
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          style={{ position: "fixed", left: pos.left, top: pos.top, zIndex: 9999 }}
          className="w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
        >
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
        </div>,
        document.body
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
      {btn(isH1, () => applyHeadingToBlock(editor, 1), <Heading1 className="h-3.5 w-3.5" />)}
      {btn(isH2, () => applyHeadingToBlock(editor, 2), <Heading2 className="h-3.5 w-3.5" />)}
      {btn(isH3, () => applyHeadingToBlock(editor, 3), <Heading3 className="h-3.5 w-3.5" />)}
      <BubbleSep />
      {btn(isBullet, () => editor.chain().focus().toggleBulletList().run(), <List className="h-3.5 w-3.5" />)}
      {btn(isOrdered, () => editor.chain().focus().toggleOrderedList().run(), <ListOrdered className="h-3.5 w-3.5" />)}
    </>
  );
}

const FLOATING_TOOLBAR_SAFE_TOP = 132;
const FLOATING_TOOLBAR_WIDTH = 316;
const FLOATING_TOOLBAR_HEIGHT = 44;

function FloatingBubbleToolbar({ editor }: { editor: Editor }) {
  const [pos, setPos] = React.useState<{ x: number; y: number; placement: "top" | "bottom" } | null>(null);
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

  // Auto-position near the selection without covering page headings or the sticky toolbar.
  React.useEffect(() => {
    if (!hasSelection || dragged) return;
    requestAnimationFrame(() => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const rect = sel.getRangeAt(0).getBoundingClientRect();
      if (!rect.width && !rect.height) return;
      const x = Math.max(
        FLOATING_TOOLBAR_WIDTH / 2 + 8,
        Math.min(rect.left + rect.width / 2, window.innerWidth - FLOATING_TOOLBAR_WIDTH / 2 - 8)
      );
      const canFitAbove = rect.top - FLOATING_TOOLBAR_HEIGHT - 12 > FLOATING_TOOLBAR_SAFE_TOP;
      const canFitBelow = rect.bottom + FLOATING_TOOLBAR_HEIGHT + 12 < window.innerHeight;
      const placement = canFitAbove || !canFitBelow ? "top" : "bottom";
      const y = placement === "top"
        ? rect.top - 10
        : rect.bottom + 10;
      setPos({ x, y, placement });
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

    setPos({ x: startLeft, y: startTop, placement: "bottom" });
    setDragged(true);

    const onMove = (ev: MouseEvent) =>
      setPos({ x: startLeft + ev.clientX - startMx, y: startTop + ev.clientY - startMy, placement: "bottom" });
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
        transform: dragged ? "none" : pos.placement === "top" ? "translate(-50%, -100%)" : "translate(-50%, 0)",
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

function EditorToolbar({ editor, onInsertImage }: { editor: Editor; onInsertImage?: () => void }) {
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
        isCheckbox: e.isActive("checkboxItem"),
        fontSize: e.getAttributes("textStyle").fontSize?.replace("px", "") ?? "",
        color: e.getAttributes("textStyle").color ?? "#0f172a",
      };
    },
  });

  if (!editor || !state) return null;

  const { isBold, isItalic, isUnderline, isParagraph, isH1, isH2, isH3,
    isBullet, isOrdered, isBlockquote, isAlignLeft, isAlignCenter,
    isAlignRight, isAlignJustify, isCheckbox, fontSize, color } = state;

  return (
    <div className="flex flex-wrap items-center gap-1 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
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
      <ToolbarBtn title="Heading 1" active={isH1} onClick={() => applyHeadingToBlock(editor, 1)}>
        <Heading1 className="h-3.5 w-3.5" />
      </ToolbarBtn>
      <ToolbarBtn title="Heading 2" active={isH2} onClick={() => applyHeadingToBlock(editor, 2)}>
        <Heading2 className="h-3.5 w-3.5" />
      </ToolbarBtn>
      <ToolbarBtn title="Heading 3" active={isH3} onClick={() => applyHeadingToBlock(editor, 3)}>
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
      <ToolbarBtn title="Page break (Cmd+Enter)" active={false} onClick={() => editor.chain().focus().insertContent({ type: "pageBreak" }).run()}>
        <Scissors className="h-3.5 w-3.5" />
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

      <Sep />

      {/* Content blocks */}
      <ToolbarBtn
        title="Checkbox list"
        active={isCheckbox}
        onClick={() => editor.chain().focus().insertContent({ type: "checkboxItem" }).run()}
      >
        <CheckSquare className="h-3.5 w-3.5" />
      </ToolbarBtn>
      <ToolbarBtn
        title="Radio group"
        active={false}
        onClick={() =>
          editor.chain().focus().insertContent({
            type: "radioGroup",
            attrs: { label: "Radio group", options: ["Option 1", "Option 2", "Option 3"] },
          }).run()
        }
      >
        <Circle className="h-3.5 w-3.5" />
      </ToolbarBtn>
      <button
        type="button"
        title="Insert image"
        onMouseDown={(e) => { e.preventDefault(); onInsertImage?.(); }}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100"
      >
        <ImagePlus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function ZoomControls({
  zoom,
  onZoomOut,
  onZoomIn,
}: {
  zoom: number;
  onZoomOut: () => void;
  onZoomIn: () => void;
}) {
  return (
    <div className="flex h-[46px] shrink-0 items-center gap-1 rounded-2xl border border-slate-200 bg-white/95 px-2 shadow-sm backdrop-blur">
      <button
        type="button"
        title="Zoom out"
        onClick={onZoomOut}
        disabled={zoom <= ZOOM_MIN}
        className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ZoomOut className="h-4 w-4" />
      </button>
      <span className="min-w-11 text-center text-xs font-semibold tabular-nums text-slate-600">
        {Math.round(zoom * 100)}%
      </span>
      <button
        type="button"
        title="Zoom in"
        onClick={onZoomIn}
        disabled={zoom >= ZOOM_MAX}
        className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ZoomIn className="h-4 w-4" />
      </button>
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
  pdfPageH: number,
  verticalMargin: number
): number {
  const usableH = pdfPageH - verticalMargin * 2;
  const charsPerLine = Math.max(1, Math.floor(pdfTextW / 6.5));
  let usedH = 0;
  let pages = 1;

  for (const node of doc.content ?? []) {
    if (node.type === "pageBreak") {
      pages++;
      usedH = 0;
      continue;
    }

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

// ─── Pagination plugin (DOM-measurement based, Word-style) ────────────────────
type PageConfig = {
  pageHeightPx: number;
  marginYPx: number;
  marginXBasePx: number;
  marginYBasePx: number;
  zoom: number;
};
const paginationKey = new PluginKey<DecorationSet>("tord-pagination");
const WORKSPACE_H = 48; // gray strip height between pages
const PAGE_MARGIN_X_PX = 72;
const PAGE_MARGIN_Y_PX = 80;

// Gap element: spans the full page width via negative horizontal margins.
// whiteTopH fills EXACTLY the remaining space at the bottom of the current page so
// every page is exactly pageHeightPx tall — the gray strip then appears at the true
// page boundary, followed by the fixed top margin for the next page.
function makePageGapEl(whiteTopH: number, pageNum: number, marginX: number, marginY: number): HTMLElement {
  const BOTTOM_MARGIN = marginY;
  const wrap = document.createElement("div");
  wrap.contentEditable = "false";
  wrap.dataset.pageGap = "";
  wrap.style.cssText = `display:block;margin:0 -${marginX}px;width:calc(100% + ${marginX * 2}px);user-select:none;pointer-events:none;`;

  // Remaining white space at bottom of page N (variable height → makes page exact A4/Letter/…)
  const wTop = document.createElement("div");
  wTop.style.cssText = `height:${whiteTopH}px;background:#ffffff;position:relative;`;
  const wTopBorder = document.createElement("div");
  wTopBorder.style.cssText = "position:absolute;bottom:0;left:0;right:0;height:1px;background:#d1d5db;";
  wTop.append(wTopBorder);

  // Gray workspace strip
  const gray = document.createElement("div");
  gray.style.cssText = `height:${WORKSPACE_H}px;background:#f0f0f0;display:flex;align-items:center;justify-content:center;`;
  const lbl = document.createElement("span");
  lbl.style.cssText = "font-size:9px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#9ca3af;";
  lbl.textContent = `Page ${pageNum}`;
  gray.appendChild(lbl);

  // Fixed top-margin of page N+1
  const wBot = document.createElement("div");
  wBot.style.cssText = `height:${BOTTOM_MARGIN}px;background:#ffffff;position:relative;`;
  const wBotBorder = document.createElement("div");
  wBotBorder.style.cssText = "position:absolute;top:0;left:0;right:0;height:1px;background:#d1d5db;";
  wBot.append(wBotBorder);

  wrap.append(wTop, gray, wBot);
  return wrap;
}

function makePageEndFillEl(height: number): HTMLElement {
  const el = document.createElement("div");
  el.contentEditable = "false";
  el.dataset.pageEndFill = "";
  el.style.cssText = `height:${height}px;background:#ffffff;user-select:none;pointer-events:none;`;
  return el;
}


function createPaginationPlugin(configRef: React.MutableRefObject<PageConfig>): Plugin {
  let rafId: number | null = null;
  let lastKey = "";

  // Resolve the top-level DOM element for a doc node at `offset`.
  // Works for both regular blocks (walk up to editorView.dom child) and
  // atom nodes (domAtPos returns the parent + childIndex directly).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function getBlockEl(ev: any, offset: number): HTMLElement | null {
    try {
      const { node: rawNode, offset: childIdx } = ev.domAtPos(offset) as { node: globalThis.Node; offset: number };
      const editorDom = ev.dom as HTMLElement;
      if (rawNode === editorDom) {
        const el = editorDom.childNodes[childIdx] as HTMLElement;
        return el?.nodeType === 1 ? el : null;
      }
      let el: HTMLElement | null = rawNode.nodeType === 3
        ? (rawNode as globalThis.Text).parentElement
        : rawNode as HTMLElement;
      while (el && el.parentElement !== editorDom) el = el.parentElement;
      return el;
    } catch {
      return null;
    }
  }

  return new Plugin<DecorationSet>({
    key: paginationKey,
    state: {
      init: () => DecorationSet.empty,
      apply(tr, decos, _old, newState) {
        const meta = tr.getMeta(paginationKey);
        if (meta === "remeasure") return decos;
        if (meta !== undefined) return meta as DecorationSet;
        return decos.map(tr.mapping, newState.doc);
      },
    },
    props: {
      decorations: (state) => paginationKey.getState(state) ?? DecorationSet.empty,
    },
    view(editorView) {
      function measure() {
        rafId = null;
        const { pageHeightPx, marginYPx, marginXBasePx, marginYBasePx, zoom } = configRef.current;
        const safeZoom = Math.max(0.1, zoom);
        if (pageHeightPx <= 0) return;

        const editorRect = (editorView.dom as HTMLElement).getBoundingClientRect();
        const decos: Decoration[] = [];
        let pageIndex = 0;
        // cumH tracks virtual Y within the page coordinate system.
        // Initialized from the first rendered node's actual DOM top so we capture
        // ProseMirror's top padding exactly instead of hard-coding 72.
        let cumH = -1;
        let prevNodeBottom = -1; // DOM bottom of the last processed node

        editorView.state.doc.forEach((node, offset) => {
          // ── Explicit page break ──────────────────────────────────────────────
          if (node.type.name === "pageBreak") {
            const pbEl = getBlockEl(editorView, offset);
            const pbBottom = pbEl
              ? (pbEl.getBoundingClientRect().bottom - editorRect.top)
              : cumH;
            const whiteTopH = Math.max(0, Math.round(((pageIndex + 1) * pageHeightPx - pbBottom) / safeZoom));
            pageIndex++;
            const nextPageNum = pageIndex + 1;
            const nextStart = pageIndex * pageHeightPx + marginYPx;
            decos.push(Decoration.widget(
              offset + node.nodeSize,
              () => makePageGapEl(whiteTopH, nextPageNum, marginXBasePx, marginYBasePx),
              { side: 1, key: `pb-${offset}-h${whiteTopH}` } as object,
            ));
            cumH = nextStart;
            prevNodeBottom = pbBottom;
            return;
          }

          // ── Regular block ───────────────────────────────────────────────────
          const blockEl = getBlockEl(editorView, offset);
          if (!blockEl) return;

          const rect = blockEl.getBoundingClientRect();
          const nodeTop = rect.top - editorRect.top;
          const nodeH = rect.height;
          if (nodeH <= 0) return;

          if (cumH < 0) {
            // First node — bootstrap cumH from its actual DOM top.
            cumH = nodeTop;
          } else {
            // Add the natural inter-node gap from the DOM.
            // If the gap is large (> marginYPx * 1.5), it's a decoration gap —
            // skip it so the decoration height doesn't inflate cumH.
            const naturalGap = nodeTop - prevNodeBottom;
            if (naturalGap > 0 && naturalGap <= marginYPx * 1.5) {
              cumH += naturalGap;
            }
          }

          const pageTop = pageIndex * pageHeightPx + marginYPx;
          const pageContentEnd = (pageIndex + 1) * pageHeightPx - marginYPx;
          if (cumH > pageTop + 1 && cumH + nodeH > pageContentEnd) {
            // Node would overflow into this page's bottom margin — push to next page.
            const whiteTopH = Math.max(0, Math.round(((pageIndex + 1) * pageHeightPx - cumH) / safeZoom));
            pageIndex++;
            const nextPageNum = pageIndex + 1;
            const nextStart = pageIndex * pageHeightPx + marginYPx;
            decos.push(Decoration.widget(
              offset,
              () => makePageGapEl(whiteTopH, nextPageNum, marginXBasePx, marginYBasePx),
              { side: -1, key: `auto-${offset}-p${pageIndex - 1}-h${whiteTopH}` } as object,
            ));
            cumH = nextStart;
          }

          cumH += nodeH;
          prevNodeBottom = rect.bottom - editorRect.top;
        });

        if (cumH >= 0) {
          const fillerH = Math.max(0, Math.round(((pageIndex + 1) * pageHeightPx - cumH) / safeZoom));
          if (fillerH > 1) {
            decos.push(Decoration.widget(
              editorView.state.doc.content.size,
              () => makePageEndFillEl(fillerH),
              { side: 1, key: `final-p${pageIndex + 1}-h${fillerH}` } as object,
            ));
          }
        }

        // Stability check: dispatch only when break positions or gap heights change.
        const newKey = decos.map(d => (d as unknown as { spec: { key: string } }).spec.key).join("|");
        if (newKey === lastKey) return;
        lastKey = newKey;
        const decoSet = DecorationSet.create(editorView.state.doc, decos);
        editorView.dispatch(editorView.state.tr.setMeta(paginationKey, decoSet));
      }

      function schedule() {
        if (rafId !== null) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(measure);
      }

      schedule();

      return {
        update(view, prevState) {
          // If ONLY the decoration state changed (we just applied gaps, doc unchanged),
          // do NOT re-schedule — that would cause an infinite measurement loop.
          const prevDeco = paginationKey.getState(prevState);
          const currDeco = paginationKey.getState(view.state);
          if (prevDeco !== currDeco && view.state.doc === prevState.doc) return;
          schedule();
        },
        destroy() {
          if (rafId !== null) cancelAnimationFrame(rafId);
        },
      };
    },
  });
}

// ─── Main component ───────────────────────────────────────────────────────────
type DocumentCreatorProps = {
  documentId?: string;
  initialTitle?: string;
  initialSenderName?: string;
  initialSenderEmail?: string;
  initialBlocks?: DocumentBlock[];
  initialPageSize?: PageSize;
  initialPageMargins?: PageMargins;
};

export function DocumentCreator({
  documentId,
  initialTitle,
  initialSenderName,
  initialSenderEmail,
  initialBlocks,
  initialPageSize,
  initialPageMargins,
}: DocumentCreatorProps = {}) {
  useGoogleFonts();
  const router = useRouter();
  const [title, setTitle] = React.useState(initialTitle ?? "Untitled document");
  const [senderName, setSenderName] = React.useState(initialSenderName ?? "");
  const [senderEmail, setSenderEmail] = React.useState(initialSenderEmail ?? "");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pageSize, setPageSize] = React.useState<PageSize>(initialPageSize ?? "a4");
  const [editorZoom, setEditorZoom] = React.useState(1);
  const [pageMargins, setPageMargins] = React.useState<PageMargins>(initialPageMargins ?? {
    top: PAGE_MARGIN_Y_PX,
    right: PAGE_MARGIN_X_PX,
    bottom: PAGE_MARGIN_Y_PX,
    left: PAGE_MARGIN_X_PX,
  });
  const pageConfig = PAGE_SIZE_CONFIG[pageSize];
  const pageWidthPx = pageConfig.pdfWidth;
  const [pageHeightPx, setPageHeightPx] = React.useState(PAGE_SIZE_CONFIG.a4.pdfHeight);
  const [estimatedPages, setEstimatedPages] = React.useState(1);
  const pageConfigRef = React.useRef<PageConfig>({
    pageHeightPx: PAGE_SIZE_CONFIG.a4.pdfHeight,
    marginYPx: PAGE_MARGIN_Y_PX,
    marginXBasePx: PAGE_MARGIN_X_PX,
    marginYBasePx: PAGE_MARGIN_Y_PX,
    zoom: 1,
  });

  // Keep pagination measurements in sync with page size and editor zoom.
  React.useEffect(() => {
    const cfg = PAGE_SIZE_CONFIG[pageSize];
    setPageHeightPx(cfg.pdfHeight);
    pageConfigRef.current = {
      pageHeightPx: cfg.pdfHeight * editorZoom,
      marginYPx: pageMargins.top * editorZoom,
      marginXBasePx: pageMargins.left,
      marginYBasePx: pageMargins.top,
      zoom: editorZoom,
    };
  }, [pageSize, editorZoom, pageMargins.top, pageMargins.right, pageMargins.bottom, pageMargins.left]);

  const PaginationExt = React.useMemo(() =>
    Extension.create({
      name: "pagination",
      addProseMirrorPlugins() {
        return [createPaginationPlugin(pageConfigRef)];
      },
    }), []
  );

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
      PageBreakNode,
      CheckboxItemNode,
      RadioGroupNode,
      ImageBlockNode,
      HeadingEnterFix,
      PaginationExt,
    ],
    content: initialBlocks ? blocksToTiptap(initialBlocks) : undefined,
    editorProps: {
      attributes: {
        class: "document-pages-editor",
        style: "padding: var(--tord-page-margin-top, 80px) var(--tord-page-margin-right, 72px) var(--tord-page-margin-bottom, 80px) var(--tord-page-margin-left, 72px); box-sizing: border-box; outline: none;",
      },
    },
  });

  React.useEffect(() => {
    if (!editor) return;
    editor.view.dispatch(editor.state.tr.setMeta(paginationKey, "remeasure"));
  }, [editor, pageHeightPx, editorZoom, pageMargins.top, pageMargins.right, pageMargins.bottom, pageMargins.left]);

  React.useEffect(() => {
    if (!editor) return;
    const cfg = PAGE_SIZE_CONFIG[pageSize];
    const textW = cfg.pdfWidth - pageMargins.left - pageMargins.right;
    const update = () => {
      const json = editor.getJSON() as { content?: TiptapNode[] };
      setEstimatedPages(estimatePageCount(json, textW, cfg.pdfHeight, pageMargins.top));
    };
    editor.on("update", update);
    update();
    return () => { editor.off("update", update); };
  }, [editor, pageSize, pageMargins.left, pageMargins.right, pageMargins.top, pageMargins.bottom]);

  const addImageBlock = useCallback(() => {
    if (!editor) return;
    const input = globalThis.document.createElement("input");
    input.type = "file";
    input.accept = "image/png,image/jpeg,image/jpg,image/webp";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const src = await fileToCompressedDataUrl(file);
        editor.chain().focus().insertContent({ type: "imageBlock", attrs: { src, alt: file.name } }).run();
      } catch {
        // ignore load errors
      }
    };
    input.click();
  }, [editor]);

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

  const zoomOut = React.useCallback(() => {
    setEditorZoom((current) => clampZoom(current - ZOOM_STEP));
  }, []);

  const zoomIn = React.useCallback(() => {
    setEditorZoom((current) => clampZoom(current + ZOOM_STEP));
  }, []);

  const updatePageMargin = React.useCallback((key: keyof PageMargins, value: number) => {
    setPageMargins((current) => ({ ...current, [key]: clampPageMargin(value) }));
  }, []);

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
          body: JSON.stringify({ title: title.trim(), senderName: senderName.trim(), senderEmail: senderEmail.trim(), blocks, pageSize, pageMargins }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(
          data.error?.formErrors?.[0] ??
          (Object.values(data.error?.fieldErrors ?? {}) as string[][])[0]?.[0] ??
          (typeof data.error === "string" ? data.error : null) ??
          "Unable to update document."
        );
        docId = documentId;
      } else {
        const res = await fetch("/api/documents/from-blocks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: title.trim(), senderName: senderName.trim(), senderEmail: senderEmail.trim(), blocks, pageSize, pageMargins }),
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
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1">
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
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-400">Top margin</span>
              <input
                type="number"
                min={PAGE_MARGIN_MIN}
                max={PAGE_MARGIN_MAX}
                value={pageMargins.top}
                onChange={(e) => updatePageMargin("top", Number(e.target.value))}
                className="h-8 w-20 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-600 outline-none transition hover:border-slate-300"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-400">Right margin</span>
              <input
                type="number"
                min={PAGE_MARGIN_MIN}
                max={PAGE_MARGIN_MAX}
                value={pageMargins.right}
                onChange={(e) => updatePageMargin("right", Number(e.target.value))}
                className="h-8 w-20 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-600 outline-none transition hover:border-slate-300"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-400">Bottom margin</span>
              <input
                type="number"
                min={PAGE_MARGIN_MIN}
                max={PAGE_MARGIN_MAX}
                value={pageMargins.bottom}
                onChange={(e) => updatePageMargin("bottom", Number(e.target.value))}
                className="h-8 w-20 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-600 outline-none transition hover:border-slate-300"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-400">Left margin</span>
              <input
                type="number"
                min={PAGE_MARGIN_MIN}
                max={PAGE_MARGIN_MAX}
                value={pageMargins.left}
                onChange={(e) => updatePageMargin("left", Number(e.target.value))}
                className="h-8 w-20 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-600 outline-none transition hover:border-slate-300"
              />
            </label>
          </div>
        </div>

        {/* Rich text editor */}
        <div className="rounded-[28px] border bg-white shadow-card">
          {editor && (
            <div className="sticky top-[76px] z-30 px-3 pt-3">
              <div className="flex flex-wrap items-start gap-2 rounded-[22px] bg-white/90 p-1.5 shadow-[0_18px_44px_rgba(15,23,42,0.14)] ring-1 ring-slate-200/70 backdrop-blur">
                <EditorToolbar editor={editor} onInsertImage={addImageBlock} />
                <ZoomControls zoom={editorZoom} onZoomOut={zoomOut} onZoomIn={zoomIn} />
              </div>
            </div>
          )}

          {editor && <FloatingBubbleToolbar editor={editor} />}

          {/* Grey canvas workspace */}
          <div className="doc-workspace">
            <div
              className="doc-workspace-inner"
              style={{ width: pageWidthPx * editorZoom, maxWidth: "none" }}
            >
              {/* Page 1 label */}
              <div className="mb-2">
                <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#9ca3af]">Page 1</span>
              </div>

              {/* ProseMirror carries the fixed selected page size; gap widgets carve visible page boundaries */}
              <div
                style={{
                  width: pageWidthPx,
                  minHeight: pageHeightPx,
                  ["zoom" as string]: editorZoom,
                  ["--tord-page-height" as string]: `${pageHeightPx}px`,
                  ["--tord-page-margin-top" as string]: `${pageMargins.top}px`,
                  ["--tord-page-margin-right" as string]: `${pageMargins.right}px`,
                  ["--tord-page-margin-bottom" as string]: `${pageMargins.bottom}px`,
                  ["--tord-page-margin-left" as string]: `${pageMargins.left}px`,
                }}
              >
                <div>
                  <EditorContent editor={editor} />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2 text-xs text-slate-400">
            <span>~{estimatedPages} {estimatedPages === 1 ? "page" : "pages"}</span>
            <span>{pageConfig.shortLabel}</span>
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

            {/* Content blocks */}
            <div className="border-t border-slate-100 pt-4">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Content blocks
              </p>
              <div className="grid gap-1.5">
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().insertContent({ type: "checkboxItem" }).run()}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 text-left transition hover:border-slate-400 hover:bg-slate-50"
                >
                  <CheckSquare className="h-4 w-4 shrink-0 text-slate-600" />
                  <span className="text-sm text-slate-700">Checkbox list</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    editor?.chain().focus().insertContent({
                      type: "radioGroup",
                      attrs: { label: "Radio group", options: ["Option 1", "Option 2", "Option 3"] },
                    }).run()
                  }
                  className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 text-left transition hover:border-slate-400 hover:bg-slate-50"
                >
                  <Circle className="h-4 w-4 shrink-0 text-slate-600" />
                  <span className="text-sm text-slate-700">Radio group</span>
                </button>
                <button
                  type="button"
                  onClick={addImageBlock}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 text-left transition hover:border-slate-400 hover:bg-slate-50"
                >
                  <ImagePlus className="h-4 w-4 shrink-0 text-slate-600" />
                  <span className="text-sm text-slate-700">Insert image</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

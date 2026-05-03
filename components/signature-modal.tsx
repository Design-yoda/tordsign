"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, PenLine, Type, X } from "lucide-react";
import { SignatureCanvas } from "@/components/signature-canvas";
import { cn } from "@/lib/utils";

type Tab = "draw" | "type" | "upload";

function typeToDataUrl(name: string): string {
  const W = 600, H = 150;
  const dpr = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1;
  const canvas = document.createElement("canvas");
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);
  ctx.font = "52px cursive";
  ctx.fillStyle = "#0f172a";
  ctx.textBaseline = "middle";
  ctx.fillText(name, 16, H / 2);
  return canvas.toDataURL("image/png");
}

export function SignatureModal({
  title = "Add your signature",
  onClose,
  onInsert
}: {
  title?: string;
  onClose: () => void;
  onInsert: (dataUrl: string) => void;
}) {
  const [tab, setTab] = useState<Tab>("draw");
  const [drawUrl, setDrawUrl] = useState<string | null>(null);
  const [typedName, setTypedName] = useState("");
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);
  const clearDrawRef = useRef<(() => void) | null>(null);

  const pending =
    tab === "draw" ? drawUrl :
    tab === "type" ? (typedName.trim() ? typeToDataUrl(typedName) : null) :
    uploadUrl;

  function handleUpload(file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () =>
      setUploadUrl(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  }

  function handleInsert() {
    if (!pending) return;
    onInsert(pending);
  }

  const onDrawChange = useCallback((v: string | null) => setDrawUrl(v), []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const tabs: { id: Tab; label: string; icon: typeof PenLine }[] = [
    { id: "draw", label: "Draw", icon: PenLine },
    { id: "type", label: "Type", icon: Type },
    { id: "upload", label: "Upload", icon: Camera }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="flex w-full max-w-2xl flex-col rounded-2xl bg-white shadow-[0_32px_80px_rgba(0,0,0,0.18)]">
        {/* Header */}
        <div className="flex items-start justify-between px-7 pt-7 pb-0">
          <h2 className="text-[26px] font-semibold tracking-tight text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="mt-0.5 rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab bar */}
        <div className="mt-5 flex border-b border-slate-200 px-7">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "mr-6 flex items-center gap-2 border-b-2 pb-3 text-sm font-medium transition",
                tab === id
                  ? "border-ink text-ink"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="px-7 pt-5 pb-0 min-h-[220px]">
          {tab === "draw" && (
            <DrawTab onChange={onDrawChange} onClearRef={clearDrawRef} />
          )}
          {tab === "type" && (
            <TypeTab value={typedName} onChange={setTypedName} />
          )}
          {tab === "upload" && (
            <UploadTab url={uploadUrl} onFile={handleUpload} />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-4 px-7 py-5 mt-4">
          <p className="text-[13px] text-slate-500 max-w-xs">
            I understand this is a legal representation of my signature.
          </p>
          <button
            type="button"
            disabled={!pending}
            onClick={handleInsert}
            className={cn(
              "rounded-full px-6 py-2.5 text-sm font-semibold transition",
              pending
                ? "bg-ink text-white hover:bg-slate-800"
                : "bg-slate-100 text-slate-400 cursor-not-allowed"
            )}
          >
            Insert
          </button>
        </div>
      </div>
    </div>
  );
}

function DrawTab({
  onChange,
  onClearRef
}: {
  onChange: (v: string | null) => void;
  onClearRef: React.MutableRefObject<(() => void) | null>;
}) {
  const [hasDrawn, setHasDrawn] = useState(false);
  const innerClearRef = useRef<(() => void) | null>(null);

  const wrappedOnChange = useCallback((v: string | null) => {
    setHasDrawn(!!v);
    onChange(v);
  }, [onChange]);

  return (
    <div className="relative rounded-xl border border-slate-200 bg-white overflow-hidden">
      {/* Guide line */}
      <div className="absolute bottom-10 left-8 right-8 border-b border-slate-200 pointer-events-none" />

      {/* Clear × button */}
      {hasDrawn && (
        <button
          type="button"
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => {
            innerClearRef.current?.();
            onChange(null);
            setHasDrawn(false);
          }}
          className="absolute bottom-[34px] left-6 z-10 flex items-center gap-1 text-slate-400 hover:text-slate-700 transition"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      <SignatureCanvas
        onChange={wrappedOnChange}
        onClearReady={(clear) => {
          innerClearRef.current = clear;
          onClearRef.current = clear;
        }}
        hideClearButton
      />
    </div>
  );
}

function TypeTab({
  value,
  onChange
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <input
        autoFocus
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type your full name"
        className="w-full border-b-2 border-slate-200 bg-transparent px-1 py-2 text-xl outline-none transition focus:border-ink"
        style={{ fontFamily: "cursive" }}
      />
      {value.trim() ? (
        <div className="relative flex min-h-[120px] items-center rounded-xl border border-slate-200 px-6">
          {/* Guide line */}
          <div className="absolute bottom-10 left-6 right-6 border-b border-slate-200" />
          <span
            className="select-none text-[46px] leading-none text-ink"
            style={{ fontFamily: "cursive" }}
          >
            {value}
          </span>
        </div>
      ) : (
        <div className="flex min-h-[120px] items-center justify-center rounded-xl border border-dashed border-slate-200">
          <p className="text-sm text-slate-400">Preview will appear here</p>
        </div>
      )}
    </div>
  );
}

function UploadTab({
  url,
  onFile
}: {
  url: string | null;
  onFile: (f: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-3">
      {url ? (
        <div className="flex min-h-[160px] items-center justify-center rounded-xl border border-slate-200 p-4">
          <img src={url} alt="Uploaded signature" className="max-h-40 object-contain" />
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          className="flex min-h-[160px] cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 transition hover:bg-slate-100"
        >
          <Camera className="h-8 w-8 text-slate-400" />
          <p className="text-sm text-slate-500">Click to upload an image</p>
          <p className="text-xs text-slate-400">PNG, JPG — transparent PNG recommended</p>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
      {url && (
        <button
          type="button"
          onClick={() => { onFile(null); }}
          className="text-sm text-slate-500 hover:text-rose-600 transition"
        >
          Remove
        </button>
      )}
    </div>
  );
}

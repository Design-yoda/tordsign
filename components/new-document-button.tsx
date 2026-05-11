"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ChevronDown, FileUp, PenLine } from "lucide-react";

export function NewDocumentButton() {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  function openDropdown() {
    if (open) {
      setOpen(false);
      return;
    }
    if (btnRef.current) setRect(btnRef.current.getBoundingClientRect());
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    function onScroll() {
      if (btnRef.current) setRect(btnRef.current.getBoundingClientRect());
    }
    function onResize() {
      if (btnRef.current) setRect(btnRef.current.getBoundingClientRect());
    }
    function onMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (btnRef.current?.contains(target)) return;
      const panel = document.getElementById("new-doc-dropdown");
      if (panel && panel.contains(target)) return;
      setOpen(false);
    }
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    document.addEventListener("mousedown", onMouseDown);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("mousedown", onMouseDown);
    };
  }, [open]);

  const dropdown = open && rect
    ? createPortal(
        <div
          id="new-doc-dropdown"
          style={{
            position: "fixed",
            top: rect.bottom + 8,
            left: rect.right - 208,
            width: 208,
            zIndex: 9999,
          }}
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
        >
          <Link
            href="/documents/new/create"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 transition hover:bg-slate-50"
          >
            <PenLine className="h-4 w-4 shrink-0 text-teal-600" />
            From scratch
          </Link>
          <div className="mx-4 border-t border-slate-100" />
          <Link
            href="/documents/new/upload"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 transition hover:bg-slate-50"
          >
            <FileUp className="h-4 w-4 shrink-0 text-slate-500" />
            Upload PDF
          </Link>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={openDropdown}
        className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
      >
        Create new document
        <ChevronDown className={`h-4 w-4 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
      </button>
      {dropdown}
    </>
  );
}

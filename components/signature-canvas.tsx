"use client";

import { useCallback, useEffect, useRef } from "react";
import { RotateCcw } from "lucide-react";
import SignaturePad from "signature_pad";

export function SignatureCanvas({
  onChange,
  hideClearButton = false,
  onClearReady
}: {
  onChange: (value: string | null) => void;
  hideClearButton?: boolean;
  onClearReady?: (clear: () => void) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const signaturePadRef = useRef<SignaturePad | null>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!canvasRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    const context = canvas.getContext("2d");
    context?.scale(ratio, ratio);

    const signaturePad = new SignaturePad(canvas, {
      penColor: "#0f172a",
      minWidth: 0.8,
      maxWidth: 1.8
    });
    signaturePadRef.current = signaturePad;

    signaturePad.addEventListener("endStroke", () => {
      onChangeRef.current(signaturePad.isEmpty() ? null : signaturePad.toDataURL("image/png"));
    });

    return () => {
      signaturePad.off();
      signaturePadRef.current = null;
    };
  }, []);

  const clear = useCallback(() => {
    signaturePadRef.current?.clear();
    onChangeRef.current(null);
  }, []);

  useEffect(() => {
    onClearReady?.(clear);
    return () => onClearReady?.(() => undefined);
  }, [clear, onClearReady]);

  return (
    <div>
      <canvas ref={canvasRef} className="h-40 w-full rounded-2xl border bg-white" />
      {!hideClearButton && (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={clear}
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
          >
            <RotateCcw className="h-4 w-4" />
            Clear
          </button>
        </div>
      )}
    </div>
  );
}

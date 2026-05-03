"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { House } from "lucide-react";

export function AppHeader() {
  const pathname = usePathname();
  const showHomeButton = pathname !== "/";

  return (
    <header className="sticky top-0 z-50 border-b border-white/70 bg-[#fcfbf8]/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div className="inline-flex items-center gap-3">
          {showHomeButton ? (
            <Link
              href="/"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
              aria-label="Go to home"
            >
              <House className="h-4 w-4" />
            </Link>
          ) : null}
          <Image
            src="/Tordsign.svg"
            alt="Tord Sign"
            width={201}
            height={41}
            priority
            className="h-[30px] w-auto"
          />
        </div>
      </div>
    </header>
  );
}

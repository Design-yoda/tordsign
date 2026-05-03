import { cn } from "@/lib/utils";
import type { DocumentStatus } from "@/lib/types";

const statusStyles: Record<DocumentStatus, string> = {
  Draft: "bg-slate-100 text-slate-700",
  Sent: "bg-amber-100 text-amber-800",
  Completed: "bg-emerald-100 text-emerald-800",
  Expired: "bg-rose-100 text-rose-700"
};

export function StatusBadge({ status }: { status: DocumentStatus }) {
  return (
    <span className={cn("rounded-full px-3 py-1 text-xs font-medium", statusStyles[status])}>
      {status}
    </span>
  );
}

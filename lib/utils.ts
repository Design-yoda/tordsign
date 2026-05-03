import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";

export function cn(...inputs: Parameters<typeof clsx>) {
  return twMerge(clsx(inputs));
}

export function formatDate(value: string) {
  return format(new Date(value), "MMM d, yyyy");
}

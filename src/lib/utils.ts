import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isSafeUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export function levelName(level: number): string {
  switch (level) {
    case 0: return "Domain";
    case 1: return "Field";
    case 2: return "Subfield";
    case 3: return "Topic";
    default: return "Topic";
  }
}

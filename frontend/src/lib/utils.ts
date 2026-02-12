import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string, locale: string): string {
  return new Date(dateString).toLocaleDateString(locale === "ar" ? "ar-SA" : locale === "sv" ? "sv-SE" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

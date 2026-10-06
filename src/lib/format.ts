import { formatDistanceToNowStrict } from "date-fns";
import { fr } from "date-fns/locale";

export function formatDuration(total: number) {
  const s = Math.max(0, Math.floor(total));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

export function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".", ",").replace(",0", "")} M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1).replace(".", ",").replace(",0", "")} k`;
  return String(n);
}

export function formatViews(n: number) {
  return `${formatCount(n)} vue${n > 1 ? "s" : ""}`;
}

export function timeAgo(date: string) {
  return `il y a ${formatDistanceToNowStrict(new Date(date), { locale: fr })}`;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

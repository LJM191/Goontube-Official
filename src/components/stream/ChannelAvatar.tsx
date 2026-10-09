import { useMediaUrl } from "@/lib/media";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

export function ChannelAvatar({
  name,
  path,
  className,
}: {
  name: string;
  path: string | null | undefined;
  className?: string;
}) {
  // Google OAuth may provide a complete external avatar URL; legacy profile photos
  // are storage paths and are resolved through Supabase Storage.
  const isExternalUrl = !!path && /^https?:\/\//i.test(path);
  const url = useMediaUrl("avatars", isExternalUrl ? null : path);
  const imageUrl = isExternalUrl ? path : url;
  return (
    <div
      className={cn(
        "grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-brand text-[11px] font-semibold uppercase text-primary-foreground",
        className,
      )}
    >
      {imageUrl ? <img src={imageUrl} alt={name} loading="lazy" decoding="async" className="size-full object-cover" /> : initials(name) || "?"}
    </div>
  );
}

export function VerifiedDot() {
  return (
    <span
      aria-label="Chaîne vérifiée"
      title="Chaîne vérifiée"
      className="ml-1 inline-block size-3 translate-y-0.5 rounded-full bg-glow/80"
    />
  );
}

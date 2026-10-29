import { useState } from "react";
import { Cast, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { useMediaUrl } from "@/lib/media";

type CastWindow = Window & {
  __onGCastApiAvailable?: (available: boolean) => void;
  cast?: any;
  chrome?: any;
  __goontubeCastSdkPromise?: Promise<boolean>;
};

function loadGoogleCastSdk(): Promise<boolean> {
  const w = window as CastWindow;
  if (w.cast?.framework && w.chrome?.cast) return Promise.resolve(true);
  if (w.__goontubeCastSdkPromise) return w.__goontubeCastSdkPromise;
  w.__goontubeCastSdkPromise = new Promise<boolean>((resolve) => {
    let settled = false;
    let timeoutId: number | undefined;
    const finish = (available: boolean) => {
      if (settled) return;
      settled = true;
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      const ready = available && Boolean(w.cast?.framework && w.chrome?.cast);
      if (!ready) delete w.__goontubeCastSdkPromise;
      resolve(ready);
    };
    w.__onGCastApiAvailable = (available) => finish(available);
    const script = document.createElement("script");
    script.src = "https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1";
    script.async = true;
    script.onerror = () => finish(false);
    document.head.appendChild(script);
    timeoutId = window.setTimeout(() => finish(Boolean(w.cast?.framework && w.chrome?.cast)), 10000);
  });
  return w.__goontubeCastSdkPromise;
}

export function CommunityMedia({ path, type, title }: { path: string; type: "photo" | "gif"; title: string }) {
  const url = useMediaUrl("thumbnails", path);
  const [casting, setCasting] = useState(false);

  async function castMedia() {
    if (!url) return;
    setCasting(true);
    try {
      const w = window as CastWindow;
      const available = await loadGoogleCastSdk();
      if (!available || !w.cast?.framework || !w.chrome?.cast) {
        toast.info("La diffusion directe nécessite un navigateur compatible Google Cast et un appareil Cast sur le même réseau Wi-Fi.");
        return;
      }
      const context = w.cast.framework.CastContext.getInstance();
      context.setOptions({
        receiverApplicationId: w.chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
        autoJoinPolicy: w.chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
      });
      const session = context.getCurrentSession() ?? await context.requestSession();
      const mediaPath = new URL(url, window.location.href).pathname.toLowerCase();
      const mediaContentType = mediaPath.endsWith(".gif")
        ? "image/gif"
        : mediaPath.endsWith(".png")
          ? "image/png"
          : mediaPath.endsWith(".webp")
            ? "image/webp"
            : "image/jpeg";
      const mediaInfo = new w.chrome.cast.media.MediaInfo(url, mediaContentType);
      const metadata = new w.chrome.cast.media.GenericMediaMetadata();
      metadata.title = title || (type === "gif" ? "GIF Goontube" : "Photo Goontube");
      mediaInfo.metadata = metadata;
      const request = new w.chrome.cast.media.LoadRequest(mediaInfo);
      await session.loadMedia(request);
      toast.success("Demande de diffusion envoyée.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (/cancel|cancelled|canceled/i.test(message)) return;
      toast.error("Impossible de démarrer la diffusion. Vérifie que l’appareil est allumé et connecté au même Wi-Fi.");
    } finally {
      setCasting(false);
    }
  }

  if (!url) return <div className="mt-3 flex aspect-video items-center justify-center rounded-xl bg-frost text-sm text-muted-foreground">Chargement du média…</div>;

  return (
    <div className="relative mt-3 overflow-hidden rounded-xl border border-edge/50 bg-black/5">
      <img src={url} alt={title || (type === "gif" ? "GIF de la communauté" : "Photo de la communauté")} loading="lazy" className="max-h-[min(70vh,680px)] w-full object-contain" />
      <button type="button" onClick={castMedia} disabled={casting} aria-label="Caster ce média sur un téléviseur" className="absolute right-3 top-3 inline-flex min-h-10 items-center gap-2 rounded-full border border-white/20 bg-black/75 px-3.5 text-sm font-semibold text-white shadow-lg backdrop-blur transition hover:bg-black/90 disabled:opacity-60">
        {casting ? <LoaderCircle className="size-4 animate-spin" /> : <Cast className="size-4" />}
        <span>{casting ? "Connexion…" : "Caster"}</span>
      </button>
    </div>
  );
}

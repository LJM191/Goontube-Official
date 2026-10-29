import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { MonitorUp, Tv2, Wifi, WifiOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { APP_NAME } from "@/lib/config";

export const Route = createFileRoute("/cast")({
  head: () => ({ meta: [{ title: `Réception TV — ${APP_NAME}` }] }),
  component: CastReceiver,
});

type CastMedia = { url: string; title: string; type: "photo" | "gif" };

function CastReceiver() {
  const [code, setCode] = useState("");
  const [activeCode, setActiveCode] = useState("");
  const [media, setMedia] = useState<CastMedia | null>(null);
  const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "error">("idle");
  const channelRef = useRef<RealtimeChannel | null>(null);
  const readyTimerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (readyTimerRef.current !== null) window.clearInterval(readyTimerRef.current);
    if (channelRef.current) void supabase.removeChannel(channelRef.current);
  }, []);

  async function connect(event: FormEvent) {
    event.preventDefault();
    const normalized = code.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    if (normalized.length !== 6) return;
    if (channelRef.current) await supabase.removeChannel(channelRef.current);
    setMedia(null);
    setStatus("connecting");
    setActiveCode(normalized);
    const channel = supabase.channel(`goontube-cast-${normalized}`, { config: { broadcast: { self: false } } });
    channelRef.current = channel;
    channel.on("broadcast", { event: "media" }, (message) => {
      const next = message.payload as CastMedia;
      if (next && typeof next.url === "string" && /^https?:\/\//i.test(next.url)) {
        if (readyTimerRef.current !== null) window.clearInterval(readyTimerRef.current);
        readyTimerRef.current = null;
        setMedia({ url: next.url, title: String(next.title || "Publication Goontube"), type: next.type === "gif" ? "gif" : "photo" });
        setStatus("connected");
      }
    });
    channel.subscribe((nextStatus) => {
      if (nextStatus === "SUBSCRIBED") {
        setStatus("connected");
        void channel.send({ type: "broadcast", event: "ready", payload: { receiver: "tv" } });
        if (readyTimerRef.current !== null) window.clearInterval(readyTimerRef.current);
        readyTimerRef.current = window.setInterval(() => {
          void channel.send({ type: "broadcast", event: "ready", payload: { receiver: "tv" } });
        }, 2000);
      }
      if (nextStatus === "CHANNEL_ERROR" || nextStatus === "TIMED_OUT") setStatus("error");
    });
  }

  return <main className="fixed inset-0 flex min-h-dvh flex-col bg-[#09090d] text-white">
    <header className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-8">
      <div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-xl bg-fuchsia-500/15 text-fuchsia-300"><Tv2 className="size-5" /></div><div><p className="font-black tracking-tight">GOONTUBE</p><p className="text-xs text-white/50">Réception sur grand écran</p></div></div>
      <div className="flex items-center gap-2 text-xs text-white/60">{status === "connected" ? <><Wifi className="size-4 text-emerald-400" /> Connecté</> : status === "error" ? <><WifiOff className="size-4 text-red-400" /> Erreur de connexion</> : <><Wifi className="size-4" /> En attente</>}</div>
    </header>
    <section className="flex flex-1 items-center justify-center p-5 sm:p-10">
      {media ? <div className="flex h-full w-full flex-col items-center justify-center gap-4"><img src={media.url} alt={media.title} className="max-h-[calc(100dvh-130px)] max-w-full object-contain" /><p className="max-w-full truncate text-sm text-white/60">{media.title}</p></div> :
        <div className="w-full max-w-lg text-center">
          <div className="mx-auto flex size-20 items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-fuchsia-300"><MonitorUp className="size-9" /></div>
          <h1 className="mt-6 text-3xl font-black tracking-tight sm:text-4xl">Prêt pour le grand écran ?</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/60 sm:text-base">Sur ton téléphone ou ton ordinateur, ouvre Photos et GIFs sur Goontube, appuie sur « Afficher sur un écran », puis saisis le code affiché ici.</p>
          <form onSubmit={connect} className="mx-auto mt-8 max-w-sm space-y-3">
            <label htmlFor="cast-code" className="block text-left text-xs font-bold uppercase tracking-[0.16em] text-white/60">Code à 6 caractères</label>
            <input id="cast-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))} autoCapitalize="characters" autoComplete="off" maxLength={6} placeholder="ABC123" className="h-16 w-full rounded-2xl border border-white/15 bg-white/[0.06] text-center font-mono text-3xl font-black tracking-[0.28em] text-white outline-none transition placeholder:text-white/20 focus:border-fuchsia-400 focus:ring-4 focus:ring-fuchsia-400/10" />
            <button type="submit" disabled={code.replace(/[^A-Z0-9]/g, "").length !== 6 || status === "connecting"} className="h-12 w-full rounded-xl bg-fuchsia-500 text-sm font-bold text-white transition hover:bg-fuchsia-400 disabled:cursor-not-allowed disabled:opacity-40">{status === "connecting" ? "Connexion…" : "Connecter cet écran"}</button>
            {status === "error" && <p role="alert" className="text-sm text-red-300">Connexion impossible. Vérifie le code et la connexion Internet, puis réessaie.</p>}
            {activeCode && status === "connected" && <p className="text-sm text-emerald-300">Écran connecté. En attente de l’image…</p>}
          </form>
          <p className="mt-8 text-xs text-white/35">Laisse cette page ouverte pendant la diffusion.</p>
        </div>}
    </section>
  </main>;
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { ArrowUpRight, Check, Copy, ImagePlus, Images, LoaderCircle, MonitorUp, Search, Sparkles, Trash2, Tv2, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { uploadMedia, useMediaUrl } from "@/lib/media";
import { Input } from "@/components/ui/input";
import { APP_NAME } from "@/lib/config";

export const Route = createFileRoute("/photos")({
  head: () => ({ meta: [{ title: `Photos et GIFs — ${APP_NAME}` }] }),
  component: PhotosPage,
});

type Media = { id: string; channel_id: string; media_type: "photo" | "gif"; title: string; url: string; created_at: string; channel?: { handle: string; name: string; user_id: string } | null };
type CastPayload = { url: string; title: string; type: "photo" | "gif" };
type CastSession = { code: string; channel: RealtimeChannel; connected: boolean; current: CastPayload };

function makeCastCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

function MediaCard({ item, canDelete, onDelete, onCast }: { item: Media; canDelete: boolean; onDelete: (id: string) => void; onCast: (item: Media, url: string) => void }) {
  const url = useMediaUrl("thumbnails", item.url);
  return <article className="group overflow-hidden rounded-2xl border border-edge/70 bg-panel/80 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-glow/40 hover:shadow-xl">
    <button type="button" onClick={() => url && onCast(item, url)} disabled={!url} className="relative block w-full overflow-hidden bg-frost text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glow" aria-label={`Afficher ${item.title || "la publication"} sur un écran`}>
      <div className="aspect-[4/3]"><img src={url || undefined} alt={item.title || "Publication de la communauté"} loading="lazy" className="size-full object-cover transition duration-500 group-hover:scale-[1.03]" /></div>
      <span className="absolute left-3 top-3 rounded-full border border-white/15 bg-black/65 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">{item.media_type === "gif" ? "GIF animé" : "Photo"}</span>
      <span className="absolute bottom-3 right-3 flex size-10 items-center justify-center rounded-full border border-white/20 bg-black/65 text-white shadow-lg backdrop-blur"><MonitorUp className="size-4" /></span>
    </button>
    <div className="p-3.5 sm:p-4">
      <div className="flex items-start justify-between gap-2"><h2 className="line-clamp-2 min-w-0 font-semibold leading-snug">{item.title || "Sans titre"}</h2>{canDelete && <button type="button" onClick={() => onDelete(item.id)} aria-label="Supprimer la publication" className="rounded-full p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="size-4" /></button>}</div>
      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground"><Link to="/c/$handle" params={{ handle: item.channel?.handle ?? "" }} className="truncate hover:text-glow">{item.channel?.name ?? "Chaîne"}</Link><span className="shrink-0">{new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(item.created_at))}</span></div>
      <button type="button" onClick={() => url && onCast(item, url)} disabled={!url} className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-edge/80 bg-background/60 px-3 text-sm font-medium transition hover:border-glow/50 hover:bg-glow/5 disabled:opacity-50"><Tv2 className="size-4 text-glow" /> Afficher sur un écran</button>
    </div>
  </article>;
}

function PhotosPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState<"photo" | "gif">("photo");
  const [filter, setFilter] = useState<"all" | "photo" | "gif">("all");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [castSession, setCastSession] = useState<CastSession | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!file) { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(file); setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => () => { if (castSession?.channel) void supabase.removeChannel(castSession.channel); }, [castSession?.channel]);

  const { data: media, isLoading, isError } = useQuery({
    queryKey: ["channel-media-all"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("channel_media").select("*,channel:channels!inner(handle,name,user_id)").order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as Media[];
    },
  });
  const visibleMedia = useMemo(() => (media ?? []).filter((item) => {
    const matchesType = filter === "all" || item.media_type === filter;
    return matchesType && `${item.title ?? ""} ${item.channel?.name ?? ""}`.toLocaleLowerCase("fr").includes(search.toLocaleLowerCase("fr").trim());
  }), [media, filter, search]);

  async function publish(e: FormEvent) {
    e.preventDefault();
    if (!user || !file) return;
    const me = await (supabase as any).from("channels").select("id").eq("user_id", user.id).maybeSingle();
    if (me.error || !me.data) { toast.error("Créez d'abord votre chaîne pour publier."); return; }
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) { toast.error("Formats acceptés : JPEG, PNG, WebP ou GIF."); return; }
    if (type === "gif" && file.type !== "image/gif") { toast.error("Pour publier un GIF, choisissez un fichier .gif animé."); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("10 Mo maximum pour une image."); return; }
    setBusy(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = await uploadMedia("thumbnails", user.id, file, ext);
      const { error } = await (supabase as any).from("channel_media").insert({ channel_id: me.data.id, media_type: type, title: title.trim(), url: path });
      if (error) throw error;
      setFile(null); setTitle(""); qc.invalidateQueries({ queryKey: ["channel-media-all"] }); toast.success("Publication ajoutée à la galerie !");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Impossible de publier"); } finally { setBusy(false); }
  }

  async function remove(id: string) {
    const { error } = await (supabase as any).from("channel_media").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["channel-media-all"] }); toast.success("Publication supprimée.");
  }

  function startCast(item: Media, url: string) {
    const payload: CastPayload = { url, title: item.title || (item.media_type === "gif" ? "GIF Goontube" : "Photo Goontube"), type: item.media_type };
    if (castSession) {
      setCastSession({ ...castSession, current: payload });
      if (castSession.connected) void castSession.channel.send({ type: "broadcast", event: "media", payload });
      return;
    }
    const code = makeCastCode();
    const channel = supabase.channel(`goontube-cast-${code}`, { config: { broadcast: { self: false } } });
    channel.on("broadcast", { event: "ready" }, () => {
      setCastSession((current) => {
        if (!current || current.code !== code) return current;
        void channel.send({ type: "broadcast", event: "media", payload: current.current });
        return { ...current, connected: true };
      });
    });
    channel.subscribe((status) => {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") toast.error("Connexion de diffusion impossible. Réessayez.");
    });
    setCastSession({ code, channel, connected: false, current: payload });
  }

  async function copyCastLink() {
    if (!castSession) return;
    const link = `${window.location.origin}/cast`;
    try { await navigator.clipboard.writeText(link); setCopied(true); toast.success("Lien copié : ouvre-le sur la télé."); }
    catch { toast.info(`Ouvre ${link} sur la télé et saisis le code ${castSession.code}.`); }
  }

  function stopCast() { if (castSession) void supabase.removeChannel(castSession.channel); setCastSession(null); setCopied(false); }

  return <main className="mx-auto w-full max-w-7xl space-y-6 px-3 pb-12 pt-4 sm:space-y-8 sm:px-6 sm:pt-8">
    <section className="relative isolate overflow-hidden rounded-[1.75rem] border border-edge/70 bg-panel shadow-lg sm:rounded-[2rem]">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--glow)/0.18),transparent_55%),radial-gradient(ellipse_at_bottom_left,hsl(var(--glow)/0.08),transparent_45%)]" />
      <div className="grid gap-6 p-5 sm:p-8 lg:grid-cols-[1fr_0.8fr] lg:items-center lg:p-10">
        <div><p className="inline-flex items-center gap-2 rounded-full border border-glow/25 bg-glow/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-glow"><Sparkles className="size-3.5" /> Le coin visuel Goontube</p><h1 className="mt-4 max-w-xl text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">Les images qui font parler.</h1><p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">Partage tes photos, tes GIFs et tes moments préférés avec la communauté. Découvre les publications, puis affiche-les sur un grand écran en quelques secondes.</p><div className="mt-5 flex flex-wrap gap-2 text-xs text-muted-foreground"><span className="rounded-full border border-edge bg-background/60 px-3 py-1.5">Photos & GIFs</span><span className="rounded-full border border-edge bg-background/60 px-3 py-1.5">Jusqu’à 10 Mo</span><span className="rounded-full border border-edge bg-background/60 px-3 py-1.5">Pensé pour mobile</span></div></div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4"><div className="flex min-h-36 flex-col justify-between rounded-2xl border border-white/10 bg-gradient-to-br from-fuchsia-500/20 via-panel to-glow/15 p-4 sm:min-h-44 sm:p-5"><div className="flex size-10 items-center justify-center rounded-xl bg-glow/15 text-glow"><Images className="size-5" /></div><div><p className="text-2xl font-black sm:text-3xl">{media?.length ?? "—"}</p><p className="mt-1 text-xs text-muted-foreground">publications récentes</p></div></div><div className="flex min-h-36 flex-col justify-between rounded-2xl border border-white/10 bg-gradient-to-br from-amber-400/15 via-panel to-rose-500/10 p-4 sm:min-h-44 sm:p-5"><div className="flex size-10 items-center justify-center rounded-xl bg-amber-400/15 text-amber-500"><Tv2 className="size-5" /></div><div><p className="text-lg font-bold sm:text-xl">Mode TV</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Un code, un navigateur, le grand écran.</p></div></div></div>
      </div>
    </section>

    {user ? <section className="overflow-hidden rounded-3xl border border-edge/70 bg-panel/80 shadow-sm">
      <div className="flex items-start gap-3 border-b border-edge/60 p-4 sm:p-5"><div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-glow/10 text-glow"><UploadCloud className="size-5" /></div><div><h2 className="font-bold sm:text-lg">Partager une image</h2><p className="mt-1 text-xs leading-5 text-muted-foreground sm:text-sm">Choisis un fichier, ajoute un titre et publie-le sur ta chaîne.</p></div></div>
      <form onSubmit={publish} className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto] lg:items-end">
        <div className="space-y-2"><label htmlFor="media-title" className="text-sm font-medium">Titre <span className="text-muted-foreground">(facultatif)</span></label><Input id="media-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Donne un nom à ta publication" maxLength={120} className="h-11 bg-background/60" /><div className="text-right text-[11px] text-muted-foreground">{title.length}/120</div></div>
        <div className="space-y-2"><span className="block text-sm font-medium">Fichier à publier</span><div className="flex min-h-11 min-w-0 items-center gap-3 rounded-xl border border-dashed border-edge bg-background/40 px-3 py-2">{previewUrl ? <img src={previewUrl} alt="Aperçu du fichier" className="size-10 shrink-0 rounded-lg object-cover" /> : <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-glow/10 text-glow"><ImagePlus className="size-5" /></div>}<div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{file?.name ?? "JPEG, PNG, WebP ou GIF"}</p><p className="text-xs text-muted-foreground">{file ? `${(file.size / (1024 * 1024)).toFixed(1)} Mo` : "10 Mo maximum"}</p></div><label className="inline-flex min-h-9 shrink-0 cursor-pointer items-center gap-2 rounded-lg bg-foreground px-3 text-xs font-semibold text-background hover:opacity-85"><ImagePlus className="size-3.5" />{file ? "Changer" : "Choisir"}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => { const next = e.target.files?.[0] ?? null; setFile(next); if (next?.type === "image/gif") setType("gif"); else if (next) setType("photo"); }} /></label></div>
          {file && <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setType("photo")} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${type === "photo" ? "bg-glow text-primary-foreground" : "bg-background text-muted-foreground"}`}>Photo</button><button type="button" onClick={() => setType("gif")} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${type === "gif" ? "bg-glow text-primary-foreground" : "bg-background text-muted-foreground"}`}>GIF animé</button></div>}
        </div>
        <button disabled={busy || !file} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-glow px-5 text-sm font-bold text-primary-foreground shadow-md transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 lg:min-w-36">{busy ? <><LoaderCircle className="size-4 animate-spin" /> Publication…</> : <><UploadCloud className="size-4" /> Publier</>}</button>
      </form>
    </section> : <section className="flex flex-col gap-3 rounded-2xl border border-edge/70 bg-panel/70 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"><div><h2 className="font-semibold">Une photo à partager ?</h2><p className="mt-1 text-sm text-muted-foreground">Connecte-toi pour publier tes propres photos et GIFs.</p></div><Link to="/auth" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-glow px-4 text-sm font-semibold text-primary-foreground">Se connecter <ArrowUpRight className="size-4" /></Link></section>}

    <section className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-glow">À découvrir</p><h2 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">La galerie</h2><p className="mt-1 text-sm text-muted-foreground">Les dernières images partagées par les chaînes.</p></div><label className="relative block w-full sm:max-w-xs"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher une publication…" className="h-11 rounded-xl bg-panel pl-9" /></label></div>
      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Filtrer la galerie">{([{ id: "all", label: "Tout" }, { id: "photo", label: "Photos" }, { id: "gif", label: "GIFs" }] as const).map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={filter === tab.id} onClick={() => setFilter(tab.id)} className={`min-h-10 shrink-0 rounded-full px-5 text-sm font-semibold transition ${filter === tab.id ? "bg-foreground text-background shadow-sm" : "border border-edge bg-panel text-muted-foreground hover:text-foreground"}`}>{tab.label}{tab.id === "all" ? <span className="ml-2 text-xs opacity-70">{media?.length ?? 0}</span> : null}</button>)}</div>
      {isLoading ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">{Array.from({ length: 8 }, (_, i) => <div key={i} className="aspect-[4/5] animate-pulse rounded-2xl bg-panel" />)}</div> :
       isError ? <div className="rounded-2xl border border-destructive/20 bg-panel p-8 text-center"><p className="font-semibold">La galerie n’a pas pu charger.</p><p className="mt-1 text-sm text-muted-foreground">Vérifie ta connexion puis réessaie.</p><button onClick={() => void qc.invalidateQueries({ queryKey: ["channel-media-all"] })} className="mt-4 rounded-full border border-edge px-4 py-2 text-sm font-semibold">Réessayer</button></div> :
       visibleMedia.length === 0 ? <div className="rounded-3xl border border-dashed border-edge bg-panel/50 px-5 py-14 text-center sm:py-20"><div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-glow/10 text-glow"><Images className="size-7" /></div><h3 className="mt-4 text-lg font-bold">{search ? "Aucun résultat" : filter === "gif" ? "Pas encore de GIFs" : filter === "photo" ? "Pas encore de photos" : "La galerie attend ses premières images"}</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{search ? "Essaie un autre mot-clé." : "Sois parmi les premiers à partager une image avec la communauté Goontube."}</p></div> :
       <div className="grid grid-cols-2 items-start gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">{visibleMedia.map((item) => <MediaCard key={item.id} item={item} canDelete={item.channel?.user_id === user?.id} onDelete={remove} onCast={startCast} />)}</div>}
    </section>

    {castSession && <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/65 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) stopCast(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="cast-title" className="w-full max-w-md rounded-t-3xl border border-edge bg-panel p-5 shadow-2xl sm:rounded-3xl sm:p-6">
        <div className="flex items-start justify-between gap-4"><div className="flex size-12 items-center justify-center rounded-2xl bg-glow/10 text-glow"><Tv2 className="size-6" /></div><button type="button" onClick={stopCast} aria-label="Fermer" className="rounded-full p-2 text-muted-foreground hover:bg-background"><X className="size-5" /></button></div>
        <h2 id="cast-title" className="mt-4 text-2xl font-black">Afficher sur la télé</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Ouvre la page de réception Goontube dans le navigateur de la télé, puis saisis ce code. Garde cette fenêtre ouverte pendant la diffusion.</p>
        <div className="my-5 rounded-2xl border border-glow/25 bg-glow/[0.06] p-4 text-center"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Code de connexion</p><p className="my-2 font-mono text-4xl font-black tracking-[0.22em] text-glow sm:text-5xl">{castSession.code}</p><div className="flex items-center justify-center gap-2 text-xs">{castSession.connected ? <><span className="size-2 rounded-full bg-emerald-500" /><span className="font-semibold text-emerald-600">Écran connecté</span></> : <><span className="size-2 animate-pulse rounded-full bg-amber-500" /><span className="text-muted-foreground">En attente de la télé…</span></>}</div></div>
        <div className="space-y-2 rounded-2xl bg-background/60 p-4 text-sm"><p className="font-semibold">Sur la télé</p><p className="text-muted-foreground">1. Ouvre <span className="font-semibold text-foreground">goontube.fr/cast</span></p><p className="text-muted-foreground">2. Entre le code ci-dessus et appuie sur Connecter.</p><p className="text-muted-foreground">3. La photo ou le GIF s’affiche en plein écran.</p></div>
        <button type="button" onClick={() => void copyCastLink()} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-edge bg-background px-4 text-sm font-semibold hover:border-glow/50">{copied ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}{copied ? "Lien copié" : "Copier le lien de réception"}</button>
        <p className="mt-3 text-center text-[11px] leading-5 text-muted-foreground">Pour un téléviseur sans navigateur, utilise la recopie d’écran intégrée à ton téléphone.</p>
      </section>
    </div>}
  </main>;
}

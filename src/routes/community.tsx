import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent } from "react";
import { ArrowBigDown, ArrowBigUp, ImagePlus, MessageCircle, Plus, Search, Users, X, Flame, Clock3, LayoutList } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { uploadMedia, useMediaUrl } from "@/lib/media";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CommunityMedia } from "@/components/stream/CommunityMedia";
import { APP_NAME } from "@/lib/config";

export const Route = createFileRoute("/community")({
  head: () => ({ meta: [{ title: `Communauté — ${APP_NAME}` }] }),
  component: CommunityPage,
});

type Forum = { id: string; owner_id: string; name: string; slug: string; description: string | null; is_public: boolean; created_at: string };
type Thread = { id: string; forum_id: string; author_id: string; title: string; body: string; media_path: string | null; media_type: "photo" | "gif" | null; is_pinned: boolean; created_at: string; updated_at: string; forum?: { name: string; slug: string } | null };
type Vote = { thread_id: string; user_id: string; value: number };

function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);
}

function CommunityPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"hot" | "new" | "top">("hot");
  const [showComposer, setShowComposer] = useState(false);
  const [showCreateForum, setShowCreateForum] = useState(false);
  const [forumId, setForumId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [forumName, setForumName] = useState("");
  const [forumDescription, setForumDescription] = useState("");

  const { data: forums, isLoading: forumsLoading } = useQuery({
    queryKey: ["community-forums"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("community_forums").select("id,owner_id,name,slug,description,is_public,created_at").eq("is_public", true).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Forum[];
    },
  });

  const { data: threads, isLoading, isError } = useQuery({
    queryKey: ["community-feed"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("community_threads").select("id,forum_id,author_id:user_id,title,body:content,media_path,media_type,is_pinned,created_at,updated_at,forum:community_forums!inner(name,slug,is_public)").eq("forum.is_public", true).order("is_pinned", { ascending: false }).order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return (data ?? []) as Thread[];
    },
  });

  const { data: votes } = useQuery({
    queryKey: ["community-votes", user?.id],
    enabled: !!threads?.length,
    queryFn: async () => {
      const ids = (threads ?? []).map((t) => t.id);
      const { data, error } = await (supabase as any).from("community_votes").select("thread_id,user_id,value").in("thread_id", ids);
      if (error) throw error;
      return (data ?? []) as Vote[];
    },
  });

  const voteSummary = useMemo(() => {
    const totals = new Map<string, number>();
    const mine = new Map<string, number>();
    (votes ?? []).forEach((vote) => {
      totals.set(vote.thread_id, (totals.get(vote.thread_id) ?? 0) + vote.value);
      if (vote.user_id === user?.id) mine.set(vote.thread_id, vote.value);
    });
    return { totals, mine };
  }, [votes, user?.id]);

  const visibleThreads = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("fr");
    const result = (threads ?? []).filter((thread) => !term || `${thread.title} ${thread.body} ${thread.forum?.name ?? ""}`.toLocaleLowerCase("fr").includes(term));
    return result.sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
      if (sort === "new") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sort === "top") return (voteSummary.totals.get(b.id) ?? 0) - (voteSummary.totals.get(a.id) ?? 0);
      const score = (t: Thread) => (voteSummary.totals.get(t.id) ?? 0) + 1 / (1 + (Date.now() - new Date(t.created_at).getTime()) / 3600000);
      return score(b) - score(a);
    });
  }, [threads, search, sort, voteSummary]);

  async function publishPost(e: FormEvent) {
    e.preventDefault();
    if (!user) { toast.error("Connecte-toi pour publier."); return; }
    if (!forumId && !forums?.length) { toast.error("Crée d’abord un forum pour accueillir ta publication."); return; }
    if (!title.trim() || (!body.trim() && !file)) { toast.error("Ajoute un titre et un texte ou une image."); return; }
    if (file && !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) { toast.error("Formats acceptés : JPEG, PNG, WebP et GIF."); return; }
    if (file && file.size > 10 * 1024 * 1024) { toast.error("10 Mo maximum par image ou GIF."); return; }
    setBusy(true);
    let uploadedMediaPath: string | null = null;
    try {
      const targetForum = forumId || forums?.[0]?.id;
      if (!targetForum) throw new Error("Aucun forum disponible.");
      let mediaPath: string | null = null;
      let mediaType: "photo" | "gif" | null = null;
      if (file) {
        const ext = file.name.split(".").pop()?.toLowerCase() || (file.type === "image/gif" ? "gif" : "jpg");
        mediaPath = await uploadMedia("thumbnails", user.id, file, ext);
        uploadedMediaPath = mediaPath;
        mediaType = file.type === "image/gif" ? "gif" : "photo";
      }
      const { error } = await (supabase as any).from("community_threads").insert({
        forum_id: targetForum, user_id: user.id, title: title.trim(), content: body.trim() || " ",
        media_path: mediaPath, media_type: mediaType,
      });
      if (error) throw error;
      uploadedMediaPath = null;
      setTitle(""); setBody(""); setFile(null); setShowComposer(false);
      await qc.invalidateQueries({ queryKey: ["community-feed"] });
      toast.success("Publication partagée avec la communauté !");
    } catch (error) {
      if (uploadedMediaPath) {
        await supabase.storage.from("thumbnails").remove([uploadedMediaPath]).catch(() => undefined);
      }
      toast.error(error instanceof Error ? error.message : "Impossible de publier");
    } finally { setBusy(false); }
  }

  async function createForum(e: FormEvent) {
    e.preventDefault();
    if (!user || !forumName.trim()) return;
    setBusy(true);
    try {
      const { data, error } = await (supabase as any).from("community_forums").insert({
        owner_id: user.id, name: forumName.trim(), slug: `${slugify(forumName)}-${crypto.randomUUID().slice(0, 6)}`,
        description: forumDescription.trim(), is_public: true,
      }).select("id,slug").single();
      if (error) throw error;
      setForumName(""); setForumDescription(""); setShowCreateForum(false);
      await qc.invalidateQueries({ queryKey: ["community-forums"] });
      if (data?.id) setForumId(data.id);
      toast.success("Communauté créée !");
      if (data?.slug) await navigate({ to: "/community/forum/$slug", params: { slug: data.slug } });
    } catch (error) {
      const message = typeof error === "object" && error !== null && "message" in error && typeof error.message === "string" ? error.message : error instanceof Error ? error.message : "Impossible de créer la communauté";
      toast.error(message);
    } finally { setBusy(false); }
  }

  async function vote(threadId: string, value: number) {
    if (!user) { toast.info("Connecte-toi pour voter."); return; }
    const existing = voteSummary.mine.get(threadId) ?? 0;
    try {
      if (existing === value) {
        const { error } = await (supabase as any).from("community_votes").delete().eq("thread_id", threadId).eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("community_votes").upsert({ thread_id: threadId, user_id: user.id, value }, { onConflict: "thread_id,user_id" });
        if (error) throw error;
      }
      await qc.invalidateQueries({ queryKey: ["community-votes"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Vote impossible");
    }
  }

  return (
    <main className="mx-auto w-full max-w-[1440px] px-3 pb-10 pt-4 sm:px-5 sm:pt-7 lg:px-8">
      <div className="mb-5 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-glow">GOONTUBE · COMMUNAUTÉ</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Le fil de la communauté</h1>
          <p className="mt-1 text-sm text-muted-foreground">Des discussions, des idées, des photos et des GIFs au même endroit.</p>
        </div>
        <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto sm:shrink-0">
          <button onClick={() => setShowCreateForum((value) => !value)} className="inline-flex min-h-10 min-w-0 flex-1 items-center justify-center gap-2 rounded-full border border-edge bg-panel px-3 text-xs font-semibold transition hover:bg-frost sm:flex-none sm:px-4 sm:text-sm"><Users className="size-4" /><span className="hidden sm:inline">Créer une communauté</span><span className="sm:hidden">Communauté</span></button>
          <button onClick={() => setShowComposer((value) => !value)} className="inline-flex min-h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-full bg-glow px-3 text-sm font-bold text-primary-foreground shadow-sm transition hover:brightness-110 sm:flex-none sm:px-4">
            {showComposer ? <X className="size-4" /> : <Plus className="size-4" />}<span className="hidden sm:inline">{showComposer ? "Fermer" : "Créer un post"}</span><span className="sm:hidden">{showComposer ? "Fermer" : "Créer"}</span>
          </button>
        </div>
      </div>

      {showComposer && <form onSubmit={publishPost} className="mb-5 rounded-2xl border border-edge/70 bg-panel p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold">Créer une publication</h2><button type="button" onClick={() => setShowComposer(false)} aria-label="Fermer" className="rounded-full p-2 text-muted-foreground hover:bg-frost"><X className="size-4" /></button></div>
        {!user && <p className="mb-3 rounded-xl bg-frost p-3 text-sm">Connecte-toi pour publier et voter.</p>}
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Un titre clair et accrocheur" maxLength={160} required />
          <select value={forumId || forums?.[0]?.id || ""} onChange={(e) => setForumId(e.target.value)} required className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-glow">
            {(forums ?? []).map((forum) => <option key={forum.id} value={forum.id}>{forum.name}</option>)}
          </select>
        </div>
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Qu’est-ce que tu veux partager ? Ajoute du contexte ou lance une discussion…" rows={4} maxLength={10000} className="mt-3" />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <label className="inline-flex min-h-10 min-w-0 max-w-full cursor-pointer items-center gap-2 rounded-full border border-edge px-4 text-sm font-semibold transition hover:bg-frost"><ImagePlus className="size-4 shrink-0 text-glow" /><span className="min-w-0 truncate">{file ? file.name : "Ajouter une photo ou un GIF"}</span><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label>
          {file && <button type="button" onClick={() => setFile(null)} className="text-sm text-muted-foreground underline">Retirer le média</button>}
          <button disabled={busy || !user || (!forums?.length)} className="inline-flex min-h-10 items-center justify-center rounded-full bg-foreground px-5 text-sm font-bold text-background transition hover:opacity-90 disabled:opacity-50">{busy ? "Publication…" : "Publier"}</button>
        </div>
        {file && <p className="mt-2 truncate text-xs text-muted-foreground">Média sélectionné : {file.name} · max. 10 Mo</p>}
        {!forums?.length && <p className="mt-2 text-sm text-muted-foreground">Il n’y a pas encore de communauté. Crée-en une dans le panneau à droite.</p>}
      </form>}

      {showCreateForum && <form onSubmit={createForum} className="mb-5 rounded-2xl border border-edge/70 bg-panel p-4 sm:p-5"><div className="mb-3 flex items-center justify-between"><h2 className="font-bold">Créer une communauté</h2><button type="button" onClick={() => setShowCreateForum(false)} aria-label="Fermer" className="rounded-full p-1.5 hover:bg-frost"><X className="size-4" /></button></div><div className="grid gap-3 sm:grid-cols-2"><Input value={forumName} onChange={(e) => setForumName(e.target.value)} placeholder="Nom de la communauté" maxLength={60} required /><Input value={forumDescription} onChange={(e) => setForumDescription(e.target.value)} placeholder="Description (facultatif)" maxLength={240} /></div><button disabled={busy} className="mt-3 rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background disabled:opacity-50">{busy ? "Création…" : "Créer la communauté"}</button></form>}

      {!forumsLoading && !!forums?.length && <section className="mb-5 rounded-2xl border border-edge/60 bg-panel p-4 lg:hidden"><div className="mb-2 flex items-center justify-between"><h2 className="font-bold">Communautés existantes</h2><span className="text-xs text-muted-foreground">{forums.length}</span></div><div className="flex flex-wrap gap-2">{forums.map((forum) => <Link key={forum.id} to="/community/forum/$slug" params={{ slug: forum.slug }} className="inline-flex min-h-9 max-w-full items-center gap-2 rounded-full border border-edge/60 px-3 py-2 text-sm hover:bg-frost"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-frost text-[10px] font-black text-glow">g/</span><span className="min-w-0 truncate">{forum.name}</span></Link>)}</div></section>}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_290px] xl:grid-cols-[minmax(0,760px)_310px] xl:justify-center">
        <section className="min-w-0">
          <div className="mb-3 flex items-center gap-1 overflow-x-auto rounded-xl border border-edge/60 bg-panel p-1.5">
            <button onClick={() => setSort("hot")} className={`inline-flex min-h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition ${sort === "hot" ? "bg-frost text-foreground" : "text-muted-foreground hover:text-foreground"}`}><Flame className="size-4" /> Populaires</button>
            <button onClick={() => setSort("new")} className={`inline-flex min-h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition ${sort === "new" ? "bg-frost text-foreground" : "text-muted-foreground hover:text-foreground"}`}><Clock3 className="size-4" /> Récents</button>
            <button onClick={() => setSort("top")} className={`inline-flex min-h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition ${sort === "top" ? "bg-frost text-foreground" : "text-muted-foreground hover:text-foreground"}`}><ArrowBigUp className="size-4" /> Meilleurs votes</button>
          </div>
          <label className="mb-3 flex min-h-11 items-center gap-3 rounded-xl border border-edge/60 bg-panel px-4 focus-within:ring-2 focus-within:ring-glow/40"><Search className="size-4 shrink-0 text-muted-foreground" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher dans les publications…" className="w-full bg-transparent text-sm outline-none" /><span className="hidden text-xs text-muted-foreground sm:inline">Rechercher</span></label>
          {isLoading ? <div className="rounded-2xl border border-edge/60 bg-panel p-10 text-center text-muted-foreground">Chargement du fil…</div> : isError ? <div className="rounded-2xl border border-edge/60 bg-panel p-8 text-center"><p className="font-semibold">Le fil n’a pas pu être chargé.</p><p className="mt-1 text-sm text-muted-foreground">Vérifie la configuration de la communauté et réessaie.</p><button onClick={() => qc.invalidateQueries({ queryKey: ["community-feed"] })} className="mt-3 rounded-full border border-edge px-4 py-2 text-sm">Réessayer</button></div> : visibleThreads.length === 0 ? <div className="rounded-2xl border border-edge/60 bg-panel p-10 text-center"><div className="mx-auto grid size-12 place-items-center rounded-2xl bg-frost text-glow"><MessageCircle className="size-6" /></div><h2 className="mt-4 font-bold">Rien à afficher pour l’instant</h2><p className="mt-1 text-sm text-muted-foreground">Lance la première discussion ou partage une photo ou un GIF.</p><button onClick={() => setShowComposer(true)} className="mt-4 rounded-full bg-glow px-4 py-2 text-sm font-bold text-primary-foreground">Créer une publication</button></div> :
            <div className="space-y-3">{visibleThreads.map((thread) => <PostCard key={thread.id} thread={thread} score={voteSummary.totals.get(thread.id) ?? 0} myVote={voteSummary.mine.get(thread.id) ?? 0} onVote={vote} />)}</div>}
        </section>

        <aside className="hidden space-y-4 lg:block">
          <section className="rounded-2xl border border-edge/60 bg-panel p-5"><div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-glow/10 text-glow"><Users className="size-5" /></div><div><h2 className="font-bold">Tes communautés</h2><p className="text-xs text-muted-foreground">{forums?.length ?? 0} espace{(forums?.length ?? 0) === 1 ? "" : "s"} public{(forums?.length ?? 0) === 1 ? "" : "s"}</p></div></div><button onClick={() => setShowCreateForum((value) => !value)} className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full border border-edge px-3 text-sm font-semibold transition hover:bg-frost"><Plus className="size-4" /> Créer une communauté</button><div className="mt-4 space-y-1">{(forums ?? []).slice(0, 8).map((forum) => <Link key={forum.id} to="/community/forum/$slug" params={{ slug: forum.slug }} className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-frost"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-frost text-xs font-black text-glow">g/</span><span className="min-w-0 flex-1 truncate text-sm font-medium">{forum.name}</span><span className="text-xs text-muted-foreground">›</span></Link>)}</div>{forumsLoading && <p className="mt-3 text-xs text-muted-foreground">Chargement…</p>}</section>
          <section className="rounded-2xl border border-edge/60 bg-panel p-5"><h2 className="font-bold">Bienvenue sur Goontube</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Partage tes idées, pose tes questions et ajoute des images ou des GIFs directement à tes publications.</p><div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><LayoutList className="size-4" /> Un seul fil, tous les formats</div></section>
        </aside>
      </div>
    </main>
  );
}

function PostCard({ thread, score, myVote, onVote }: { thread: Thread; score: number; myVote: number; onVote: (threadId: string, value: number) => void }) {
  return (
    <article className="group flex min-w-0 gap-2 rounded-2xl border border-edge/60 bg-panel p-3 shadow-sm transition hover:border-edge sm:gap-3 sm:p-4">
      <div className="flex w-9 shrink-0 flex-col items-center gap-0.5 rounded-xl bg-frost/60 py-2 sm:w-10">
        <button type="button" onClick={() => onVote(thread.id, 1)} aria-label="Vote positif" aria-pressed={myVote === 1} className={`grid size-8 place-items-center rounded-lg transition hover:bg-glow/10 ${myVote === 1 ? "text-glow" : "text-muted-foreground"}`}><ArrowBigUp className="size-6" /></button>
        <span className="text-xs font-black tabular-nums">{score}</span>
        <button type="button" onClick={() => onVote(thread.id, -1)} aria-label="Vote négatif" aria-pressed={myVote === -1} className={`grid size-8 place-items-center rounded-lg transition hover:bg-glow/10 ${myVote === -1 ? "text-glow" : "text-muted-foreground"}`}><ArrowBigDown className="size-6" /></button>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">{thread.forum?.slug ? <Link to="/community/forum/$slug" params={{ slug: thread.forum.slug }} className="font-semibold text-glow hover:underline">{thread.forum.name}</Link> : <span className="font-semibold text-glow">{thread.forum?.name ?? "Communauté"}</span>}<span>·</span><span>{new Date(thread.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>{thread.is_pinned && <span className="rounded-full bg-glow/10 px-2 py-0.5 font-semibold text-glow">Épinglé</span>}</div>
        <Link to="/community/thread/$id" params={{ id: thread.id }} className="mt-1 block break-words text-[15px] font-bold leading-snug tracking-tight [overflow-wrap:anywhere] hover:text-glow sm:text-base">{thread.title}</Link>
        {thread.body?.trim() && <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 [overflow-wrap:anywhere] text-muted-foreground">{thread.body}</p>}
        {thread.media_path && thread.media_type && <CommunityMedia path={thread.media_path} type={thread.media_type} title={thread.title} />}
        <div className="mt-3 flex flex-wrap items-center gap-2"><Link to="/community/thread/$id" params={{ id: thread.id }} className="inline-flex min-h-9 items-center gap-2 rounded-full px-3 text-xs font-semibold text-muted-foreground transition hover:bg-frost hover:text-foreground"><MessageCircle className="size-4" /> Rejoindre la discussion</Link><span className="text-xs text-muted-foreground">·</span><span className="text-xs text-muted-foreground">Goontube Communauté</span></div>
      </div>
    </article>
  );
}

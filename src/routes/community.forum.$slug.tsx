import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { ArrowLeft, MessageSquare, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { uploadMedia } from "@/lib/media";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CommunityMedia } from "@/components/stream/CommunityMedia";
import { QueryErrorState } from "@/components/stream/QueryErrorState";
import { APP_NAME } from "@/lib/config";

export const Route = createFileRoute("/community/forum/$slug")({
  head: () => ({ meta: [{ title: "Communauté — Goontube" }] }),
  component: ForumPage,
});

type Forum = { id: string; name: string; slug: string; description: string | null };
type Thread = { id: string; forum_id: string; author_id: string; title: string; body: string; media_path: string | null; media_type: "photo" | "gif" | null; created_at: string; updated_at: string };

function ForumPage() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [busy, setBusy] = useState(false);

  const { data: forum, isLoading: forumLoading, isError: forumError, refetch: refetchForum } = useQuery({
    queryKey: ["community-forum", slug],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("community_forums").select("id,name,slug,description").eq("slug", slug).maybeSingle();
      if (error) throw error;
      return data as Forum | null;
    },
  });

  const { data: threads, isLoading, isError: threadsError, refetch: refetchThreads } = useQuery({
    queryKey: ["community-threads", forum?.id],
    enabled: !!forum,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("community_threads").select("*").eq("forum_id", forum!.id).order("is_pinned", { ascending: false }).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Thread[];
    },
  });

  async function createThread(e: FormEvent) {
    e.preventDefault();
    if (!user || !forum || !title.trim() || (!body.trim() && !file)) return;
    if (file && !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) { toast.error("Formats acceptés : JPEG, PNG, WebP et GIF."); return; }
    if (file && file.size > 10 * 1024 * 1024) { toast.error("10 Mo maximum par média."); return; }
    setBusy(true);
    try {
      let mediaPath: string | null = null;
      let mediaType: "photo" | "gif" | null = null;
      if (file) {
        mediaPath = await uploadMedia("thumbnails", user.id, file, file.name.split(".").pop() || "jpg");
        mediaType = file.type === "image/gif" ? "gif" : "photo";
      }
      const { data, error } = await (supabase as any).from("community_threads").insert({ forum_id: forum.id, author_id: user.id, title: title.trim(), body: body.trim() || " ", media_path: mediaPath, media_type: mediaType }).select("id").single();
      if (error) throw error;
      setTitle(""); setBody(""); setFile(null); setShowNew(false);
      await qc.invalidateQueries({ queryKey: ["community-threads", forum.id] });
      await qc.invalidateQueries({ queryKey: ["community-feed"] });
      toast.success("Publication partagée !");
      if (data) window.location.href = `/community/thread/${data.id}`;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de publier");
    } finally { setBusy(false); }
  }

  if (forumLoading) return <div className="mx-auto max-w-4xl p-8 text-center text-muted-foreground">Chargement…</div>;
  if (forumError) return <QueryErrorState title="Impossible de charger la communauté" onRetry={() => void refetchForum()} />;
  if (!forum) return <div className="mx-auto max-w-4xl p-8 text-center">Communauté introuvable.</div>;

  return (
    <main className="mx-auto w-full max-w-4xl space-y-4 px-3 pb-10 pt-4 sm:px-6 sm:pt-7">
      <Link to="/community" className="inline-flex min-h-9 items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Retour au fil</Link>
      <header className="rounded-2xl border border-edge/60 bg-panel p-5 sm:p-7">
        <p className="text-xs font-bold uppercase tracking-[.16em] text-glow">Communauté publique</p>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><h1 className="text-2xl font-black sm:text-3xl">{forum.name}</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">{forum.description || "Discussions, idées et médias partagés par les membres."}</p></div>{user && <button onClick={() => setShowNew((v) => !v)} className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full bg-glow px-4 text-sm font-bold text-primary-foreground"><MessageSquare className="size-4" /> Publier</button>}</div>
        {showNew && user && <form onSubmit={createThread} className="mt-5 space-y-3 rounded-xl bg-frost/50 p-4"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre de la publication" maxLength={160} required /><Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Écris ton message…" rows={4} maxLength={10000} /><div className="flex flex-wrap items-center justify-between gap-3"><label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border border-edge px-3 text-sm font-semibold"><ImagePlus className="size-4 text-glow" />{file ? file.name : "Photo ou GIF"}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label><button disabled={busy || (!body.trim() && !file)} className="rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-50">{busy ? "Publication…" : "Publier"}</button></div>{file && <button type="button" onClick={() => setFile(null)} className="text-xs text-muted-foreground underline">Retirer le média sélectionné</button>}</form>}
      </header>
      {isLoading ? <div className="rounded-2xl border border-edge/60 bg-panel p-8 text-center text-muted-foreground">Chargement des publications…</div> : threadsError ? <QueryErrorState title="Impossible de charger les publications" onRetry={() => void refetchThreads()} /> : (threads ?? []).length === 0 ? <div className="rounded-2xl border border-dashed border-edge bg-panel p-10 text-center"><MessageSquare className="mx-auto size-8 text-glow" /><p className="mt-3 font-semibold">Pas encore de publication</p><p className="mt-1 text-sm text-muted-foreground">Sois le premier à partager quelque chose ici.</p></div> : <div className="space-y-3">{(threads ?? []).map((thread) => <article key={thread.id} className="rounded-2xl border border-edge/60 bg-panel p-4 sm:p-5"><div className="text-xs text-muted-foreground">Membre · {new Date(thread.created_at).toLocaleString("fr-FR")}</div><Link to="/community/thread/$id" params={{ id: thread.id }} className="mt-2 block text-lg font-bold hover:text-glow">{thread.title}</Link>{thread.body?.trim() && <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">{thread.body}</p>}{thread.media_path && thread.media_type && <CommunityMedia path={thread.media_path} type={thread.media_type} title={thread.title} />}<Link to="/community/thread/$id" params={{ id: thread.id }} className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-full px-3 text-xs font-semibold text-muted-foreground hover:bg-frost"><MessageSquare className="size-4" /> Ouvrir la discussion</Link></article>)}</div>}
    </main>
  );
}

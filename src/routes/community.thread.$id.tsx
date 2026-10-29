import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Send, Heart } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Textarea } from "@/components/ui/textarea";
import { APP_NAME } from "@/lib/config";

export const Route = createFileRoute("/community/thread/$id")({
  head: ({ params }) => ({ meta: [{ title: `Discussion — ${params.id} — ${APP_NAME}` }] }),
  component: ThreadPage,
});

type Thread = { id: string; forum_id: string; user_id: string; title: string; content: string; created_at: string; updated_at: string };
type Reply = { id: string; thread_id: string; user_id: string; content: string; created_at: string };

function ThreadPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [reply, setReply] = useState("");
  const [replyBusy, setReplyBusy] = useState(false);

  const { data: thread, isLoading, error: threadError } = useQuery({
    queryKey: ["community-thread", id],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("community_threads").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as Thread | null;
    },
  });
  const { data: replies, isLoading: repliesLoading, error: repliesError } = useQuery({
    queryKey: ["community-replies", id],
    enabled: !!thread,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("community_replies").select("*").eq("thread_id", id).order("created_at");
      if (error) throw error;
      return (data ?? []) as Reply[];
    },
  });
  const { data: forum } = useQuery({
    queryKey: ["community-forum-by-id", thread?.forum_id],
    enabled: !!thread,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("community_forums").select("name,slug").eq("id", thread!.forum_id).single();
      if (error) throw error;
      return data as { name: string; slug: string };
    },
  });

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !thread || !reply.trim() || replyBusy) return;
    setReplyBusy(true);
    try {
      const { error } = await (supabase as any).from("community_replies").insert({ thread_id: id, user_id: user.id, content: reply.trim() });
      if (error) throw error;
      setReply("");
      await qc.invalidateQueries({ queryKey: ["community-replies", id] });
      toast.success("Réponse publiée !");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Impossible de publier la réponse."); }
    finally { setReplyBusy(false); }
  }

  if (isLoading) return <div className="p-8 text-center">Chargement de la discussion…</div>;
  if (threadError) return <div className="p-8 text-center">Impossible de charger cette discussion. <Link to="/community" className="text-glow underline">Retour à la communauté</Link></div>;
  if (!thread) return <div className="p-8 text-center">Discussion introuvable. <Link to="/community" className="text-glow underline">Retour à la communauté</Link></div>;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {forum?.slug ? <Link to="/community/forum/$slug" params={{ slug: forum.slug }} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> {forum.name}</Link> : <Link to="/community" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Communauté</Link>}
      <article className="rounded-3xl bg-panel p-6 ring-1 ring-edge/50">
        <p className="text-xs font-semibold uppercase tracking-wider text-glow">Discussion</p>
        <h1 className="mt-2 text-3xl font-black">{thread.title}</h1>
        <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{thread.content}</p>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-edge/40 pt-4">
          <p className="text-xs text-faint">Publié le {new Date(thread.created_at).toLocaleString("fr-FR")}</p>
          <ThreadLikeButton threadId={thread.id} userId={user?.id} />
        </div>
      </article>
      <section className="space-y-3">
        <h2 className="text-xl font-bold">Commentaires · {(replies ?? []).length}</h2>
        {repliesLoading && <p className="text-sm text-muted-foreground">Chargement des commentaires…</p>}
        {repliesError && <p className="text-sm text-destructive">Impossible de charger les commentaires.</p>}
        {(replies ?? []).map((r) => <article key={r.id} className="rounded-2xl bg-panel p-5 ring-1 ring-edge/40"><p className="whitespace-pre-wrap text-sm leading-6">{r.content}</p><p className="mt-3 text-xs text-faint">{new Date(r.created_at).toLocaleString("fr-FR")}</p></article>)}
        {user ? <form onSubmit={sendReply} className="rounded-2xl bg-panel p-4 ring-1 ring-edge/40"><Textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Écris un commentaire…" rows={4} maxLength={5000} required /><button disabled={replyBusy} className="mt-3 flex items-center gap-2 rounded-full bg-glow px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"><Send className="size-4" />{replyBusy ? "Publication…" : "Commenter"}</button></form> : <p className="rounded-2xl bg-panel p-4 text-sm text-muted-foreground">Connecte-toi pour commenter cette discussion.</p>}
      </section>
    </div>
  );
}

function ThreadLikeButton({ threadId, userId }: { threadId: string; userId?: string }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const { data } = useQuery({
    queryKey: ["community-thread-likes", threadId, userId ?? "anonymous"],
    queryFn: async () => {
      const { data, count, error } = await (supabase as any).from("community_thread_likes").select("user_id", { count: "exact" }).eq("thread_id", threadId);
      if (error) throw error;
      return { count: count ?? data?.length ?? 0, liked: !!userId && (data ?? []).some((row: { user_id: string }) => row.user_id === userId) };
    },
  });
  async function toggleLike() {
    if (!userId) { toast.error("Connecte-toi pour aimer une discussion."); return; }
    if (busy) return;
    setBusy(true);
    try {
      const query = (supabase as any).from("community_thread_likes");
      const result = data?.liked
        ? await query.delete().eq("thread_id", threadId).eq("user_id", userId)
        : await query.insert({ thread_id: threadId, user_id: userId });
      if (result.error) throw result.error;
      await qc.invalidateQueries({ queryKey: ["community-thread-likes", threadId] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Impossible d'enregistrer le like."); }
    finally { setBusy(false); }
  }
  return <button type="button" onClick={toggleLike} disabled={busy} aria-label={data?.liked ? "Retirer le like" : "Aimer la discussion"} className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm transition disabled:opacity-50 ${data?.liked ? "bg-glow/15 text-glow" : "bg-frost text-muted-foreground hover:text-glow"}`}><Heart className={`size-4 ${data?.liked ? "fill-current" : ""}`} />{data?.count ?? 0} j'aime</button>;
}

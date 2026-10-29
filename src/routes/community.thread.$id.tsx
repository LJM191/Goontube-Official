import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { ArrowLeft, Send, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Textarea } from "@/components/ui/textarea";
import { CommunityMedia } from "@/components/stream/CommunityMedia";
import { APP_NAME } from "@/lib/config";

export const Route = createFileRoute("/community/thread/$id")({
  head: ({ params }) => ({ meta: [{ title: `Discussion — ${params.id} — ${APP_NAME}`] }),
  component: ThreadPage,
});

type Thread = { id: string; forum_id: string; author_id: string; title: string; body: string; media_path: string | null; media_type: "photo" | "gif" | null; created_at: string; updated_at: string };
type Reply = { id: string; thread_id: string; author_id: string; body: string; created_at: string };

function ThreadPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: thread, isLoading } = useQuery({
    queryKey: ["community-thread", id],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("community_threads").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as Thread | null;
    },
  });
  const { data: replies } = useQuery({
    queryKey: ["community-replies", id],
    enabled: !!thread,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("community_replies").select("id,thread_id,author_id,body,created_at").eq("thread_id", id).order("created_at");
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

  async function sendReply(e: FormEvent) {
    e.preventDefault();
    if (!user || !thread || !reply.trim()) return;
    setBusy(true);
    try {
      const { error } = await (supabase as any).from("community_replies").insert({ thread_id: id, author_id: user.id, body: reply.trim() });
      if (error) throw error;
      setReply("");
      await qc.invalidateQueries({ queryKey: ["community-replies", id] });
      toast.success("Réponse publiée.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible d’envoyer la réponse");
    } finally { setBusy(false); }
  }

  if (isLoading) return <div className="mx-auto max-w-3xl p-8 text-center text-muted-foreground">Chargement…</div>;
  if (!thread) return <div className="mx-auto max-w-3xl p-8 text-center">Discussion introuvable.</div>;

  return (
    <main className="mx-auto w-full max-w-3xl px-3 pb-10 pt-4 sm:px-6 sm:pt-7">
      <Link to="/community" className="mb-4 inline-flex min-h-9 items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"><ArrowLeft className="size-4" /> Retour au fil</Link>
      <article className="rounded-2xl border border-edge/60 bg-panel p-4 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><Link to="/community/forum/$slug" params={{ slug: forum?.slug ?? "" }} className="font-semibold text-glow hover:underline">{forum?.name ?? "Communauté"}</Link><span>·</span><span>{new Date(thread.created_at).toLocaleString("fr-FR")}</span></div>
        <h1 className="mt-3 break-words text-2xl font-black tracking-tight sm:text-3xl">{thread.title}</h1>
        {thread.body?.trim() && <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 sm:text-base">{thread.body}</p>}
        {thread.media_path && thread.media_type && <CommunityMedia path={thread.media_path} type={thread.media_type} title={thread.title} />}
        <div className="mt-5 flex items-center gap-2 border-t border-edge/60 pt-4 text-sm text-muted-foreground"><MessageCircle className="size-4" /> {(replies ?? []).length} réponse{(replies ?? []).length === 1 ? "" : "s"}</div>
      </article>
      <section className="mt-5 space-y-3">
        <h2 className="text-lg font-bold">Discussion</h2>
        {(replies ?? []).map((item) => <article key={item.id} className="rounded-2xl border border-edge/60 bg-panel p-4 sm:p-5"><div className="mb-2 text-xs text-muted-foreground">Membre · {new Date(item.created_at).toLocaleString("fr-FR")}</div><p className="whitespace-pre-wrap break-words text-sm leading-6">{item.body}</p></article>)}
        {replies?.length === 0 && <p className="rounded-2xl border border-dashed border-edge p-5 text-sm text-muted-foreground">Pas encore de réponse. À toi de lancer la discussion.</p>}
        {user ? <form onSubmit={sendReply} className="rounded-2xl border border-edge/60 bg-panel p-4 sm:p-5"><label className="mb-2 block text-sm font-semibold" htmlFor="community-reply">Ajouter une réponse</label><Textarea id="community-reply" value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Écris une réponse utile et respectueuse…" rows={4} maxLength={10000} required /><button disabled={busy || !reply.trim()} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-full bg-glow px-4 text-sm font-bold text-primary-foreground disabled:opacity-50"><Send className="size-4" />{busy ? "Envoi…" : "Répondre"}</button></form> : <p className="rounded-2xl border border-edge/60 bg-panel p-4 text-sm text-muted-foreground">Connecte-toi pour répondre à cette discussion.</p>}
      </section>
    </main>
  );
}

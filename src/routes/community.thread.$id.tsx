import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Lock, Pin, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Textarea } from "@/components/ui/textarea";
import { APP_NAME } from "@/lib/config";

export const Route = createFileRoute("/community/thread/$id")({
  head: ({ params }) => ({ meta: [{ title: `Discussion — ${params.id} — ${APP_NAME}` }] }),
  component: ThreadPage,
});

type Thread = { id: string; forum_id: string; author_id: string; title: string; body: string; is_pinned: boolean; is_locked: boolean; view_count: number; created_at: string };
type Reply = { id: string; thread_id: string; author_id: string; body: string; created_at: string };

function ThreadPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [reply, setReply] = useState("");

  const { data: thread, isLoading } = useQuery({
    queryKey: ["community-thread", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("community_threads").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as Thread | null;
    },
  });
  const { data: replies } = useQuery({
    queryKey: ["community-replies", id],
    enabled: !!thread,
    queryFn: async () => {
      const { data, error } = await supabase.from("community_replies").select("*").eq("thread_id", id).order("created_at");
      if (error) throw error;
      return (data ?? []) as Reply[];
    },
  });
  const { data: forum } = useQuery({
    queryKey: ["community-forum-by-id", thread?.forum_id],
    enabled: !!thread,
    queryFn: async () => {
      const { data, error } = await supabase.from("community_forums").select("name,slug").eq("id", thread!.forum_id).single();
      if (error) throw error;
      return data as { name: string; slug: string };
    },
  });

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !thread || thread.is_locked || !reply.trim()) return;
    const { error } = await supabase.from("community_replies").insert({ thread_id: id, author_id: user.id, body: reply.trim() });
    if (error) return toast.error(error.message);
    setReply("");
    qc.invalidateQueries({ queryKey: ["community-replies", id] });
  }

  if (isLoading) return <div className="p-8 text-center">Chargement…</div>;
  if (!thread) return <div className="p-8 text-center">Discussion introuvable.</div>;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Link to="/community/forum/$slug" params={{ slug: forum?.slug ?? "" }} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> {forum?.name ?? "Forum"}</Link>
      <article className="rounded-3xl bg-panel p-6 ring-1 ring-edge/50">
        <div className="flex items-center gap-2 text-xs text-faint">{thread.is_pinned && <><Pin className="size-3 text-glow" /> Épinglée</>}{thread.is_locked && <><Lock className="size-3" /> Verrouillée</>}</div>
        <h1 className="mt-2 text-3xl font-black">{thread.title}</h1>
        <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{thread.body}</p>
        <p className="mt-5 text-xs text-faint">{new Date(thread.created_at).toLocaleString("fr-FR")}</p>
      </article>
      <section className="space-y-3">
        <h2 className="text-xl font-bold">Réponses · {(replies ?? []).length}</h2>
        {(replies ?? []).map((r) => <article key={r.id} className="rounded-2xl bg-panel p-5 ring-1 ring-edge/40"><p className="whitespace-pre-wrap text-sm leading-6">{r.body}</p><p className="mt-3 text-xs text-faint">{new Date(r.created_at).toLocaleString("fr-FR")}</p></article>)}
        {user && !thread.is_locked && <form onSubmit={sendReply} className="rounded-2xl bg-panel p-4 ring-1 ring-edge/40"><Textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Répondre à la discussion…" rows={4} /><button className="mt-3 flex items-center gap-2 rounded-full bg-glow px-4 py-2 text-sm font-semibold text-primary-foreground"><Send className="size-4" /> Répondre</button></form>}
      </section>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { APP_NAME } from "@/lib/config";

export const Route = createFileRoute("/community/forum/$slug")({
  head: ({ params }) => ({ meta: [{ title: `${params.slug} — Communauté — ${APP_NAME}` }] }),
  component: ForumPage,
});

type Forum = { id: string; name: string; slug: string; description: string | null };
type Thread = { id: string; forum_id: string; user_id: string; title: string; content: string; created_at: string; updated_at: string };

function ForumPage() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [showNew, setShowNew] = useState(false);

  const { data: forum, isLoading: forumLoading } = useQuery({
    queryKey: ["community-forum", slug],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("community_forums").select("id,name,slug,description").eq("slug", slug).maybeSingle();
      if (error) throw error;
      return data as Forum | null;
    },
  });

  const { data: threads, isLoading } = useQuery({
    queryKey: ["community-threads", forum?.id],
    enabled: !!forum,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("community_threads").select("*").eq("forum_id", forum!.id).order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Thread[];
    },
  });

  async function createThread(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !forum || !title.trim() || !body.trim()) return;
    try {
      const { data, error } = await (supabase as any).from("community_threads").insert({ forum_id: forum.id, user_id: user.id, title: title.trim(), content: body.trim() }).select("id").single();
      if (error) throw error;
      setTitle(""); setBody(""); setShowNew(false);
      qc.invalidateQueries({ queryKey: ["community-threads", forum.id] });
      toast.success("Discussion publiée !");
      if (data) window.location.href = `/community/thread/${data.id}`;
    } catch (e) { toast.error(e instanceof Error ? e.message : "Impossible de publier"); }
  }

  if (forumLoading) return <div className="p-8 text-center text-muted-foreground">Chargement…</div>;
  if (!forum) return <div className="p-8 text-center">Forum introuvable.</div>;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Link to="/community" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Communauté</Link>
      <header className="rounded-3xl bg-panel p-6 ring-1 ring-edge/50">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-sm font-semibold text-glow">Forum</p><h1 className="mt-1 text-3xl font-black">{forum.name}</h1><p className="mt-2 text-sm text-muted-foreground">{forum.description}</p></div>
          {user && <button onClick={() => setShowNew((v) => !v)} className="flex items-center gap-2 rounded-full bg-glow px-4 py-2 text-sm font-semibold text-primary-foreground"><MessageSquare className="size-4" /> Nouvelle discussion</button>}
        </div>
        {showNew && user && <form onSubmit={createThread} className="mt-5 space-y-3 rounded-2xl bg-frost/60 p-4"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre de la discussion" maxLength={160} required /><Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Écris ton message…" rows={6} maxLength={10000} required /><button className="rounded-full bg-foreground px-5 py-2 text-sm font-semibold text-background">Publier</button></form>}
      </header>
      <section className="space-y-2">
        {isLoading ? <div className="p-8 text-center text-muted-foreground">Chargement…</div> : (threads ?? []).length === 0 ? <div className="rounded-2xl bg-panel p-10 text-center text-muted-foreground">Aucune discussion. Lance la première !</div> :
          (threads ?? []).map((t) => <Link key={t.id} to="/community/thread/$id" params={{ id: t.id }} className="flex gap-4 rounded-2xl bg-panel p-4 ring-1 ring-edge/40 hover:ring-glow/50">
            <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-frost"><MessageSquare className="size-5 text-glow" /></div>
            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">{t.title}</h2></div><p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{t.content}</p><p className="mt-2 text-xs text-faint">{new Date(t.updated_at).toLocaleString("fr-FR")}</p></div>
          </Link>)}
      </section>
    </div>
  );
}

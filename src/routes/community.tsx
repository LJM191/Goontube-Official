import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { MessageSquare, Plus, Search, Users, Pin, Lock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { APP_NAME } from "@/lib/config";

export const Route = createFileRoute("/community")({
  head: () => ({ meta: [{ title: `Communauté — ${APP_NAME}` }] }),
  component: CommunityPage,
});

type Forum = { id: string; owner_id: string; name: string; slug: string; description: string | null; is_public: boolean; created_at: string };

function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);
}

function CommunityPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: forums, isLoading } = useQuery({
    queryKey: ["community-forums"],
    queryFn: async () => {
      const { data, error } = await supabase.from("community_forums").select("*").eq("is_public", true).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Forum[];
    },
  });

  const visible = (forums ?? []).filter((f) => !search.trim() || `${f.name} ${f.description ?? ""}`.toLowerCase().includes(search.toLowerCase()));

  async function createForum(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !name.trim()) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("community_forums").insert({
        owner_id: user.id, name: name.trim(), slug: slugify(name) + "-" + crypto.randomUUID().slice(0, 6),
        description: description.trim() || null, is_public: true,
      });
      if (error) throw error;
      toast.success("Forum créé !");
      setName(""); setDescription(""); setShowCreate(false);
      qc.invalidateQueries({ queryKey: ["community-forums"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Impossible de créer le forum");
    } finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="rounded-3xl bg-panel p-6 ring-1 ring-edge/50 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-glow">Communauté</p>
            <h1 className="mt-1 text-3xl font-black">Discuter avec la communauté</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Créez des forums, lancez des discussions, répondez aux autres membres et retrouvez facilement les sujets populaires.</p>
          </div>
          {user && <button onClick={() => setShowCreate((v) => !v)} className="flex items-center gap-2 rounded-full bg-glow px-4 py-2 text-sm font-semibold text-primary-foreground"><Plus className="size-4" /> Créer un forum</button>}
        </div>
        {showCreate && user && (
          <form onSubmit={createForum} className="mt-6 grid gap-3 rounded-2xl bg-frost/60 p-4 ring-1 ring-edge/40 sm:grid-cols-[1fr_1fr_auto]">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom du forum" maxLength={60} required />
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description courte" maxLength={240} />
            <button disabled={busy} className="rounded-full bg-foreground px-5 py-2 text-sm font-semibold text-background disabled:opacity-50">{busy ? "Création…" : "Créer"}</button>
          </form>
        )}
      </section>

      <div className="flex items-center gap-3 rounded-2xl bg-panel/70 px-4 py-3 ring-1 ring-edge/40">
        <Search className="size-5 text-faint" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un forum…" className="w-full bg-transparent text-sm outline-none" />
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between"><h2 className="text-xl font-bold">Forums publics</h2><span className="text-sm text-faint">{visible.length} forum{visible.length > 1 ? "s" : ""}</span></div>
        {isLoading ? <div className="rounded-2xl bg-panel p-8 text-center text-muted-foreground">Chargement…</div> : visible.length === 0 ? (
          <div className="rounded-2xl bg-panel p-10 text-center ring-1 ring-edge/40"><Users className="mx-auto size-9 text-faint" /><p className="mt-3 font-medium">Aucun forum pour le moment</p><p className="mt-1 text-sm text-faint">Sois le premier à en créer un.</p></div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {visible.map((forum) => <ForumCard key={forum.id} forum={forum} />)}
          </div>
        )}
      </section>
    </div>
  );
}

function ForumCard({ forum }: { forum: Forum }) {
  const { data: stats } = useQuery({
    queryKey: ["community-forum-stats", forum.id],
    queryFn: async () => {
      const { count, error } = await supabase.from("community_threads").select("id", { count: "exact", head: true }).eq("forum_id", forum.id);
      if (error) throw error;
      return count ?? 0;
    },
  });
  return (
    <Link to="/community/forum/$slug" params={{ slug: forum.slug }} className="group rounded-2xl bg-panel p-5 ring-1 ring-edge/40 transition hover:-translate-y-0.5 hover:ring-glow/50">
      <div className="flex items-start gap-4">
        <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-frost text-glow"><MessageSquare className="size-6" /></div>
        <div className="min-w-0 flex-1"><h3 className="font-bold group-hover:text-glow">{forum.name}</h3><p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{forum.description || "Aucune description."}</p><p className="mt-3 text-xs text-faint">{stats} discussion{stats > 1 ? "s" : ""}</p></div>
      </div>
    </Link>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Flame, Clock3, Users, Compass, Hash, ArrowUpRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchFeed } from "@/lib/videos";
import { VideoGrid } from "@/components/stream/VideoCard";
import { EmptyState } from "@/components/stream/EmptyState";
import { QueryErrorState } from "@/components/stream/QueryErrorState";
import { APP_NAME } from "@/lib/config";
import { OrientationMenu } from "@/components/stream/OrientationMenu";
import { ChannelAvatar } from "@/components/stream/ChannelAvatar";

export const Route = createFileRoute("/explore")({
  validateSearch: (_search: Record<string, unknown>) => ({}),
  head: () => ({ meta: [
    { title: `Explorer — ${APP_NAME}` },
    { name: "description", content: "Découvrez les vidéos, créateurs et communautés de Goontube." },
    { property: "og:title", content: `Explorer — ${APP_NAME}` },
    { property: "og:description", content: "Découvrez les vidéos, créateurs et communautés de Goontube." },
  ] }),
  component: Explore,
});

type Channel = { id: string; name: string; handle: string; avatar_path: string | null; subscriber_count: number };
type Forum = { id: string; name: string; slug: string; description: string | null; created_at: string };

function Explore() {
  const [order, setOrder] = useState<"popular" | "recent">("popular");
  const [term, setTerm] = useState("");
  const { data: videos, isLoading, isError, refetch } = useQuery({
    queryKey: ["explore-videos", order],
    queryFn: () => fetchFeed({ order, limit: 48 }),
    staleTime: 45_000,
  });
  const { data: channels = [], isLoading: channelsLoading } = useQuery({
    queryKey: ["explore-channels"],
    queryFn: async () => {
      const { data, error } = await supabase.from("channels").select("id,name,handle,avatar_path:avatar_url,subscriber_count").order("subscriber_count", { ascending: false }).limit(8);
      if (error) throw error;
      return (data ?? []) as Channel[];
    },
    staleTime: 60_000,
  });
  const { data: forums = [], isLoading: forumsLoading } = useQuery({
    queryKey: ["explore-communities"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("community_forums").select("id,name,slug,description,created_at").eq("is_public", true).order("created_at", { ascending: false }).limit(8);
      if (error) throw error;
      return (data ?? []) as Forum[];
    },
    staleTime: 60_000,
  });
  const filteredVideos = useMemo(() => {
    const q = term.trim().toLocaleLowerCase("fr");
    return (videos ?? []).filter((video) => !q || `${video.title} ${video.channel.name}`.toLocaleLowerCase("fr").includes(q));
  }, [videos, term]);

  return (
    <main className="mx-auto w-full max-w-[1500px] space-y-7 pb-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-bold uppercase tracking-[.18em] text-glow">Découvrir Goontube</p><h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Explorer</h1><p className="mt-1 max-w-2xl text-sm text-muted-foreground">Des vidéos, des créateurs et des communautés à découvrir.</p></div>
        <div className="w-full sm:max-w-sm"><label className="flex min-h-11 items-center gap-3 rounded-full border border-edge/60 bg-panel px-4 focus-within:ring-2 focus-within:ring-glow/40"><Search className="size-4 shrink-0 text-muted-foreground" /><input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Rechercher dans Explorer…" aria-label="Rechercher dans Explorer" className="w-full min-w-0 bg-transparent text-sm outline-none" /></label></div>
      </header>

      <div className="max-w-sm rounded-xl border border-edge/60 bg-panel/60 px-2 py-1 lg:hidden"><OrientationMenu /></div>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="text-lg font-bold">Vidéos à découvrir</h2><p className="text-xs text-muted-foreground">Classement basé sur les vues ou les publications récentes.</p></div>
          <div className="flex w-full gap-1 rounded-full border border-edge/60 bg-panel p-1 sm:w-auto">
            <button onClick={() => setOrder("popular")} className={`flex min-h-9 flex-1 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold sm:flex-none ${order === "popular" ? "bg-frost text-foreground" : "text-muted-foreground"}`}><Flame className="size-4"/> Populaires</button>
            <button onClick={() => setOrder("recent")} className={`flex min-h-9 flex-1 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold sm:flex-none ${order === "recent" ? "bg-frost text-foreground" : "text-muted-foreground"}`}><Clock3 className="size-4"/> Récentes</button>
          </div>
        </div>
        {isError ? <QueryErrorState title="Impossible de charger les vidéos" onRetry={() => void refetch()} /> : <VideoGrid videos={filteredVideos} loading={isLoading} empty={<EmptyState title={term ? "Aucun résultat" : "Aucune vidéo pour l'instant"} text={term ? "Essaie un autre mot-clé." : "Les vidéos publiques apparaîtront ici."} />} />}
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3"><div><h2 className="text-lg font-bold">Créateurs à découvrir</h2><p className="text-xs text-muted-foreground">Chaînes les plus suivies sur Goontube.</p></div><span className="text-xs text-muted-foreground">8 maximum</span></div>
        {channelsLoading ? <div className="h-28 animate-pulse rounded-2xl bg-panel"/> : channels.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
          {channels.map((channel) => <Link key={channel.id} to="/c/$handle" params={{ handle: channel.handle }} className="flex min-w-0 items-center gap-3 rounded-2xl border border-edge/60 bg-panel p-3 transition hover:border-glow/40 hover:bg-frost sm:p-4">
            <ChannelAvatar name={channel.name} path={channel.avatar_path} className="size-11 shrink-0 sm:size-12"/>
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{channel.name}</p><p className="truncate text-xs text-muted-foreground">@{channel.handle}</p><p className="mt-1 text-[11px] text-faint">{channel.subscriber_count.toLocaleString("fr-FR")} abonnés</p></div><ArrowUpRight className="size-4 shrink-0 text-muted-foreground"/>
          </Link>)}
        </div> : <p className="rounded-xl border border-dashed border-edge p-4 text-sm text-muted-foreground">Les créateurs apparaîtront ici.</p>}
      </section>

      <section className="space-y-3">
        <div><h2 className="text-lg font-bold">Communautés à rejoindre</h2><p className="text-xs text-muted-foreground">Des espaces pour échanger avec les autres membres.</p></div>
        {forumsLoading ? <div className="h-24 animate-pulse rounded-2xl bg-panel"/> : forums.length ? <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {forums.map((forum) => <Link key={forum.id} to="/community/forum/$slug" params={{ slug: forum.slug }} className="group flex min-w-0 items-start gap-3 rounded-2xl border border-edge/60 bg-panel p-4 transition hover:border-glow/40 hover:bg-frost">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-glow/10 text-glow"><Hash className="size-5"/></span>
            <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{forum.name}</span><span className="mt-1 line-clamp-2 block text-sm text-muted-foreground">{forum.description || "Discussions et publications des membres."}</span><span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-glow">Découvrir <ArrowUpRight className="size-3"/></span></span>
          </Link>)}
        </div> : <div className="rounded-2xl border border-dashed border-edge p-5 text-sm text-muted-foreground"><Users className="mb-2 size-5"/>Aucune communauté publique pour le moment.</div>}
        <Link to="/community" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-edge/60 px-4 text-sm font-semibold hover:bg-frost"><Compass className="size-4"/> Voir toutes les communautés</Link>
      </section>
    </main>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Eye, Heart, MessageSquare, Settings, Upload, Users, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatCount, formatViews, timeAgo } from "@/lib/format";
import { Thumbnail } from "@/components/stream/VideoCard";
import { EmptyState } from "@/components/stream/EmptyState";
import { APP_NAME } from "@/lib/config";

export const Route = createFileRoute("/studio")({
  head: () => ({ meta: [{ title: `Studio — ${APP_NAME}` }, { name: "description", content: "Gérez votre chaîne, vos vidéos et vos statistiques." }] }),
  component: Studio,
});

function Studio() {
  const { user } = useAuth();
  const { data: channel, isLoading } = useQuery({
    queryKey: ["studio-channel", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("channels").select("*").eq("owner_id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const { data: videos = [] } = useQuery({
    queryKey: ["studio-videos", channel?.id],
    enabled: !!channel,
    queryFn: async () => {
      const { data, error } = await supabase.from("videos").select("id,title,thumbnail_path,view_count,like_count,comment_count,visibility,created_at,duration_seconds").eq("channel_id", channel!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  if (!user) return <EmptyState title="Connectez-vous" text="Le Studio est réservé aux créateurs." />;
  if (isLoading) return <div className="p-8 text-muted-foreground">Chargement du Studio…</div>;
  if (!channel) return <EmptyState title="Chaîne introuvable" text="Créez une chaîne pour accéder au Studio." />;

  const totalViews = videos.reduce((n, v) => n + Number(v.view_count || 0), 0);
  const totalLikes = videos.reduce((n, v) => n + Number(v.like_count || 0), 0);
  const totalComments = videos.reduce((n, v) => n + Number(v.comment_count || 0), 0);

  const cards = [
    { label: "Vues", value: formatCount(totalViews), icon: Eye },
    { label: "Abonnés", value: formatCount(channel.subscriber_count), icon: Users },
    { label: "J'aime", value: formatCount(totalLikes), icon: Heart },
    { label: "Commentaires", value: formatCount(totalComments), icon: MessageSquare },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <header className="flex flex-wrap items-center gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-faint">Studio de la chaîne</p>
          <h1 className="text-3xl font-semibold">{channel.name}</h1>
        </div>
        <Link to="/c/$handle" params={{ handle: channel.handle }} className="rounded-full bg-panel px-4 py-2 text-sm ring-1 ring-edge/40 hover:bg-frost">Voir la chaîne</Link>
        <Link to="/upload" className="flex items-center gap-2 rounded-full bg-glow px-4 py-2 text-sm font-medium text-primary-foreground"><Upload className="size-4" /> Créer</Link>
      </header>

      <nav className="flex flex-wrap gap-2 border-b border-edge/60 pb-3">
        <span className="rounded-full bg-frost px-4 py-2 text-sm font-medium">Tableau de bord</span>
        <Link to="/upload" className="rounded-full px-4 py-2 text-sm text-muted-foreground hover:bg-frost">Contenu</Link>
        <Link to="/c/$handle" params={{ handle: channel.handle }} className="rounded-full px-4 py-2 text-sm text-muted-foreground hover:bg-frost"><BarChart3 className="mr-2 inline size-4" />Chaîne</Link>
      </nav>

      <section>
        <h2 className="mb-4 text-xl font-semibold">Vue d'ensemble</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-2xl bg-panel p-5 ring-1 ring-edge/30">
              <Icon className="size-5 text-glow" />
              <p className="mt-5 text-2xl font-semibold">{value}</p>
              <p className="text-sm text-faint">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-panel p-5 ring-1 ring-edge/30">
        <div className="mb-4 flex items-center justify-between">
          <div><h2 className="font-semibold">Contenu récent</h2><p className="text-sm text-faint">Suivez les performances de vos vidéos.</p></div>
          <Settings className="size-5 text-muted-foreground" />
        </div>
        {videos.length === 0 ? <EmptyState title="Aucune vidéo" text="Publiez votre première vidéo pour commencer." /> : (
          <div className="divide-y divide-edge/50">
            {videos.slice(0, 10).map((v) => (
              <div key={v.id} className="flex items-center gap-4 py-3">
                <Link to="/watch/$id" params={{ id: v.id }} className="w-36 shrink-0">
                  <Thumbnail video={{ ...v, is_live: false, channel: { id: channel.id, handle: channel.handle, name: channel.name, avatar_path: channel.avatar_path, verified: channel.verified } } as any} className="rounded-lg" />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link to="/watch/$id" params={{ id: v.id }} className="line-clamp-2 text-sm font-medium hover:underline">{v.title}</Link>
                  <p className="mt-1 text-xs text-faint">{timeAgo(v.created_at)} · {v.visibility === "public" ? "Publique" : v.visibility === "unlisted" ? "Non répertoriée" : "Privée"}</p>
                </div>
                <div className="hidden gap-6 text-right text-sm md:flex">
                  <span><strong>{formatViews(v.view_count)}</strong><br /><small className="text-faint">vues</small></span>
                  <span><strong>{formatCount(v.like_count)}</strong><br /><small className="text-faint">likes</small></span>
                  <span><strong>{formatCount(v.comment_count)}</strong><br /><small className="text-faint">commentaires</small></span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

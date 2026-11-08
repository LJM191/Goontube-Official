import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Bell, CheckCheck, MessageCircle, ThumbsUp, UserPlus, Video, Info } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ChannelAvatar } from "@/components/stream/ChannelAvatar";
import { APP_NAME } from "@/lib/config";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: `Notifications — ${APP_NAME}` }] }),
  component: NotificationsPage,
});

type NotificationRow = {
  id: string;
  user_id: string;
  actor_id: string | null;
  type: string;
  video_id: string | null;
  channel_id: string | null;
  comment_id: string | null;
  read_at: string | null;
  created_at: string;
};
type Actor = { user_id: string; pseudo: string | null; avatar: string | null; profile_photo: string | null };
type Video = { id: string; title: string };
type Channel = { id: string; name: string; handle: string };

function notificationCopy(type: string) {
  const value = type.toLowerCase();
  if (value.includes("comment") || value.includes("reply")) return { label: "a commenté votre vidéo", Icon: MessageCircle };
  if (value.includes("like") || value.includes("reaction")) return { label: "a aimé votre contenu", Icon: ThumbsUp };
  if (value.includes("subscrib") || value.includes("follow")) return { label: "s’est abonné à votre chaîne", Icon: UserPlus };
  if (value.includes("video") || value.includes("upload")) return { label: "a publié une vidéo", Icon: Video };
  return { label: "vous a envoyé une notification", Icon: Info };
}

function NotificationsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["notifications-page", user?.id],
    enabled: !!user,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data: rows, error } = await supabase.from("notifications")
        .select("id,user_id,actor_id,type,video_id,channel_id,comment_id,read_at,created_at")
        .eq("user_id", user!.id).order("created_at", { ascending: false }).limit(60);
      if (error) throw error;
      const notifications = (rows ?? []) as NotificationRow[];
      const actorIds = [...new Set(notifications.map((row) => row.actor_id).filter((id): id is string => !!id))];
      const videoIds = [...new Set(notifications.map((row) => row.video_id).filter((id): id is string => !!id))];
      const channelIds = [...new Set(notifications.map((row) => row.channel_id).filter((id): id is string => !!id))];
      const [actors, videos, channels] = await Promise.all([
        actorIds.length ? supabase.from("profiles").select("user_id,pseudo,avatar,profile_photo").in("user_id", actorIds) : Promise.resolve({ data: [], error: null }),
        videoIds.length ? supabase.from("videos").select("id,title").in("id", videoIds) : Promise.resolve({ data: [], error: null }),
        channelIds.length ? supabase.from("channels").select("id,name,handle").in("id", channelIds) : Promise.resolve({ data: [], error: null }),
      ]);
      if (actors.error) throw actors.error;
      if (videos.error) throw videos.error;
      if (channels.error) throw channels.error;
      return {
        notifications,
        actors: new Map(((actors.data ?? []) as Actor[]).map((item) => [item.user_id, item])),
        videos: new Map(((videos.data ?? []) as Video[]).map((item) => [item.id, item])),
        channels: new Map(((channels.data ?? []) as Channel[]).map((item) => [item.id, item])),
      };
    },
  });

  const rows = (data?.notifications ?? []).filter((item) => filter === "all" || !item.read_at);
  const unread = (data?.notifications ?? []).filter((item) => !item.read_at).length;

  async function markRead(id: string) {
    if (!user) return;
    const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id).eq("user_id", user.id);
    if (error) { toast.error("Impossible de mettre à jour cette notification."); return; }
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["notifications-page", user.id] }),
      qc.invalidateQueries({ queryKey: ["notification-unread-count", user.id] }),
    ]);
  }

  async function markAllRead() {
    if (!user || !unread) return;
    const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).is("read_at", null);
    if (error) { toast.error("Impossible de tout marquer comme lu."); return; }
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["notifications-page", user.id] }),
      qc.invalidateQueries({ queryKey: ["notification-unread-count", user.id] }),
    ]);
    toast.success("Toutes les notifications sont marquées comme lues.");
  }

  if (!user) return <div className="mx-auto max-w-2xl rounded-2xl border border-edge/50 p-6 text-center"><Bell className="mx-auto size-8 text-glow" /><h1 className="mt-3 text-xl font-semibold">Connectez-vous pour voir vos notifications</h1><Link to="/auth" className="mt-4 inline-flex rounded-full bg-glow px-5 py-2.5 text-sm font-semibold text-primary-foreground">Se connecter</Link></div>;

  return (
    <main className="mx-auto w-full max-w-4xl space-y-5 pb-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-bold uppercase tracking-[.16em] text-glow">Votre activité</p><h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Notifications</h1><p className="mt-1 text-sm text-muted-foreground">{unread} non lue{unread === 1 ? "" : "s"}</p></div>
        <button onClick={() => void markAllRead()} disabled={!unread} className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-full border border-edge/60 px-4 text-sm font-semibold transition hover:bg-frost disabled:opacity-40 sm:self-auto"><CheckCheck className="size-4" /> Tout marquer comme lu</button>
      </header>
      <div className="flex gap-2 border-b border-edge/60 pb-2">
        <button onClick={() => setFilter("all")} className={`min-h-10 rounded-full px-4 text-sm font-semibold ${filter === "all" ? "bg-frost text-foreground" : "text-muted-foreground hover:bg-frost/60"}`}>Toutes</button>
        <button onClick={() => setFilter("unread")} className={`min-h-10 rounded-full px-4 text-sm font-semibold ${filter === "unread" ? "bg-frost text-foreground" : "text-muted-foreground hover:bg-frost/60"}`}>Non lues{unread > 0 ? ` · ${unread}` : ""}</button>
      </div>
      {isLoading ? <div className="rounded-2xl border border-edge/50 p-10 text-center text-sm text-muted-foreground">Chargement des notifications…</div>
        : isError ? <div className="rounded-2xl border border-edge/50 p-8 text-center"><p className="font-semibold">Impossible de charger les notifications.</p><button onClick={() => void refetch()} className="mt-3 rounded-full border border-edge px-4 py-2 text-sm">Réessayer</button></div>
        : rows.length === 0 ? <div className="rounded-2xl border border-dashed border-edge p-10 text-center"><Bell className="mx-auto size-8 text-muted-foreground" /><h2 className="mt-3 font-semibold">{filter === "unread" ? "Vous êtes à jour" : "Aucune notification pour le moment"}</h2><p className="mt-1 text-sm text-muted-foreground">Vos prochaines activités apparaîtront ici.</p></div>
        : <section className="overflow-hidden rounded-2xl border border-edge/60 bg-panel/60 divide-y divide-edge/50">
          {rows.map((item) => {
            const actor = item.actor_id ? data?.actors.get(item.actor_id) : null;
            const video = item.video_id ? data?.videos.get(item.video_id) : null;
            const channel = item.channel_id ? data?.channels.get(item.channel_id) : null;
            const copy = notificationCopy(item.type);
            const Icon = copy.Icon;
            const destination = item.video_id ? "video" : channel?.handle ? "channel" : actor?.pseudo ? "profile" : "none";
            const body = <div className={`flex min-w-0 items-center gap-3 p-3 transition sm:gap-4 sm:p-4 ${item.read_at ? "" : "bg-glow/[0.06]"}`}>
              <div className="relative shrink-0"><ChannelAvatar name={actor?.pseudo ?? "Goontube"} path={actor?.profile_photo ?? actor?.avatar} className="size-11 sm:size-12" /><span className="absolute -bottom-1 -right-1 grid size-6 place-items-center rounded-full border-2 border-panel bg-glow text-primary-foreground"><Icon className="size-3" /></span></div>
              <div className="min-w-0 flex-1"><p className="break-words text-sm leading-5"><strong>{actor?.pseudo ? `@${actor.pseudo}` : "Goontube"}</strong> {copy.label}{video?.title ? <> : <span className="font-semibold">{video.title}</span></>}{channel && !video ? <> : <span className="font-semibold">{channel.name}</span></> }</p><p className="mt-1 text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}</p></div>
              {!item.read_at && <span className="size-2.5 shrink-0 rounded-full bg-glow" aria-label="Non lue" />}
            </div>;
            return <div key={item.id} className="relative">
              {destination === "video" ? <Link to="/watch/$id" params={{ id: item.video_id! }} onClick={() => { if (!item.read_at) void markRead(item.id); }} className="block hover:bg-frost/50">{body}</Link>
                : destination === "channel" ? <Link to="/c/$handle" params={{ handle: channel!.handle }} onClick={() => { if (!item.read_at) void markRead(item.id); }} className="block hover:bg-frost/50">{body}</Link>
                : destination === "profile" ? <Link to="/profile/$username" params={{ username: actor!.pseudo! }} onClick={() => { if (!item.read_at) void markRead(item.id); }} className="block hover:bg-frost/50">{body}</Link>
                : <button onClick={() => void markRead(item.id)} className="block w-full text-left hover:bg-frost/50">{body}</button>}
            </div>;
          })}
        </section>}
      <p className="text-center text-xs text-muted-foreground">Les notifications sont actualisées automatiquement toutes les 30 secondes.</p>
    </main>
  );
}

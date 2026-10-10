import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { BarChart3, Eye, Heart, MessageSquare, Settings, Upload, Users, Pencil, Trash2, ImagePlus, Save, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { uploadMedia } from "@/lib/media";
import { formatCount, formatViews, timeAgo } from "@/lib/format";
import { Thumbnail } from "@/components/stream/VideoCard";
import { EmptyState } from "@/components/stream/EmptyState";
import { APP_NAME } from "@/lib/config";

export const Route = createFileRoute("/studio")({
  head: () => ({ meta: [{ title: `Studio — ${APP_NAME}` }, { name: "description", content: "Gérez votre chaîne, vos vidéos, vos commentaires et vos statistiques." }] }),
  component: Studio,
});

type ManagedVideo = {
  id: string;
  title: string;
  description: string | null;
  thumbnail_path: string | null;
  view_count: number | null;
  like_count: number | null;
  comment_count: number | null;
  visibility: "public" | "unlisted" | "private";
  created_at: string;
  duration_seconds: number | null;
};

type ManagedComment = {
  id: string;
  video_id: string;
  user_id: string;
  content: string;
  created_at: string;
  video_title: string;
  author: { pseudo: string | null; avatar: string | null; profile_photo: string | null } | null;
};

function VideoManagerRow({ video, userId, channel }: { video: ManagedVideo; userId: string; channel: any }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(video.title);
  const [description, setDescription] = useState(video.description ?? "");
  const [visibility, setVisibility] = useState<ManagedVideo["visibility"]>(video.visibility);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!title.trim()) { toast.error("Le titre ne peut pas être vide."); return; }
    setBusy(true);
    try {
      const patch: { title: string; description: string; visibility: ManagedVideo["visibility"]; thumbnail_url?: string } = {
        title: title.trim(), description: description.trim(), visibility,
      };
      if (thumbnail) {
        const ext = thumbnail.name.split(".").pop()?.toLowerCase() || "jpg";
        patch.thumbnail_url = await uploadMedia("thumbnails", userId, thumbnail, ext);
      }
      const { error } = await supabase.from("videos").update(patch).eq("id", video.id).eq("channel_id", channel.id);
      if (error) throw error;
      toast.success("Vidéo mise à jour.");
      setEditing(false);
      setThumbnail(null);
      await qc.invalidateQueries();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de modifier cette vidéo.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Supprimer définitivement « ${video.title} » ? Cette action ne peut pas être annulée.`)) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("videos").delete().eq("id", video.id).eq("channel_id", channel.id);
      if (error) throw error;
      toast.success("Vidéo supprimée.");
      await qc.invalidateQueries();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de supprimer cette vidéo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="rounded-xl border border-edge/50 p-3 sm:p-4">
      <div className="flex items-start gap-3 sm:gap-4">
        <Link to="/watch/$id" params={{ id: video.id }} className="w-28 shrink-0 sm:w-40">
          <Thumbnail video={{ ...video, is_live: false, channel: { id: channel.id, handle: channel.handle, name: channel.name, avatar_path: channel.avatar_url, subscriber_count: channel.subscriber_count } } as any} className="rounded-lg" />
        </Link>
        <div className="min-w-0 flex-1">
          <Link to="/watch/$id" params={{ id: video.id }} className="line-clamp-2 text-sm font-semibold hover:underline sm:text-base">{video.title}</Link>
          <p className="mt-1 text-xs text-faint">{timeAgo(video.created_at)} · {video.visibility === "public" ? "Publique" : video.visibility === "unlisted" ? "Non répertoriée" : "Privée"}</p>
          <p className="mt-1 text-xs text-muted-foreground">{formatViews(video.view_count ?? 0)} vues · {formatCount(video.like_count ?? 0)} J’aime · {formatCount(video.comment_count ?? 0)} commentaires</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => setEditing((value) => !value)} className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-panel px-3 py-1.5 text-xs font-medium ring-1 ring-edge/50 hover:bg-frost">
              {editing ? <X className="size-3.5" /> : <Pencil className="size-3.5" />}{editing ? "Fermer" : "Modifier"}
            </button>
            <button type="button" disabled={busy} onClick={() => void remove()} className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-red-400 ring-1 ring-red-500/30 hover:bg-red-500/10 disabled:opacity-50">
              <Trash2 className="size-3.5" /> Supprimer
            </button>
          </div>
        </div>
      </div>
      {editing && (
        <div className="mt-4 space-y-3 border-t border-edge/50 pt-4">
          <label className="block space-y-1 text-sm"><span className="text-muted-foreground">Titre</span><input value={title} maxLength={100} onChange={(e) => setTitle(e.target.value)} className="h-10 w-full rounded-lg border border-edge/60 bg-background px-3 outline-none focus:ring-1 focus:ring-glow" /></label>
          <label className="block space-y-1 text-sm"><span className="text-muted-foreground">Description</span><textarea value={description} maxLength={5000} rows={4} onChange={(e) => setDescription(e.target.value)} className="w-full rounded-lg border border-edge/60 bg-background px-3 py-2 outline-none focus:ring-1 focus:ring-glow" /></label>
          <label className="block space-y-1 text-sm"><span className="text-muted-foreground">Visibilité</span><select value={visibility} onChange={(e) => setVisibility(e.target.value as ManagedVideo["visibility"])} className="h-10 w-full rounded-lg border border-edge/60 bg-background px-3"><option value="public">Publique</option><option value="unlisted">Non répertoriée</option><option value="private">Privée</option></select></label>
          <label className="flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-edge/70 px-3 py-2 text-sm hover:bg-frost"><ImagePlus className="size-4" />{thumbnail ? thumbnail.name : "Choisir une nouvelle miniature"}<input type="file" accept="image/*" className="hidden" onChange={(e) => setThumbnail(e.target.files?.[0] ?? null)} /></label>
          <button type="button" disabled={busy} onClick={() => void save()} className="flex min-h-10 w-full items-center justify-center gap-2 rounded-full bg-glow px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"><Save className="size-4" />{busy ? "Enregistrement…" : "Enregistrer les modifications"}</button>
        </div>
      )}
    </article>
  );
}

function Studio() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [moderatingId, setModeratingId] = useState<string | null>(null);
  const { data: channel, isLoading } = useQuery({
    queryKey: ["studio-channel", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("channels").select("*").eq("user_id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const { data: videos = [], isLoading: videosLoading } = useQuery({
    queryKey: ["studio-videos", channel?.id],
    enabled: !!channel,
    queryFn: async () => {
      const { data, error } = await supabase.from("videos").select("id,title,description,thumbnail_path:thumbnail_url,view_count,like_count,comment_count,visibility,created_at,duration_seconds").eq("channel_id", channel!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ManagedVideo[];
    },
  });
  const { data: comments = [], isLoading: commentsLoading, error: commentsError } = useQuery({
    queryKey: ["studio-comments", channel?.id],
    enabled: !!channel,
    queryFn: async () => {
      const { data: channelVideos, error: videosError } = await supabase.from("videos").select("id,title").eq("channel_id", channel!.id);
      if (videosError) throw videosError;
      if (!channelVideos?.length) return [];
      const videoIds = channelVideos.map((video) => video.id);
      const titleByVideo = new Map(channelVideos.map((video) => [video.id, video.title]));
      const { data: rows, error: commentsQueryError } = await supabase.from("comments")
        .select("id,video_id,user_id,content,created_at")
        .in("video_id", videoIds)
        .order("created_at", { ascending: false })
        .limit(200);
      if (commentsQueryError) throw commentsQueryError;
      const userIds = [...new Set((rows ?? []).map((row) => row.user_id))];
      const { data: profiles, error: profilesError } = userIds.length
        ? await supabase.from("profiles").select("user_id,pseudo,avatar,profile_photo").in("user_id", userIds)
        : { data: [], error: null };
      if (profilesError) throw profilesError;
      const profileByUser = new Map((profiles ?? []).map((profile) => [profile.user_id, profile]));
      return (rows ?? []).map((row) => ({
        ...row,
        video_title: titleByVideo.get(row.video_id) ?? "Vidéo inconnue",
        author: profileByUser.get(row.user_id) ?? null,
      })) as ManagedComment[];
    },
  });

  async function removeComment(comment: ManagedComment) {
    if (!window.confirm("Supprimer ce commentaire de votre chaîne ? Cette action ne peut pas être annulée.")) return;
    setModeratingId(comment.id);
    try {
      const { error } = await supabase.from("comments").delete().eq("id", comment.id);
      if (error) throw error;
      toast.success("Commentaire supprimé.");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["studio-comments", channel?.id] }),
        qc.invalidateQueries({ queryKey: ["studio-videos", channel?.id] }),
        qc.invalidateQueries({ queryKey: ["video", comment.video_id] }),
        qc.invalidateQueries({ queryKey: ["comments", comment.video_id] }),
      ]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de supprimer ce commentaire.");
    } finally {
      setModeratingId(null);
    }
  }

  if (!user) return <EmptyState title="Connectez-vous" text="Le Studio est réservé aux créateurs." />;
  if (isLoading) return <div className="p-8 text-muted-foreground">Chargement du Studio…</div>;
  if (!channel) return <EmptyState title="Chaîne introuvable" text="Créez une chaîne pour accéder au Studio." />;

  const totalViews = videos.reduce((n, v) => n + Number(v.view_count || 0), 0);
  const totalLikes = videos.reduce((n, v) => n + Number(v.like_count || 0), 0);
  const totalComments = videos.reduce((n, v) => n + Number(v.comment_count || 0), 0);
  const cards = [
    { label: "Vues", value: formatCount(totalViews), icon: Eye },
    { label: "Abonnés", value: formatCount(channel.subscriber_count), icon: Users },
    { label: "J’aime", value: formatCount(totalLikes), icon: Heart },
    { label: "Commentaires", value: formatCount(totalComments), icon: MessageSquare },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 sm:space-y-8">
      <header className="flex flex-wrap items-center gap-3 sm:gap-4">
        <div className="min-w-0 flex-1"><p className="text-sm text-faint">Studio de la chaîne</p><h1 className="break-words text-2xl font-semibold sm:text-3xl">{channel.name}</h1><p className="mt-1 text-sm text-muted-foreground">@{channel.handle}</p></div>
        <Link to="/c/$handle" params={{ handle: channel.handle }} className="min-h-10 rounded-full bg-panel px-3 py-2 text-center text-xs ring-1 ring-edge/40 hover:bg-frost sm:px-4 sm:text-sm">Voir la chaîne</Link>
        <Link to="/upload" className="flex min-h-10 items-center gap-2 rounded-full bg-glow px-3 py-2 text-xs font-medium text-primary-foreground sm:px-4 sm:text-sm"><Upload className="size-4" /> Créer</Link>
      </header>

      <nav className="flex flex-wrap gap-2 border-b border-edge/60 pb-3">
        <a href="#overview" className="rounded-full bg-frost px-4 py-2 text-sm font-medium">Tableau de bord</a>
        <a href="#videos" className="rounded-full px-4 py-2 text-sm text-muted-foreground hover:bg-frost">Gérer les vidéos</a>
        <a href="#comments" className="rounded-full px-4 py-2 text-sm text-muted-foreground hover:bg-frost">Modération des commentaires</a>
        <Link to="/c/$handle" params={{ handle: channel.handle }} className="rounded-full px-4 py-2 text-sm text-muted-foreground hover:bg-frost"><BarChart3 className="mr-2 inline size-4" />Chaîne</Link>
      </nav>

      <section id="overview">
        <h2 className="mb-4 text-lg font-semibold sm:text-xl">Vue d’ensemble</h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          {cards.map(({ label, value, icon: Icon }) => <div key={label} className="rounded-2xl bg-panel p-4 ring-1 ring-edge/30 sm:p-5"><Icon className="size-5 text-glow" /><p className="mt-4 text-xl font-semibold sm:mt-5 sm:text-2xl">{value}</p><p className="text-sm text-faint">{label}</p></div>)}
        </div>
      </section>

      <section id="comments" className="scroll-mt-24 rounded-2xl bg-panel/70 p-3 ring-1 ring-edge/30 sm:p-5">
        <div className="mb-4">
          <h2 className="font-semibold">Modération des commentaires</h2>
          <p className="text-sm text-faint">Consultez les commentaires publiés sous vos vidéos et supprimez ceux qui ne respectent pas les règles de votre chaîne.</p>
        </div>
        {commentsError ? <p className="py-6 text-center text-sm text-red-300">Impossible de charger les commentaires. Vérifiez les autorisations Supabase.</p>
          : commentsLoading ? <p className="py-6 text-center text-sm text-muted-foreground">Chargement des commentaires…</p>
          : comments.length === 0 ? <EmptyState title="Aucun commentaire" text="Les commentaires de vos vidéos apparaîtront ici." />
          : <div className="space-y-3">
            {comments.map((comment) => <article key={comment.id} className="rounded-xl border border-edge/50 p-3 sm:p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-faint">Sous « {comment.video_title} » · {timeAgo(comment.created_at)}</p>
                  <p className="mt-1 text-sm font-medium">@{comment.author?.pseudo ?? "utilisateur inconnu"}</p>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm">{comment.content}</p>
                </div>
                <button type="button" disabled={moderatingId === comment.id} onClick={() => void removeComment(comment)} className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-red-400 ring-1 ring-red-500/30 hover:bg-red-500/10 disabled:opacity-50">
                  <Trash2 className="size-3.5" />{moderatingId === comment.id ? "Suppression…" : "Supprimer"}
                </button>
              </div>
            </article>)}
          </div>}
      </section>

      <section id="videos" className="scroll-mt-24 rounded-2xl bg-panel/70 p-3 ring-1 ring-edge/30 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div><h2 className="font-semibold">Gestion des vidéos</h2><p className="text-sm text-faint">Modifiez le titre, la description, la visibilité et la miniature, ou supprimez une vidéo.</p></div>
          <Settings className="size-5 text-muted-foreground" />
        </div>
        {videosLoading ? <p className="py-8 text-center text-sm text-muted-foreground">Chargement des vidéos…</p> : videos.length === 0 ? <EmptyState title="Aucune vidéo" text="Publiez votre première vidéo pour commencer." /> : (
          <div className="space-y-3">{videos.map((video) => <VideoManagerRow key={video.id} video={video} userId={user.id} channel={channel} />)}</div>
        )}
      </section>
    </div>
  );
}

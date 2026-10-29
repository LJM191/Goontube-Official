import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { BarChart3, Settings, Upload, Video, Eye, Users, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { uploadMedia, useMediaUrl } from "@/lib/media";
import { VIDEO_SELECT, type VideoCardData } from "@/lib/videos";
import { formatCount } from "@/lib/format";
import { ChannelAvatar } from "@/components/stream/ChannelAvatar";
import { SubscribeButton } from "@/components/stream/SubscribeButton";
import { VideoGrid } from "@/components/stream/VideoCard";
import { EmptyState } from "@/components/stream/EmptyState";
import { QueryErrorState } from "@/components/stream/QueryErrorState";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { APP_NAME } from "@/lib/config";

export const Route = createFileRoute("/c/$handle")({
  head: ({ params }) => ({
    meta: [
      { title: `@${params.handle} — ${APP_NAME}` },
      { name: "description", content: `Les vidéos de la chaîne @${params.handle} sur ${APP_NAME}.` },
      { property: "og:title", content: `@${params.handle} — ${APP_NAME}` },
      { property: "og:description", content: `Les vidéos de la chaîne @${params.handle} sur ${APP_NAME}.` },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChannelPage,
});

type Channel = {
  id: string; user_id: string; handle: string; name: string; description: string | null; created_at: string;
  avatar_url: string | null; banner_url: string | null; subscriber_count: number;
};

function EditChannel({ channel }: { channel: Channel }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(channel.name);
  const [handle, setHandle] = useState(channel.handle);
  const [description, setDescription] = useState(channel.description ?? "");
  const [avatar, setAvatar] = useState<File | null>(null);
  const [banner, setBanner] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const cleanHandle = handle.trim().replace(/^@/, "").toLowerCase();
      if (!/^[a-z0-9_-]{3,30}$/.test(cleanHandle)) {
        toast.error("L’arobase doit contenir 3 à 30 caractères : lettres, chiffres, tiret ou underscore.");
        return;
      }
      const patch: { name: string; handle: string; description: string; avatar_url?: string; banner_url?: string } = { name: name.trim(), handle: cleanHandle, description: description.trim() };
      if (avatar) patch.avatar_url = await uploadMedia("avatars", user!.id, avatar, avatar.name.split(".").pop() || "jpg");
      if (banner) patch.banner_url = await uploadMedia("banners", user!.id, banner, banner.name.split(".").pop() || "jpg");
      const { error } = await supabase.from("channels").update(patch).eq("id", channel.id);
      if (error) throw error;
      if (patch.avatar_url) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ profile_photo: patch.avatar_url })
          .eq("user_id", user!.id);
        if (profileError) toast.info("La chaîne a été mise à jour, mais la photo du profil n’a pas pu être synchronisée.");
      }
      await qc.invalidateQueries();
      toast.success("Chaîne mise à jour");
      setOpen(false);
      if (cleanHandle !== channel.handle) await navigate({ to: "/c/$handle", params: { handle: cleanHandle }, replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="rounded-full bg-panel/80 px-4 py-1.5 text-sm ring-1 ring-edge/40 hover:bg-frost">
        Personnaliser la chaîne
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Personnaliser la chaîne</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom" maxLength={60} />
          <div className="space-y-1"><label htmlFor="channel-handle" className="text-sm font-medium">Arobase / identifiant</label><div className="flex items-center gap-2"><span className="text-muted-foreground">@</span><Input id="channel-handle" value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="monidentifiant" maxLength={30} autoCapitalize="none" /></div><p className="text-xs text-muted-foreground">3 à 30 caractères : lettres, chiffres, tirets et underscores. L’adresse de la chaîne changera si tu le modifies.</p></div>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" rows={4} maxLength={1000} />
          <label className="block text-sm">Avatar <input type="file" accept="image/*" className="mt-1 block text-xs" onChange={(e) => setAvatar(e.target.files?.[0] ?? null)} /></label>
          <label className="block text-sm">Bannière <input type="file" accept="image/*" className="mt-1 block text-xs" onChange={(e) => setBanner(e.target.files?.[0] ?? null)} /></label>
          <button disabled={busy || !name.trim()} onClick={save} className="w-full rounded-full bg-glow py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">
            {busy ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ChannelPage() {
  const { handle } = Route.useParams();
  const { user } = useAuth();
  const { data: channel, isLoading, isError: channelError, refetch: refetchChannel } = useQuery({
    queryKey: ["channel", handle],
    queryFn: async () => {
      const { data, error } = await supabase.from("channels").select("*").eq("handle", handle).maybeSingle();
      if (error) throw error;
      return data as Channel | null;
    },
  });
  const isOwner = !!user && channel?.user_id === user.id;
  const { data: videos, isLoading: loadingVideos, isError: videosError, refetch: refetchVideos } = useQuery({
    queryKey: ["channel-videos", channel?.id, isOwner],
    enabled: !!channel,
    queryFn: async () => {
      let q = supabase.from("videos").select(VIDEO_SELECT).eq("channel_id", channel!.id);
      if (!isOwner) q = q.eq("visibility", "public");
      const { data, error } = await q.order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as VideoCardData[];
    },
  });
  const banner = useMediaUrl("banners", channel?.banner_url);

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Chargement de la chaîne…</div>;
  if (channelError) return <QueryErrorState title="Impossible de charger cette chaîne" onRetry={() => void refetchChannel()} />;
  if (!channel) return <EmptyState title="Chaîne introuvable" />;

  return (
    <div>
      <div className="relative aspect-[2.4/1] w-full min-w-0 overflow-hidden rounded-2xl bg-brand opacity-90 ring-1 ring-edge/40 sm:aspect-[4/1] lg:aspect-[5/1]">
        {banner && <img src={banner} alt="" className="absolute inset-0 h-full w-full object-cover" />}
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-5">
        <ChannelAvatar name={channel.name} path={channel.avatar_url} className="size-20 text-xl" />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold">{channel.name}</h1>
          <p className="text-sm text-muted-foreground">
            @{channel.handle} · {formatCount(channel.subscriber_count)} abonné{channel.subscriber_count > 1 ? "s" : ""} · {videos?.length ?? 0} vidéo{(videos?.length ?? 0) > 1 ? "s" : ""}
          </p>
          {channel.description && <p className="mt-1 line-clamp-2 max-w-2xl text-sm text-faint">{channel.description}</p>}
        </div>
        {isOwner ? (
          <div className="flex flex-wrap gap-2">
            <Link to="/studio" className="flex items-center gap-2 rounded-full bg-panel/80 px-4 py-1.5 text-sm ring-1 ring-edge/40 hover:bg-frost"><BarChart3 className="size-4" /> Studio</Link>
            <EditChannel channel={channel} />
            <Link to="/upload" className="flex items-center gap-2 rounded-full bg-glow px-4 py-1.5 text-sm font-medium text-primary-foreground"><Upload className="size-4" /> Mettre en ligne</Link>
          </div>
        ) : (
          <SubscribeButton channelId={channel.id} ownerId={channel.user_id} />
        )}
      </div>
      <div className="mt-6 flex flex-wrap gap-2 border-b border-edge/60 pb-2">
        <a href="#videos" className="rounded-full bg-panel px-4 py-2 text-sm font-medium ring-1 ring-edge/30">Vidéos</a>
        <a href="#about" className="rounded-full px-4 py-2 text-sm text-muted-foreground hover:bg-frost">À propos</a>
      </div>
      <div className="my-6 h-px bg-edge/60" />
      <div id="about" className="mb-6 rounded-2xl bg-panel/50 p-5 ring-1 ring-edge/30">
        <h2 className="font-semibold">À propos de cette chaîne</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
          {channel.description || "Aucune description pour le moment."}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl bg-frost/60 p-3"><Users className="size-4" /><p className="mt-2 text-lg font-semibold">{formatCount(channel.subscriber_count)}</p><p className="text-xs text-faint">abonnés</p></div>
          <div className="rounded-xl bg-frost/60 p-3"><Video className="size-4" /><p className="mt-2 text-lg font-semibold">{videos?.length ?? 0}</p><p className="text-xs text-faint">vidéos</p></div>
          <div className="rounded-xl bg-frost/60 p-3"><Eye className="size-4" /><p className="mt-2 text-lg font-semibold">{formatCount((videos ?? []).reduce((n, v) => n + (v.view_count ?? 0), 0))}</p><p className="text-xs text-faint">vues publiques</p></div>
          <div className="rounded-xl bg-frost/60 p-3"><Settings className="size-4" /><p className="mt-2 text-lg font-semibold">{new Date(channel.created_at).toLocaleDateString("fr-FR")}</p><p className="text-xs text-faint">création</p></div>
        </div>
      </div>
      <div id="videos" />
      {videosError ? <QueryErrorState title="Impossible de charger les vidéos de cette chaîne" onRetry={() => void refetchVideos()} /> : <VideoGrid
        videos={videos}
        loading={loadingVideos}
        empty={<EmptyState title="Aucune vidéo" text={isOwner ? "Publiez votre première vidéo." : "Cette chaîne n'a encore rien publié."} />}
      />}
    </div>
  );
}

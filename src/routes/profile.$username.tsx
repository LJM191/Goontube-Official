import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Eye, Users, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useMediaUrl } from "@/lib/media";
import { formatCount } from "@/lib/format";
import { ChannelAvatar, VerifiedDot } from "@/components/stream/ChannelAvatar";
import { EmptyState } from "@/components/stream/EmptyState";
import { APP_NAME } from "@/lib/config";

export const Route = createFileRoute("/profile/$username")({
  head: ({ params }) => ({ meta: [{ title: `@${params.username} — ${APP_NAME}` }] }),
  component: Profile,
});

function Profile() {
  const { username } = Route.useParams();
  const { user } = useAuth();
  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", username],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("username", username).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const { data: channel } = useQuery({
    queryKey: ["profile-channel", profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase.from("channels").select("*").eq("owner_id", profile!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const banner = useMediaUrl("avatars", channel?.banner_path);

  if (isLoading) return <div className="p-8 text-muted-foreground">Chargement du profil…</div>;
  if (!profile) return <EmptyState title="Profil introuvable" />;
  const isMe = user?.id === profile.id;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="relative h-48 overflow-hidden rounded-3xl bg-brand ring-1 ring-edge/40 sm:h-64">
        {banner && <img src={banner} alt="" className="size-full object-cover" />}
      </div>
      <div className="relative -mt-12 px-5 sm:px-8">
        <ChannelAvatar name={profile.display_name} path={profile.avatar_path} className="size-24 border-4 border-background text-2xl" />
      </div>
      <div className="mt-4 rounded-3xl bg-panel p-6 ring-1 ring-edge/30">
        <div className="flex flex-wrap items-start gap-5">
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-semibold">{profile.display_name}{channel?.verified && <VerifiedDot />}</h1>
            <p className="text-sm text-muted-foreground">@{profile.username}</p>
            {profile.bio && <p className="mt-3 max-w-2xl whitespace-pre-wrap text-sm text-faint">{profile.bio}</p>}
          </div>
          {channel && <Link to="/c/$handle" params={{ handle: channel.handle }} className="rounded-full bg-frost px-4 py-2 text-sm font-medium ring-1 ring-edge/30">Voir la chaîne</Link>}
          {isMe && channel && <Link to="/studio" className="rounded-full bg-glow px-4 py-2 text-sm font-medium text-primary-foreground">Ouvrir Studio</Link>}
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl bg-frost/60 p-4"><Users className="size-4" /><p className="mt-2 text-xl font-semibold">{formatCount(channel?.subscriber_count ?? 0)}</p><p className="text-xs text-faint">abonnés</p></div>
          <div className="rounded-2xl bg-frost/60 p-4"><Video className="size-4" /><p className="mt-2 text-xl font-semibold">Chaîne</p><p className="text-xs text-faint">créateur</p></div>
          <div className="rounded-2xl bg-frost/60 p-4"><CalendarDays className="size-4" /><p className="mt-2 text-xl font-semibold">{new Date(profile.created_at).toLocaleDateString("fr-FR")}</p><p className="text-xs text-faint">inscription</p></div>
          <div className="rounded-2xl bg-frost/60 p-4"><Eye className="size-4" /><p className="mt-2 text-xl font-semibold">Public</p><p className="text-xs text-faint">profil</p></div>
        </div>
      </div>
    </div>
  );
}

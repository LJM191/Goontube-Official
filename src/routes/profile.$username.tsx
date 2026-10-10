import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Eye, Users, Video, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useMediaUrl } from "@/lib/media";
import { formatCount } from "@/lib/format";
import { ChannelAvatar } from "@/components/stream/ChannelAvatar";
import { EmptyState } from "@/components/stream/EmptyState";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { APP_NAME } from "@/lib/config";

export const Route = createFileRoute("/profile/$username")({
  head: ({ params }) => ({ meta: [{ title: `@${params.username} — ${APP_NAME}` }] }),
  component: Profile,
});

function EditUsername({ current }: { current: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(current);
  const [busy, setBusy] = useState(false);

  async function save() {
    const username = value.trim();
    if (!/^[A-Za-z0-9_]{3,30}$/.test(username)) {
      toast.error("3 à 30 caractères : lettres, chiffres et _ uniquement.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await (supabase as any).from("profiles").update({ pseudo: username }).eq("user_id", user!.id);
      if (error) {
        if (error.code === "23505") throw new Error("Cet arobase est déjà utilisé.");
        throw error;
      }
      await qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Arobase modifié !");
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Impossible de modifier l'arobase.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <Pencil className="size-3.5" /> Modifier
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Modifier ton arobase</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <p className="mb-1 text-sm font-medium">Arobase</p>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">@</span>
              <Input value={value} onChange={(e) => setValue(e.target.value.replace(/^@+/, ""))} maxLength={30} />
            </div>
            <p className="mt-1 text-xs text-faint">3–30 caractères, lettres, chiffres et _. Il doit être unique.</p>
          </div>
          <button disabled={busy} onClick={() => void save()} className="w-full rounded-full bg-glow py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">
            {busy ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Profile() {
  const { username } = Route.useParams();
  const { user } = useAuth();
  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", username],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("profiles").select("*").eq("pseudo", username).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const { data: channel } = useQuery({
    queryKey: ["profile-channel", profile?.user_id],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("channels").select("*").eq("user_id", profile!.user_id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const banner = useMediaUrl("banners", channel?.banner_url);

  if (isLoading) return <div className="p-8 text-muted-foreground">Chargement du profil…</div>;
  if (!profile) return <EmptyState title="Profil introuvable" />;
  const isMe = user?.id === profile.user_id;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="relative aspect-[2/1] w-full min-w-0 max-h-64 overflow-hidden rounded-3xl bg-brand ring-1 ring-edge/40 sm:aspect-[3/1] lg:aspect-[4/1]">
        {banner && <img src={banner} alt="" className="absolute inset-0 h-full w-full object-cover" />}}
      </div>
      <div className="relative -mt-12 px-5 sm:px-8">
        <ChannelAvatar name={profile.pseudo ?? "Utilisateur"} path={profile.profile_photo ?? profile.avatar} className="size-24 border-4 border-background text-2xl" />
      </div>
      <div className="mt-4 rounded-3xl bg-panel p-6 ring-1 ring-edge/30">
        <div className="flex flex-wrap items-start gap-5">
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-semibold">{profile.pseudo ?? "Utilisateur"}</h1>
            <p className="text-sm text-muted-foreground">@{profile.pseudo}</p>
            {isMe && <EditUsername current={profile.pseudo ?? ""} />}
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

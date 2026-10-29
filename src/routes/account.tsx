import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth, useMe } from "@/hooks/use-auth";
import { ChannelAvatar } from "@/components/stream/ChannelAvatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Download, LogOut, ShieldCheck, UserRound } from "lucide-react";
import { APP_NAME } from "@/lib/config";

export const Route = createFileRoute("/account")({
  head: () => ({ meta: [{ title: `Votre compte — ${APP_NAME}` }] }),
  component: AccountPage,
});

function AccountPage() {
  const { user } = useAuth();
  const { data } = useMe();
  const navigate = useNavigate();
  const name = data?.channel?.name ?? data?.profile?.pseudo ?? (typeof user?.user_metadata?.["full_name"] === "string" ? user.user_metadata["full_name"] : null) ?? user?.email?.split("@")[0] ?? "Mon compte";
  const avatar = data?.channel?.avatar_url ?? data?.profile?.profile_photo ?? data?.profile?.avatar ?? (typeof user?.user_metadata?.["avatar_url"] === "string" ? user.user_metadata["avatar_url"] : null) ?? (typeof user?.user_metadata?.["picture"] === "string" ? user.user_metadata["picture"] : null) ?? null;

  function downloadData() {
    if (!user) return;
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), user: { id: user.id, email: user.email, createdAt: user.created_at, metadata: user.user_metadata }, profile: data?.profile ?? null, channel: data?.channel ?? null }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "goontube-mes-donnees.json";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success("Export préparé.");
  }

  if (!user) return <div className="mx-auto max-w-xl rounded-2xl border border-edge/50 p-6"><h1 className="text-xl font-semibold">Connecte-toi pour gérer ton compte</h1><Link to="/auth" className="mt-4 inline-flex rounded-full bg-glow px-4 py-2 text-sm font-semibold text-primary-foreground">Se connecter</Link></div>;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 pb-8">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Retour à l'accueil</Link>
      <header className="flex items-center gap-4 rounded-2xl border border-edge/50 bg-panel/50 p-4 sm:p-6"><ChannelAvatar name={name} path={avatar} className="size-16 shrink-0" /><div className="min-w-0"><h1 className="truncate text-2xl font-semibold">{name}</h1><p className="truncate text-sm text-muted-foreground">{user.email}</p>{data?.channel?.handle && <p className="truncate text-sm text-muted-foreground">@{data.channel.handle}</p>}</div></header>
      <section className="overflow-hidden rounded-2xl border border-edge/50 bg-panel/50">
        <div className="flex items-center gap-3 border-b border-edge/50 p-4"><UserRound className="size-5 text-glow" /><h2 className="font-semibold">Informations du compte</h2></div>
        <div className="space-y-4 p-4 text-sm"><div><p className="text-muted-foreground">Adresse e-mail</p><p className="mt-1 break-all">{user.email ?? "Non renseignée"}</p></div><div><p className="text-muted-foreground">Compte créé le</p><p className="mt-1">{new Date(user.created_at).toLocaleDateString("fr-FR")}</p></div><div><p className="text-muted-foreground">Nom de chaîne</p><p className="mt-1">{data?.channel?.name ?? "Aucune chaîne trouvée"}</p></div></div>
      </section>
      <section className="rounded-2xl border border-edge/50 bg-panel/50 p-4 sm:p-5"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 size-5 text-glow" /><div><h2 className="font-semibold">Vos données sur {APP_NAME}</h2><p className="mt-1 text-sm text-muted-foreground">Télécharge les informations de compte actuellement accessibles à l'application ou consulte la politique de confidentialité.</p></div></div><div className="mt-4 flex flex-col gap-2 sm:flex-row"><button onClick={downloadData} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-panel px-4 py-2 text-sm font-medium ring-1 ring-edge/50 hover:bg-frost"><Download className="size-4" /> Télécharger mes données</button><Link to="/confidentialite" className="inline-flex min-h-10 items-center justify-center rounded-full px-4 py-2 text-sm font-medium ring-1 ring-edge/50 hover:bg-frost">Confidentialité</Link></div></section>
      <button onClick={async () => { await supabase.auth.signOut(); await navigate({ to: "/auth", replace: true }); }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-red-500/30 px-4 py-2 text-sm text-red-300 hover:bg-red-500/10"><LogOut className="size-4" /> Se déconnecter</button>
    </div>
  );
}

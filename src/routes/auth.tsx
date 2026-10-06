import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/use-auth";
import { APP_NAME } from "@/lib/config";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: `Connexion — ${APP_NAME}` },
      { name: "description", content: `Connectez-vous ou créez votre compte ${APP_NAME}.` },
      { property: "og:title", content: `Connexion — ${APP_NAME}` },
      { property: "og:description", content: `Connectez-vous ou créez votre compte ${APP_NAME}.` },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/", replace: true });
  }, [user, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin, data: { username } },
        });
        if (error) throw error;
        if (!data.session) toast.success("Vérifiez votre boîte mail pour confirmer votre compte.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) toast.error("Connexion Google impossible");
  }

  return (
    <div className="mx-auto mt-6 max-w-sm rounded-2xl bg-panel/70 p-6 ring-1 ring-edge/40 sm:mt-12">
      <div className="mb-6 flex items-center gap-2">
        <span className="size-7 rounded-lg bg-brand shadow-glow" />
        <h1 className="text-xl font-semibold">{mode === "signin" ? "Connexion" : "Créer un compte"}</h1>
      </div>

      <button
        onClick={google}
        className="w-full rounded-full bg-foreground py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
      >
        Continuer avec Google
      </button>
      <div className="my-5 flex items-center gap-3 text-xs text-faint">
        <span className="h-px flex-1 bg-edge" /> ou <span className="h-px flex-1 bg-edge" />
      </div>

      <form onSubmit={submit} className="space-y-4">
        {mode === "signup" && (
          <div className="space-y-1.5">
            <Label htmlFor="username">Nom de chaîne</Label>
            <Input id="username" required value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Mot de passe</Label>
          <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button
          disabled={busy}
          className="w-full rounded-full bg-glow py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-glow/90 disabled:opacity-60"
        >
          {busy ? "…" : mode === "signin" ? "Se connecter" : "Créer mon compte"}
        </button>
      </form>
      <p className="mt-5 text-center text-sm text-muted-foreground">
        {mode === "signin" ? "Pas encore de compte ?" : "Déjà inscrit ?"}{" "}
        <button className="font-medium text-glow" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
          {mode === "signin" ? "Créer un compte" : "Se connecter"}
        </button>
      </p>
    </div>
  );
}

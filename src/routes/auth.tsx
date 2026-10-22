import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { APP_NAME } from "@/lib/config";
import goontubeLogo from "@/assets/goontube-logo.png";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: `Connexion — ${APP_NAME}` },
      { name: "description", content: `Connectez-vous ou créez votre compte ${APP_NAME}.` },
      { property: "og:title", content: `Connexion — ${APP_NAME}` },
      { property: "og:description", content: `Connectez-vous ou créez votre compte ${APP_NAME}.` },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) toast.error("Connexion Google impossible");
  }

  return (
    <div className="mx-auto mt-6 max-w-sm rounded-2xl bg-panel/70 p-6 ring-1 ring-edge/40 sm:mt-12">
      <div className="mb-6 flex flex-col items-start">
        <img src={goontubeLogo} alt={APP_NAME} width={1445} height={236} className="mb-5 h-auto w-40" />
        <h1 className="text-xl font-semibold">{mode === "signin" ? "Connexion" : "Créer un compte"}</h1>
      </div>

      <button
        onClick={google}
        className="flex w-full items-center justify-center gap-3 rounded-full bg-foreground py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
      >
        <svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5 shrink-0">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" />
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.76 7.18l7.73 6C44.42 37.96 46.98 31.8 46.98 24.55Z" />
          <path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.53 2.56 10.78l7.97-6.19Z" />
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.14 1.44-4.89 2.3-8.18 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" />
        </svg>
        <span>Continuer avec Google</span>
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
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Mot de passe</Label>
          <Input id="password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
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

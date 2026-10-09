import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Copy, MessageSquare, Send } from "lucide-react";
import { APP_NAME } from "@/lib/config";

export const Route = createFileRoute("/feedback")({
  head: () => ({ meta: [{ title: `Commentaires — ${APP_NAME}` }, { name: "description", content: "Préparez un retour sur GoonTube." }] }),
  component: FeedbackPage,
});

function FeedbackPage() {
  const [type, setType] = useState("Suggestion");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  async function copyFeedback(e: React.FormEvent) {
    e.preventDefault();
    if (message.trim().length < 8) {
      toast.error("Décris ton retour en au moins 8 caractères.");
      return;
    }
    setBusy(true);
    const content = `Retour GoonTube — ${type}\nContact : ${email.trim() || "non fourni"}\n\n${message.trim()}`;
    try {
      await navigator.clipboard.writeText(content);
      toast.success("Ton retour a été copié.");
    } catch {
      toast.error("Impossible de copier automatiquement. Sélectionne et copie ton message.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 pb-8">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Retour à l'accueil</Link>
      <header className="flex items-start gap-3"><div className="grid size-11 shrink-0 place-items-center rounded-full bg-panel"><MessageSquare className="size-5" /></div><div><h1 className="text-2xl font-semibold sm:text-3xl">Envoyer des commentaires</h1><p className="mt-1 text-sm text-muted-foreground">Aide-nous à améliorer GoonTube.</p></div></header>
      <form onSubmit={copyFeedback} className="space-y-5 rounded-2xl border border-edge/50 bg-panel/50 p-4 sm:p-6">
        <label className="block text-sm font-medium">Type de retour<select value={type} onChange={(e) => setType(e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-edge bg-background px-3 text-foreground"><option>Suggestion</option><option>Problème technique</option><option>Design et affichage mobile</option><option>Autre</option></select></label>
        <label className="block text-sm font-medium">Ton message<textarea required minLength={8} maxLength={4000} value={message} onChange={(e) => setMessage(e.target.value)} rows={6} placeholder="Décris ce qui ne fonctionne pas ou ce que tu aimerais voir…" className="mt-2 w-full resize-y rounded-xl border border-edge bg-background px-3 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-glow" /><span className="mt-1 block text-right text-xs text-muted-foreground">{message.length}/4000</span></label>
        <label className="block text-sm font-medium">E-mail de contact (facultatif)<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="toi@exemple.fr" className="mt-2 h-11 w-full rounded-xl border border-edge bg-background px-3 text-foreground outline-none focus:ring-2 focus:ring-glow" /></label>
        <button type="submit" disabled={busy} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-glow px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60 sm:w-auto"><Copy className="size-4" /> {busy ? "Copie…" : "Préparer et copier le retour"}</button>
      </form>
      <p className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm leading-6 text-muted-foreground">L'envoi automatique n'est pas encore connecté à une boîte de réception. Ce formulaire prépare et copie ton message pour qu'il ne soit pas perdu ; une adresse de contact ou un système de réception devra être configuré pour permettre un véritable envoi depuis le site.</p>
    </div>
  );
}

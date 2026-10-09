import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useMe } from "@/hooks/use-auth";
import { timeAgo } from "@/lib/format";
import { ChannelAvatar } from "./ChannelAvatar";
import { Textarea } from "@/components/ui/textarea";

type Comment = {
  id: string;
  content: string;
  created_at: string;
  parent_id: string | null;
  user_id: string;
  author: { pseudo: string | null; avatar: string | null; profile_photo: string | null } | null;
};

function Composer({ videoId, parentId, onDone }: { videoId: string; parentId?: string; onDone?: () => void }) {
  const { user } = useAuth();
  const { data: me } = useMe();
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const post = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Connectez-vous pour commenter.");
      const { error } = await supabase
        .from("comments")
        .insert({ video_id: videoId, user_id: user.id, content: body.trim(), parent_id: parentId ?? null });
      if (error) throw error;
    },
    onSuccess: () => {
      setBody("");
      qc.invalidateQueries({ queryKey: ["comments", videoId] });
      qc.invalidateQueries({ queryKey: ["video", videoId] });
      onDone?.();
      toast.success("Commentaire publié");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Impossible de publier le commentaire"),
  });
  if (!user)
    return <p className="text-sm text-muted-foreground"><Link to="/auth" className="text-glow">Connectez-vous</Link> pour commenter.</p>;

  const profileName = me?.profile?.pseudo ?? user.user_metadata?.["full_name"] ?? user.email?.split("@")[0] ?? "?";
  const profileAvatar = me?.profile?.profile_photo ?? me?.profile?.avatar ?? null;
  return (
    <div className="flex gap-3">
      <ChannelAvatar name={String(profileName)} path={profileAvatar} className={parentId ? "size-7" : ""} />
      <div className="flex-1">
        <Textarea rows={parentId ? 2 : 3} placeholder={parentId ? "Votre réponse…" : "Ajouter un commentaire…"} value={body} onChange={(e) => setBody(e.target.value)} maxLength={5000} />
        <div className="mt-2 flex justify-end gap-2">
          {onDone && <button onClick={onDone} className="px-3 py-1.5 text-sm text-muted-foreground">Annuler</button>}
          <button disabled={!body.trim() || post.isPending} onClick={() => post.mutate()} className="rounded-full bg-glow px-4 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50">
            {post.isPending ? "Publication…" : parentId ? "Répondre" : "Commenter"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CommentItem({ c, replies, videoId }: { c: Comment; replies: Comment[]; videoId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [replying, setReplying] = useState(false);
  const name = c.author?.pseudo ?? "Utilisateur";
  async function remove() {
    const { error } = await supabase.from("comments").delete().eq("id", c.id).eq("user_id", user?.id ?? "");
    if (error) {
      toast.error("Suppression impossible");
      return;
    }
    toast.success("Commentaire supprimé");
    qc.invalidateQueries({ queryKey: ["comments", videoId] });
    qc.invalidateQueries({ queryKey: ["video", videoId] });
  }
  return (
    <div className="flex gap-3">
      <ChannelAvatar name={name} path={c.author?.profile_photo ?? c.author?.avatar} className={c.parent_id ? "size-7" : ""} />
      <div className="min-w-0 flex-1">
        <p className="text-sm"><span className="font-medium">@{c.author?.pseudo ?? "inconnu"}</span>{" "}<span className="text-xs text-faint">{timeAgo(c.created_at)}</span></p>
        <p className="mt-1 whitespace-pre-wrap break-words text-sm">{c.content}</p>
        <div className="mt-1 flex gap-4 text-xs text-muted-foreground">
          {!c.parent_id && user && <button onClick={() => setReplying((v) => !v)}>Répondre</button>}
          {user?.id === c.user_id && <button onClick={() => void remove()}>Supprimer</button>}
        </div>
        {replying && <div className="mt-3"><Composer videoId={videoId} parentId={c.id} onDone={() => setReplying(false)} /></div>}
        {replies.length > 0 && <div className="mt-4 space-y-4">{replies.map((r) => <CommentItem key={r.id} c={r} replies={[]} videoId={videoId} />)}</div>}
      </div>
    </div>
  );
}

export function Comments({ videoId, count }: { videoId: string; count: number }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["comments", videoId],
    queryFn: async () => {
      const { data: rows, error: commentsError } = await supabase
        .from("comments")
        .select("id,content,created_at,parent_id,user_id")
        .eq("video_id", videoId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (commentsError) throw commentsError;
      const userIds = [...new Set((rows ?? []).map((row) => row.user_id))];
      const { data: profiles, error: profilesError } = userIds.length
        ? await supabase.from("profiles").select("user_id,pseudo,avatar,profile_photo").in("user_id", userIds)
        : { data: [], error: null };
      if (profilesError) throw profilesError;
      const profileMap = new Map((profiles ?? []).map((profile) => [profile.user_id, profile]));
      return (rows ?? []).map((row) => ({ ...row, author: profileMap.get(row.user_id) ?? null })) as Comment[];
    },
  });
  const top = data?.filter((c) => !c.parent_id) ?? [];
  const repliesOf = (id: string) => (data ?? []).filter((c) => c.parent_id === id).reverse();
  return (
    <section className="mt-8">
      <h2 className="mb-4 text-lg font-semibold">{count} commentaire{count > 1 ? "s" : ""}</h2>
      <Composer videoId={videoId} />
      {error && <p className="mt-4 text-sm text-red-300">Impossible de charger les commentaires.</p>}
      {isLoading && <p className="mt-4 text-sm text-muted-foreground">Chargement des commentaires…</p>}
      <div className="mt-6 space-y-6">{top.map((c) => <CommentItem key={c.id} c={c} replies={repliesOf(c.id)} videoId={videoId} />)}</div>
    </section>
  );
}

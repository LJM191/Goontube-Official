import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export function SubscribeButton({ channelId, ownerId }: { channelId: string; ownerId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const key = ["sub", user?.id, channelId];
  const { data: subscribed } = useQuery({
    queryKey: key,
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("channel_id")
        .eq("subscriber_id", user!.id)
        .eq("channel_id", channelId)
        .maybeSingle();
      return !!data;
    },
  });
  const toggle = useMutation({
    mutationFn: async () => {
      if (subscribed) {
        await supabase.from("subscriptions").delete().eq("subscriber_id", user!.id).eq("channel_id", channelId);
      } else {
        await supabase.from("subscriptions").insert({ subscriber_id: user!.id, channel_id: channelId });
      }
    },
    onMutate: () => qc.setQueryData(key, !subscribed),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: ["channel"] });
      qc.invalidateQueries({ queryKey: ["video"] });
    },
  });

  if (user?.id === ownerId) return null;
  return (
    <button
      onClick={() => (user ? toggle.mutate() : navigate({ to: "/auth" }))}
      className={
        subscribed
          ? "rounded-full bg-panel/80 px-4 py-1.5 text-sm ring-1 ring-edge/40 transition-colors hover:bg-frost"
          : "rounded-full bg-foreground px-4 py-1.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
      }
    >
      {subscribed ? "Abonné" : "S'abonner"}
    </button>
  );
}

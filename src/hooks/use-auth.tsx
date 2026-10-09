import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type AuthState = { user: User | null; session: Session | null; loading: boolean };
const AuthContext = createContext<AuthState>({ user: null, session: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, session: null, loading: true });
  const qc = useQueryClient();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      setState({ user: session?.user ?? null, session, loading: false });
      if (event === "SIGNED_IN" || event === "USER_UPDATED") void qc.invalidateQueries();
      if (event === "SIGNED_OUT") qc.clear();
    });
    void supabase.auth.getSession().then(({ data }) => {
      setState({ user: data.session?.user ?? null, session: data.session, loading: false });
    });
    return () => sub.subscription.unsubscribe();
  }, [qc]);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

/** Current user's profile + channel. */
export function useMe() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["me", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const [{ data: profile, error: profileError }, { data: channel, error: channelError }] = await Promise.all([
        supabase
          .from("profiles")
          .select("user_id,pseudo,avatar,profile_photo,bio,created_at")
          .eq("user_id", user!.id)
          .maybeSingle(),
        supabase
          .from("channels")
          .select("id,user_id,handle,name,avatar_url,banner_url,subscriber_count,created_at,description")
          .eq("user_id", user!.id)
          .maybeSingle(),
      ]);
      if (profileError) throw profileError;
      if (channelError) throw channelError;
      return { profile, channel };
    },
  });
}

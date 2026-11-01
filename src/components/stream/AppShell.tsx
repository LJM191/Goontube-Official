import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Clock,
  Compass,
  ChevronDown,
  Home,
  Library,
  LogOut,
  Monitor,
  MessageSquare,
  Search,
  ShieldCheck,
  Settings,
  Tv,
  User as UserIcon,
  UserRound,
  X,
} from "lucide-react";
import goontubeLogo from "@/assets/goontube-logo.png";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/config";
import { useMediaUrl } from "@/lib/media";
import { useAuth, useMe } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { ChannelAvatar } from "./ChannelAvatar";
import { SiteFooter } from "./SiteFooter";
import { OrientationMenu } from "./OrientationMenu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV = [
  { to: "/", label: "Accueil", icon: Home },
  { to: "/explore", label: "Explorer", icon: Compass },
  { to: "/subscriptions", label: "Abonnements", icon: Tv },
  { to: "/library", label: "Bibliothèque", icon: Library },
  { to: "/history", label: "Historique", icon: Clock },
] as const;

export function Logo() {
  return (
    <Link to="/" aria-label={`${APP_NAME} — Accueil`} className="flex shrink-0 items-center">
      <img src={goontubeLogo} alt={APP_NAME} width={1445} height={236} className="h-auto w-32 sm:w-48 lg:w-52" />
    </Link>
  );
}

function escapePostgrestFilterValue(value: string) {
  // Quote user input so PostgREST filter punctuation cannot alter the .or() expression.
  return '"' + value.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
}

type SearchVideoSuggestionData = {
  id: string;
  title: string;
  thumbnail_path: string | null;
  view_count: number;
  channel: { name: string } | null;
};

function SearchVideoSuggestion({ video, onSelect }: { video: SearchVideoSuggestionData; onSelect: () => void }) {
  const thumbnail = useMediaUrl("thumbnails", video.thumbnail_path);
  return (
    <Link key={video.id} to="/watch/$id" params={{ id: video.id }} onClick={onSelect}
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-frost">
      <div className="size-16 shrink-0 overflow-hidden rounded-lg bg-frost text-faint">
        {thumbnail ? <img src={thumbnail} alt="" className="size-full object-cover" /> : <div className="grid size-full place-items-center"><Search className="size-5" /></div>}
      </div>
      <div className="min-w-0"><p className="line-clamp-2 text-sm font-medium">{video.title}</p><p className="text-xs text-faint">{video.channel?.name ?? "Chaîne"} · {video.view_count} vues</p></div>
    </Link>
  );
}

function SearchBar() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored: unknown = JSON.parse(localStorage.getItem("goontube-recent-searches") ?? "[]");
      setRecent(Array.isArray(stored) ? stored.filter((item): item is string => typeof item === "string").slice(0, 6) : []);
    } catch {}
  }, []);

  const term = q.trim();
  const [debouncedTerm, setDebouncedTerm] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedTerm(term), 250);
    return () => window.clearTimeout(timer);
  }, [term]);

  const { data: suggestions, isFetching } = useQuery({
    queryKey: ["search-suggestions", debouncedTerm],
    enabled: debouncedTerm.length >= 2,
    staleTime: 15_000,
    queryFn: async () => {
      const [videos, channels] = await Promise.all([
        supabase
          .from("videos")
          .select("id,title,thumbnail_path:thumbnail_url,view_count,channel:channels!inner(handle,name,avatar_path:avatar_url)")
          .eq("visibility", "public")
          .or("title.ilike." + escapePostgrestFilterValue("%" + debouncedTerm + "%") + ",description.ilike." + escapePostgrestFilterValue("%" + debouncedTerm + "%"))
          .order("view_count", { ascending: false })
          .limit(5),
        supabase
          .from("channels")
          .select("id,handle,name,avatar_path:avatar_url,subscriber_count")
          .or("name.ilike." + escapePostgrestFilterValue("%" + debouncedTerm + "%") + ",handle.ilike." + escapePostgrestFilterValue("%" + debouncedTerm + "%"))
          .order("subscriber_count", { ascending: false })
          .limit(4),
      ]);
      if (videos.error) throw videos.error;
      if (channels.error) throw channels.error;
      return { videos: videos.data ?? [], channels: channels.data ?? [] };
    },
  });

  const saveSearch = (value: string) => {
    const clean = value.trim();
    if (!clean) return;
    const next = [clean, ...recent.filter((x) => x.toLowerCase() !== clean.toLowerCase())].slice(0, 6);
    setRecent(next);
    try { localStorage.setItem("goontube-recent-searches", JSON.stringify(next)); } catch { /* Search still works without browser storage. */ }
  };

  const submit = (value = q) => {
    const clean = value.trim();
    if (!clean) return;
    saveSearch(clean);
    setOpen(false);
    navigate({ to: "/search", search: { q: clean } });
  };

  return (
    <div className="relative w-full max-w-none">
      <form onSubmit={(e) => { e.preventDefault(); submit(); }}
        className="flex h-12 items-center gap-3 rounded-full bg-panel/90 px-5 ring-1 ring-edge/50 shadow-sm focus-within:ring-glow/60"
      >
        <Search className="size-5 shrink-0 text-faint" />
        <input
          value={q}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          placeholder="Rechercher une vidéo ou une chaîne"
          aria-label="Rechercher"
          className="w-full bg-transparent text-base outline-none placeholder:text-faint"
        />
        {q && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { setQ(""); setOpen(false); }}
            aria-label="Effacer la recherche"
            className="grid size-7 shrink-0 place-items-center rounded-full text-faint hover:bg-frost hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </form>

      {open && (term.length >= 2 || recent.length > 0) && (
        <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-50 overflow-hidden rounded-2xl bg-panel/98 p-2 shadow-2xl ring-1 ring-edge/60 backdrop-blur-xl">
          {term.length < 2 && recent.length > 0 && (
            <div>
              <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-faint">Recherches récentes</p>
              {recent.map((item) => (
                <div key={item} className="flex items-center rounded-xl hover:bg-frost">
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => submit(item)}
                    className="flex min-w-0 flex-1 items-center gap-3 px-3 py-3 text-left"
                  >
                    <Clock className="size-4 shrink-0 text-faint" /><span className="truncate">{item}</span>
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      const next = recent.filter((search) => search !== item);
                      setRecent(next);
                      try { localStorage.setItem("goontube-recent-searches", JSON.stringify(next)); } catch { /* Recent searches are optional. */ }
                    }}
                    aria-label={`Supprimer la recherche « ${item} »`}
                    className="mr-2 grid size-7 shrink-0 place-items-center rounded-full text-faint hover:bg-panel hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {term.length >= 2 && isFetching && <p className="px-3 py-4 text-sm text-muted-foreground">Recherche…</p>}
          {term.length >= 2 && !isFetching && suggestions && (
            <div>
              {suggestions.channels.length > 0 && (
                <div className="border-b border-edge/40 pb-2">
                  <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-faint">Chaînes</p>
                  {suggestions.channels.map((channel) => (
                    <Link key={channel.id} to="/c/$handle" params={{ handle: channel.handle }} onClick={() => setOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-frost">
                      <ChannelAvatar name={channel.name} path={channel.avatar_path} className="size-9" />
                      <div className="min-w-0"><p className="truncate text-sm font-medium">{channel.name}</p><p className="text-xs text-faint">@{channel.handle} · {channel.subscriber_count} abonnés</p></div>
                    </Link>
                  ))}
                </div>
              )}
              {suggestions.videos.length > 0 && (
                <div className="pt-1">
                  <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-faint">Vidéos</p>
                  {suggestions.videos.map((video) => (
                    <SearchVideoSuggestion key={video.id} video={video} onSelect={() => setOpen(false)} />
                  ))}
                </div>
              )}
              <button onClick={() => submit()} className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-3 text-sm font-medium text-glow hover:bg-frost">
                <Search className="size-4" /> Voir tous les résultats pour « {term} »
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function UserMenu() {
  const { user, loading } = useAuth();
  const { data } = useMe();
  const navigate = useNavigate();
  if (loading) return <div className="size-9 rounded-full bg-panel" />;
  if (!user)
    return (
      <Link
        to="/auth"
        className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-edge/60 px-3 py-2 text-xs font-medium transition-colors hover:border-glow/50 hover:bg-panel sm:px-5 sm:text-sm"
      >
        <UserIcon className="size-4" /> Se connecter
      </Link>
    );
  const name =
    data?.channel?.name ??
    data?.profile?.pseudo ??
    (typeof user.user_metadata?.["full_name"] === "string" ? user.user_metadata["full_name"] : null) ??
    (typeof user.user_metadata?.["name"] === "string" ? user.user_metadata["name"] : null) ??
    user.email?.split("@")[0] ??
    "Mon compte";
  // Prefer the avatar selected on GoonTube; Google is only the initial fallback.
  const avatarPath =
    data?.channel?.avatar_url ??
    data?.profile?.profile_photo ??
    data?.profile?.avatar ??
    (typeof user.user_metadata?.["avatar_url"] === "string" ? user.user_metadata["avatar_url"] : null) ??
    (typeof user.user_metadata?.["picture"] === "string" ? user.user_metadata["picture"] : null) ??
    null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full ring-1 ring-edge/40 outline-none focus-visible:ring-glow">
        <ChannelAvatar name={name} path={avatarPath} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} collisionPadding={8} className="w-[min(22rem,calc(100vw-1rem))] max-h-[calc(100dvh-1rem)] overflow-y-auto rounded-2xl border border-edge/70 bg-panel p-0 shadow-2xl">
        <div className="flex items-start gap-3 p-4">
          <ChannelAvatar name={name} path={avatarPath} className="size-12 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-foreground">{name}</p>
            <p className="truncate text-sm text-muted-foreground">{user.email ?? "Compte connecté"}</p>
            {data?.channel?.handle && <p className="mt-0.5 truncate text-xs text-faint">@{data.channel.handle}</p>}
            {data?.channel && (
              <button type="button" onClick={() => navigate({ to: "/c/$handle", params: { handle: data.channel?.handle ?? "" } })} className="mt-2 text-sm font-medium text-sky-400 hover:underline">
                Afficher votre chaîne
              </button>
            )}
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="px-4 pt-2 text-xs font-normal text-muted-foreground">Compte</DropdownMenuLabel>
        <DropdownMenuItem className="gap-3 px-4 py-2.5" onClick={() => navigate({ to: "/account" })}>
          <UserRound className="size-4" /> Compte GoonTube
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-3 px-4 py-2.5" onClick={async () => {
          await supabase.auth.signOut();
          await navigate({ to: "/auth", replace: true });
        }}>
          <UserIcon className="size-4" /> Changer de compte
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-3 px-4 py-2.5 text-red-400 focus:text-red-400" onClick={async () => {
          await supabase.auth.signOut();
          await navigate({ to: "/", replace: true });
        }}>
          <LogOut className="size-4" /> Se déconnecter
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="gap-3 px-4 py-2.5" onClick={() => navigate({ to: "/studio" })}>
          <Monitor className="size-4" /> GoonTube Studio
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-3 px-4 py-2.5" onClick={() => navigate({ to: "/confidentialite" })}>
          <ShieldCheck className="size-4" /> Vos données sur GoonTube
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="gap-3 px-4 py-2.5" onClick={() => navigate({ to: "/settings" })}>
          <Settings className="size-4" /> Paramètres
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-3 px-4 py-2.5" onClick={() => navigate({ to: "/feedback" })}>
          <MessageSquare className="size-4" /> Envoyer des commentaires
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useAuth();
  const activeClass = (to: string) =>
    to === "/" ? pathname === "/" : pathname.startsWith(to);

  const navClass = (active: boolean) =>
    "relative flex min-w-[145px] items-center justify-center gap-2 px-5 text-base font-extrabold tracking-tight transition-colors " +
    (active ? "text-foreground" : "text-muted-foreground hover:text-foreground");

  const underlineClass = (active: boolean) =>
    "absolute inset-x-2 bottom-0 h-0.5 origin-center transition-all " +
    (active ? "scale-x-100 bg-glow" : "scale-x-0 bg-glow group-hover:scale-x-100");

  return (
    <div className="min-h-screen bg-background">
      <header className="glass-bar sticky top-0 z-30 border-b border-edge/60">
        <div className="relative flex min-h-16 items-center gap-2 px-3 sm:min-h-24 sm:gap-8 sm:px-8 lg:px-10">
          <div className="flex shrink-0 items-center lg:w-64"><Logo /></div>
          <div className="absolute left-1/2 top-1/2 hidden w-[min(44vw,48rem)] -translate-x-1/2 -translate-y-1/2 lg:block">
            <SearchBar />
          </div>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <UserMenu />
          </div>
        </div>

        <div className="px-3 pb-3 lg:hidden">
          <SearchBar />
        </div>

        <nav aria-label="Navigation principale" className="relative hidden h-16 items-stretch justify-center gap-1 border-t border-edge/40 px-2 lg:flex lg:gap-3 lg:px-8">
          <div className="absolute left-2 top-0 flex h-full w-60 items-center pr-2 lg:left-8"><OrientationMenu /></div>
          <div className="absolute left-1/2 top-0 flex h-full w-max -translate-x-1/2 items-stretch justify-center gap-1 lg:gap-2">
            <Link to="/" className={navClass(activeClass("/")).replace("min-w-[145px]", "min-w-[130px]")}>ACCUEIL<span className={underlineClass(activeClass("/"))} /></Link>
            <Link to="/explore" search={{}} className={navClass(activeClass("/explore")).replace("min-w-[145px]", "min-w-[130px]")}>EXPLORER<span className={underlineClass(activeClass("/explore"))} /></Link>
            <Link to="/subscriptions" className={navClass(activeClass("/subscriptions")).replace("min-w-[145px]", "min-w-[130px]")}>ABONNEMENTS<span className={underlineClass(activeClass("/subscriptions"))} /></Link>
            <Link to="/community" className={navClass(activeClass("/community")).replace("min-w-[145px]", "min-w-[130px]")}>COMMUNAUTÉ<span className={underlineClass(activeClass("/community"))} /></Link>
          </div>
        </nav>
      </header>

      <div className="flex">
        <main className="mx-auto min-h-[calc(100vh-12rem)] w-full max-w-[1760px] min-w-0 bg-background px-4 pb-24 pt-5 sm:px-8 sm:pt-8 lg:px-10 lg:pb-12 lg:pt-10">{children}</main>
      </div>

      <nav aria-label="Navigation mobile" className="glass-bar fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 gap-0 border-t border-edge/60 px-1 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] lg:hidden">
        {[
          { to: "/", label: "Accueil", icon: Home },
          { to: "/explore", label: "Explorer", icon: Compass },
          { to: "/subscriptions", label: "Abonnements", icon: Tv },
          { to: "/community", label: "Communauté", icon: MessageSquare },
        ].map(({ to, label, icon: Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          return (
            <Link key={to} to={to} aria-current={active ? "page" : undefined}
              className={`flex min-w-0 min-h-12 flex-col items-center justify-center gap-1 rounded-lg px-0.5 py-1 text-[10px] leading-tight font-medium transition-colors active:bg-frost sm:text-[11px] ${active ? "text-glow" : "text-muted-foreground"}`}>
              <Icon className="size-5 shrink-0" />
              <span className="max-w-full truncate">{label}</span>
            </Link>
          );
        })}
      </nav>
      <SiteFooter />
    </div>
  );
}

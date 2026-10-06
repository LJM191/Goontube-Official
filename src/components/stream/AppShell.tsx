import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  Clock,
  Compass,
  Home,
  Library,
  LogOut,
  Plus,
  Search,
  Tv,
  User as UserIcon,
  Zap,
} from "lucide-react";
import { APP_NAME } from "@/lib/config";
import { useAuth, useMe } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { ChannelAvatar } from "./ChannelAvatar";
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
  { to: "/shorts", label: "Shorts", icon: Zap },
  { to: "/library", label: "Bibliothèque", icon: Library },
  { to: "/history", label: "Historique", icon: Clock },
] as const;

export function Logo() {
  return (
    <Link to="/" className="flex shrink-0 items-center gap-2">
      <span className="size-7 rounded-lg bg-brand shadow-glow" />
      <span className="font-display text-lg font-semibold tracking-tight">{APP_NAME}</span>
    </Link>
  );
}

function SearchBar() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (q.trim()) navigate({ to: "/search", search: { q: q.trim() } });
      }}
      className="flex max-w-xl flex-1 items-center gap-2 rounded-full bg-panel/80 px-4 py-2 ring-1 ring-edge/40 focus-within:ring-glow/50"
    >
      <Search className="size-4 shrink-0 text-faint" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Rechercher une chaîne, une vidéo…"
        aria-label="Rechercher"
        className="w-full bg-transparent text-sm outline-none placeholder:text-faint"
      />
    </form>
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
        className="inline-flex items-center gap-1.5 rounded-full bg-glow px-4 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-glow/90"
      >
        <UserIcon className="size-4" /> Se connecter
      </Link>
    );
  const name = data?.channel?.name ?? data?.profile?.display_name ?? "Moi";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full ring-1 ring-edge/40 outline-none focus-visible:ring-glow">
        <ChannelAvatar name={name} path={data?.channel?.avatar_path} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate">{name}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {data?.channel && (
          <DropdownMenuItem onClick={() => navigate({ to: "/c/$handle", params: { handle: data.channel!.handle } })}>
            <Tv className="size-4" /> Ma chaîne
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => navigate({ to: "/upload" })}>
          <Plus className="size-4" /> Mettre en ligne
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={async () => {
            await supabase.auth.signOut();
            navigate({ to: "/", replace: true });
          }}
        >
          <LogOut className="size-4" /> Se déconnecter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useAuth();
  return (
    <div className="min-h-screen">
      <header className="glass-bar sticky top-0 z-30 h-16 border-b border-edge/60">
        <div className="flex h-full items-center gap-4 px-4 sm:px-6">
          <div className="flex shrink-0 items-center lg:w-52">
            <Logo />
          </div>
          <SearchBar />
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            {user && (
              <>
                <Link
                  to="/upload"
                  className="hidden items-center gap-1.5 rounded-full bg-panel/80 px-3.5 py-1.5 text-sm ring-1 ring-edge/40 transition-colors hover:bg-frost sm:inline-flex"
                >
                  <Plus className="size-4" /> Créer
                </Link>
                <button
                  aria-label="Notifications"
                  className="relative grid size-9 place-items-center rounded-full bg-panel/80 ring-1 ring-edge/40 transition-colors hover:bg-frost"
                >
                  <Bell className="size-4 text-muted-foreground" />
                </button>
              </>
            )}
            <UserMenu />
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="glass-side sticky top-16 hidden h-[calc(100vh-4rem)] w-60 shrink-0 flex-col gap-1 border-r border-edge/60 p-3 lg:flex">
          <nav className="flex flex-col gap-1">
            {NAV.map(({ to, label, icon: Icon }) => {
              const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
              return (
                <Link
                  key={to}
                  to={to}
                  className={
                    active
                      ? "flex items-center gap-3 rounded-xl bg-glow/10 px-3 py-2.5 text-sm font-medium ring-1 ring-glow/20"
                      : "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-panel/70"
                  }
                >
                  <Icon className={active ? "size-4 text-glow" : "size-4"} />
                  {label}
                </Link>
              );
            })}
          </nav>
          {!user && (
            <div className="mt-auto rounded-2xl bg-panel/70 p-4 ring-1 ring-edge/40">
              <p className="text-sm font-medium">Rejoignez {APP_NAME}</p>
              <p className="mt-1 text-xs text-faint">Abonnez-vous, aimez et publiez vos vidéos.</p>
              <Link to="/auth" className="mt-3 inline-block text-sm font-medium text-glow">
                Se connecter →
              </Link>
            </div>
          )}
        </aside>

        <main className="min-w-0 flex-1 px-4 pb-24 pt-6 sm:px-6 lg:pb-10">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="glass-bar fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-edge/60 py-2 lg:hidden">
        {[NAV[0], NAV[1], { to: "/upload", label: "Créer", icon: Plus } as const, NAV[2], NAV[4]].map(
          ({ to, label, icon: Icon }) => {
            const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={`flex flex-col items-center gap-0.5 px-2 text-[11px] ${active ? "text-glow" : "text-muted-foreground"}`}
              >
                <Icon className="size-5" />
                {label}
              </Link>
            );
          },
        )}
      </nav>
    </div>
  );
}

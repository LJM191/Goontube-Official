import { Link } from "@tanstack/react-router";
import { APP_NAME } from "@/lib/config";

const LEGAL_LINKS = [
  { to: "/mentions-legales", label: "Mentions légales" },
  { to: "/confidentialite", label: "Confidentialité" },
  { to: "/cgu", label: "CGU" },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-edge/50 bg-panel/40">
      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-5 px-5 py-8 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-10">
        <p className="text-sm text-faint">
          © {new Date().getFullYear()} {APP_NAME}
        </p>
        <nav aria-label="Informations légales" className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {LEGAL_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}

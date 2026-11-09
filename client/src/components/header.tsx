import { useAuth } from "@/hooks";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Logo } from "@/components/ui/logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserCircle, Github, LogOut } from "lucide-react";

const getInitials = (name?: string | null, email?: string | null) => {
  const source = name?.trim() || email?.split("@")[0] || "dev";
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
};

const Header = () => {
  const { user, logout } = useAuth();
  const name = user?.displayName ?? user?.email?.split("@")[0] ?? "Developer";

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
        <div className="flex items-center gap-6">
          <Logo />
          <span className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-muted-foreground sm:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Online
          </span>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="https://github.com/sahilverma-dev/devomegle"
            target="_blank"
            rel="noreferrer"
            className="hidden h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-xs font-medium text-muted-foreground transition-colors hover:border-white/20 hover:text-foreground sm:inline-flex"
          >
            <Github className="h-3.5 w-3.5" />
            Source
          </a>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.03] py-1 pl-1 pr-3 transition-colors hover:border-white/20 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Open account menu"
              >
                <Avatar className="h-8 w-8 border border-white/10">
                  <AvatarImage src={user?.photoURL ?? undefined} alt={name} />
                  <AvatarFallback className="bg-primary/15 font-mono text-[11px] font-semibold text-primary">
                    {getInitials(user?.displayName, user?.email)}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden max-w-[9rem] truncate text-xs font-medium text-muted-foreground sm:block">
                  {name}
                </span>
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56 border-white/10 bg-popover/95 backdrop-blur-xl">
              <DropdownMenuLabel className="flex items-center gap-2 text-xs font-normal text-muted-foreground">
                <UserCircle className="h-3.5 w-3.5" />
                Signed in as
              </DropdownMenuLabel>
              <div className="px-2 pb-2">
                <p className="truncate text-sm font-medium">{name}</p>
                {user?.email && (
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                )}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={logout}
                className="gap-2 text-destructive focus:text-destructive"
              >
                <LogOut className="h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default Header;

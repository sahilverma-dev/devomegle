import { useAuth } from "@/hooks";
import { toast } from "sonner";
import { ChevronDown, Copy, LogOut } from "lucide-react";

import Logo from "@/components/logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatusDot } from "@/components/ui/status-dot";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const initials = (name: string | null) =>
  name?.split(" ").join("").slice(0, 2) || "D";

const Header = () => {
  const { user, logout } = useAuth();

  const copyUid = async () => {
    if (!user) return;
    try {
      await navigator.clipboard.writeText(user.uid);
      toast.success("User ID copied");
    } catch {
      toast.error("Could not access the clipboard");
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-transparent backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Logo />
          <span className="hidden h-4 w-px bg-white/10 sm:block" />
          <span className="hidden items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-faint sm:flex">
            <StatusDot tone="live" />
            random match network
          </span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Account menu"
              className="group flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] p-1 pr-2.5 transition-colors hover:border-white/20 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Avatar className="h-7 w-7 rounded-full border-white/10">
                <AvatarImage src={user?.photoURL ?? undefined} />
                <AvatarFallback className="text-[10px]">
                  {initials(user?.displayName ?? null)}
                </AvatarFallback>
              </Avatar>
              <ChevronDown className="h-3.5 w-3.5 text-faint transition-transform group-data-[state=open]:rotate-180" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-64">
            <div className="flex items-center gap-3 px-2.5 py-2.5">
              <Avatar className="h-9 w-9">
                <AvatarImage src={user?.photoURL ?? undefined} />
                <AvatarFallback>
                  {initials(user?.displayName ?? null)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium leading-tight">
                  {user?.displayName ?? "Developer"}
                </p>
                <p className="mt-1 truncate font-mono text-[10px] leading-none text-faint">
                  {user?.email ?? `guest · ${user?.uid.slice(0, 8)}`}
                </p>
              </div>
            </div>

            <DropdownMenuSeparator />
            <DropdownMenuLabel>Account</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => void copyUid()}>
              <Copy className="h-4 w-4" />
              Copy user ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={logout}
              className="text-danger focus:bg-danger/10 focus:text-danger"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default Header;

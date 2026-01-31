import { Home, ShieldCheck, Terminal, ScanLine } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface BottomNavProps {
  onScanClick: () => void;
}

const navItems = [
  { title: "Home", url: "/", icon: Home },
  { title: "Shield", url: "/compliance", icon: ShieldCheck },
];

export function BottomNav({ onScanClick }: BottomNavProps) {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black border-t border-zinc-800 lg:hidden shadow-[0_-4px_6px_rgba(0,0,0,0.3)]">
      <div className="flex items-center justify-around h-16 px-4">
        {/* Home */}
        <Link
          href="/"
          className={cn(
            "flex flex-col items-center justify-center gap-1 p-2 transition-colors",
            pathname === "/"
              ? "text-white"
              : "text-zinc-500 hover:text-zinc-300"
          )}
        >
          <Home className="h-5 w-5" />
          <span className="font-mono text-[10px] uppercase">HOME</span>
        </Link>

        {/* Shield */}
        <Link
          href="/compliance"
          className={cn(
            "flex flex-col items-center justify-center gap-1 p-2 transition-colors",
            pathname === "/compliance"
              ? "text-white"
              : "text-zinc-500 hover:text-zinc-300"
          )}
        >
          <ShieldCheck className="h-5 w-5" />
          <span className="font-mono text-[10px] uppercase">SHIELD</span>
        </Link>

        {/* Scan - Floating Action Button */}
        <button
          onClick={onScanClick}
          className="relative -mt-8 flex items-center justify-center w-16 h-16 bg-white text-black border-2 border-black rounded-full shadow-[0_4px_10px_rgba(255,255,255,0.2)] hover:scale-105 transition-transform"
        >
          <ScanLine className="h-7 w-7" />
          {/* Pulse ring */}
          <span className="absolute inset-0 border-2 border-white rounded-full animate-ping opacity-20" />
        </button>

        {/* Chat */}
        <Link
          href="/chat"
          className={cn(
            "flex flex-col items-center justify-center gap-1 p-2 transition-colors",
            pathname === "/chat"
              ? "text-white"
              : "text-zinc-500 hover:text-zinc-300"
          )}
        >
          <Terminal className="h-5 w-5" />
          <span className="font-mono text-[10px] uppercase">CHAT</span>
        </Link>

        {/* Balance */}
        <div className="flex flex-col items-center justify-center gap-1 p-2 text-zinc-500">
          <div className="h-5 w-5 rounded-full border border-zinc-700 bg-zinc-900" />
          <span className="font-mono text-[10px] uppercase">OPTS</span>
        </div>
      </div>
    </nav>
  );
}

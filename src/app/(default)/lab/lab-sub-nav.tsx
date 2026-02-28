"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  FolderOpen,
  BookOpen,
  Megaphone,
  Users,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/lab", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/lab/collections", label: "Collections", icon: FolderOpen },
  { href: "/lab/journal-club", label: "Journal Club", icon: BookOpen },
  { href: "/lab/announcements", label: "Announcements", icon: Megaphone },
  { href: "/lab/members", label: "Members", icon: Users },
];

const ADMIN_ITEMS: NavItem[] = [
  { href: "/lab/settings", label: "Settings", icon: Settings },
];

export default function LabSubNav({ role }: { role: string }) {
  const pathname = usePathname();
  const isAdmin = role === "owner" || role === "admin";
  const items = isAdmin ? [...NAV_ITEMS, ...ADMIN_ITEMS] : NAV_ITEMS;

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <nav className="border-b">
      <div className="flex gap-1 overflow-x-auto px-1 py-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap",
                active
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

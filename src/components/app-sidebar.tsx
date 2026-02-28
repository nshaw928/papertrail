"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import {
  Search,
  Network,
  BookOpen,
  CircleUser,
  LogOut,
  Settings,
  User as UserIcon,
  FolderOpen,
  Plus,
  ChevronRight,
  Waypoints,
  CreditCard,
  FlaskConical,
  Info,
  MessageSquare,
  Star,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { signOut } from "@/app/(auth)/actions";

export interface SidebarFavorite {
  collection_type: "personal" | "lab";
  collection_id: string;
  name: string;
}

interface AppSidebarProps {
  user: User | null;
  collections: { id: string; name: string }[];
  favorites?: SidebarFavorite[];
}

export default function AppSidebar({ user, collections, favorites = [] }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleNewCollection() {
    const name = prompt("Collection name:");
    if (!name?.trim()) return;
    const res = await fetch("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    if (res.ok) {
      const collection = await res.json();
      router.push(`/library/collections/${collection.id}`);
      router.refresh();
    }
  }

  const hasFavorites = favorites.length > 0;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <BookOpen className="size-4" />
                </div>
                <span className="font-semibold tracking-tight">Papertrail</span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">alpha</Badge>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/"}>
                  <Link href="/">
                    <Search />
                    <span>Search</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === "/graph"}
                >
                  <Link href="/graph">
                    <Network />
                    <span>Graph</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {user && (
          <SidebarGroup>
            <SidebarGroupLabel>Library</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === "/library"}
                  >
                    <Link href="/library">
                      <BookOpen />
                      <span>All Papers</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === "/library/graph"}
                  >
                    <Link href="/library/graph">
                      <Waypoints />
                      <span>My Graph</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                {/* Favorites section */}
                {hasFavorites ? (
                  <Collapsible defaultOpen className="group/collapsible">
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton>
                          <Star />
                          <span>Collections</span>
                          <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {favorites.map((f) => {
                            const href =
                              f.collection_type === "personal"
                                ? `/library/collections/${f.collection_id}`
                                : `/lab/collections/${f.collection_id}`;
                            return (
                              <SidebarMenuSubItem key={`${f.collection_type}-${f.collection_id}`}>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={pathname === href}
                                >
                                  <Link href={href} className="flex items-center gap-1">
                                    {f.collection_type === "lab" && (
                                      <FlaskConical className="h-3 w-3 shrink-0 opacity-50" />
                                    )}
                                    <span className="truncate">{f.name}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            );
                          })}
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton asChild>
                              <Link
                                href="/library"
                                className="text-muted-foreground"
                              >
                                <FolderOpen className="h-4 w-4" />
                                <span>Manage</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                ) : collections.length > 0 ? (
                  <Collapsible defaultOpen className="group/collapsible">
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton>
                          <FolderOpen />
                          <span>Collections</span>
                          <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {collections.map((c) => (
                            <SidebarMenuSubItem key={c.id}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={pathname === `/library/collections/${c.id}`}
                              >
                                <Link href={`/library/collections/${c.id}`}>
                                  {c.name}
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              onClick={handleNewCollection}
                              className="text-muted-foreground"
                            >
                              <Plus className="h-4 w-4" />
                              <span>New</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                ) : (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={handleNewCollection}
                      className="text-muted-foreground"
                    >
                      <Plus />
                      <span>New Collection</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {user && (
          <SidebarGroup>
            <SidebarGroupLabel>Lab</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith("/lab")}
                  >
                    <Link href="/lab">
                      <FlaskConical />
                      <span>Lab</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

      </SidebarContent>

      <SidebarFooter>
        <SidebarGroup>
          <SidebarGroupLabel>Papertrail</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/about"}>
                  <Link href="/about">
                    <Info />
                    <span>About</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/feedback"}>
                  <Link href="/feedback">
                    <MessageSquare />
                    <span>Feedback</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarSeparator />
        <SidebarMenu>
          <SidebarMenuItem>
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton>
                    <CircleUser />
                    <span className="truncate">{user.email}</span>
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" align="start" className="w-56">
                  <DropdownMenuLabel className="font-normal text-xs text-muted-foreground">
                    {user.email}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile">
                      <UserIcon className="mr-2 h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/pricing">
                      <CreditCard className="mr-2 h-4 w-4" />
                      Plans & Pricing
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <SidebarMenuButton asChild>
                <Link href="/login">
                  <CircleUser />
                  <span>Sign in</span>
                </Link>
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

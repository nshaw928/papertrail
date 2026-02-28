import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { createClient } from "@/lib/supabase/server";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/app-sidebar";
import type { SidebarFavorite } from "@/components/app-sidebar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Papertrail (Alpha)",
  description: "Explore academic research with citation graphs and topic hierarchies",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const collections = user
    ? ((
        await supabase
          .from("collections")
          .select("id, name")
          .eq("user_id", user.id)
          .order("name")
      ).data ?? [])
    : [];

  // Fetch sidebar favorites (single query via DB function)
  let favorites: SidebarFavorite[] = [];
  if (user) {
    try {
      const { data } = await supabase.rpc("get_sidebar_favorites");
      favorites = (data ?? []) as SidebarFavorite[];
    } catch {
      // Function may not exist yet if migration hasn't run
    }
  }

  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {user ? (
          <SidebarProvider>
            <AppSidebar user={user} collections={collections} favorites={favorites} />
            <SidebarInset>
              <header className="flex h-12 shrink-0 items-center border-b px-4">
                <SidebarTrigger className="-ml-1" />
              </header>
              {children}
            </SidebarInset>
          </SidebarProvider>
        ) : (
          children
        )}
      </body>
    </html>
  );
}

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Toaster } from "@/components/ui/sonner";
import { CommandPalette } from "@/components/search/command-palette";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <MobileNav />
      <CommandPalette userId={user.id} />
      <main>
        <div className="max-w-5xl mx-auto px-6 sm:px-8 py-10 pb-28 md:pb-10">
          {children}
        </div>
      </main>
      <Toaster position="top-right" offset={80} />
    </div>
  );
}

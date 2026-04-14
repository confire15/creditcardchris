import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { PageTransition } from "@/components/layout/page-transition";
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";
import { Toaster } from "@/components/ui/sonner";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <MobileNav userId={user.id} />
      <main>
        <div className="max-w-5xl mx-auto px-6 sm:px-8 py-10 pb-28 md:pb-10">
          <PageTransition>{children}</PageTransition>
        </div>
      </main>
      <PWAInstallPrompt />
      <Toaster position="bottom-right" offset={16} mobileOffset={{ bottom: 90, right: 0, left: 0 }} />
    </div>
  );
}

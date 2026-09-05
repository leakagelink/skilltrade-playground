import { createFileRoute, Outlet, redirect, useLocation } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // Read the locally stored session (no network round-trip on every screen
    // change). Server functions still verify the token on their side.
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session?.user) throw redirect({ to: "/auth" });
    return { user: data.session.user };
  },

  component: AuthedLayout,
});

const HIDE_NAV = ["/onboarding"];

function AuthedLayout() {
  const { pathname } = useLocation();
  const hideNav = HIDE_NAV.some((p) => pathname.startsWith(p));

  return (
    <div className="min-h-screen bg-background">
      <div className={`mx-auto max-w-lg ${hideNav ? "" : "pb-24"}`}>
        <Outlet />
      </div>
      {hideNav ? null : <BottomNav />}
    </div>
  );
}

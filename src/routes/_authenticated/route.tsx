import { createFileRoute, Outlet, redirect, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getSessionSafe } from "@/lib/session";
import { BottomNav } from "@/components/BottomNav";
import { showBannerAd, hideBannerAd, subscribeBannerHeight } from "@/lib/ads/admob-bridge";
import { isEnabled } from "@/lib/feature-flags";
import { PushSetup } from "@/components/PushSetup";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // Read the locally stored session (no network round-trip on every screen
    // change). Server functions still verify the token on their side.
    const session = await getSessionSafe();
    if (!session?.user) throw redirect({ to: "/auth" });
    return { user: session.user };
  },

  component: AuthedLayout,
});

const HIDE_NAV = ["/onboarding"];

/**
 * Banner ads appear only on calm browsing screens, in reserved space at the
 * very bottom (above the navigation bar) so they never cover content, charts,
 * order buttons or any other tap target.
 */
const BANNER_ROUTES = ["/home", "/profile", "/leaderboard", "/challenges"];

function AuthedLayout() {
  const { pathname } = useLocation();
  const hideNav = HIDE_NAV.some((p) => pathname.startsWith(p));
  const bannerAllowed =
    isEnabled("bannerAds") && !hideNav && BANNER_ROUTES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const [bannerHeight, setBannerHeight] = useState(0);

  // Track the native banner's height so content and the nav bar shift up
  // instead of being covered. Always 0 on the web.
  useEffect(() => subscribeBannerHeight(setBannerHeight), []);

  useEffect(() => {
    if (bannerAllowed) void showBannerAd();
    else void hideBannerAd();
  }, [bannerAllowed]);

  // Leaving the authenticated layout entirely (sign-out) hides the banner.
  useEffect(() => () => void hideBannerAd(), []);

  return (
    <div className="min-h-screen bg-background">
      <PushSetup />
      <div
        className={`mx-auto max-w-lg ${hideNav ? "" : "pb-24"}`}
        style={bannerHeight > 0 && !hideNav ? { paddingBottom: `calc(6rem + ${bannerHeight}px)` } : undefined}
      >
        <Outlet />
      </div>
      {hideNav ? null : <BottomNav bottomOffset={bannerHeight} />}
    </div>
  );
}

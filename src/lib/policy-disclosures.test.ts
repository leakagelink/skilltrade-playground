import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

describe("policy disclosures and consent safeguards", () => {
  it("distinguishes subscription payments from simulated trading", () => {
    for (const path of ["src/routes/legal.privacy.tsx", "src/routes/legal.support.tsx", "src/routes/account-deletion.tsx"]) {
      const text = source(path);
      expect(text).not.toContain("because the app involves no real money");
      expect(text).not.toContain("no real-money transactions exist");
      expect(text).toContain("Google Play");
    }
  });
  it("discloses Meta, device-linked measurement and paid report retention", () => {
    const text = source("src/routes/legal.privacy.tsx");
    expect(text).toContain("Meta App Events and advertising measurement");
    expect(text).toContain("not guaranteed to be anonymous");
    expect(text).toContain("Paid practice tools and exports");
    expect(text).toContain("not saved as new practice records");
    expect(text).toContain("does not cancel your Google Play subscription");
  });
  it("blocks Meta natively and corrects stale manifest flags", () => {
    const native = source("android-config/meta/MetaEventsPlugin.java");
    expect(native).not.toContain("activateApp(");
    expect(native).not.toContain("sdkInitialize(");
    expect(native).toContain("setAutoInitEnabled(false)");
    expect(native).toContain("setAdvertiserIDCollectionEnabled(false)");
    expect(native).not.toContain("logger().logEvent");
    const setup = source("scripts/android-firebase-setup.mjs");
    expect(setup).toContain('["com.facebook.sdk.AutoInitEnabled", "false"]');
    expect(setup).toContain('["com.facebook.sdk.AdvertiserIDCollectionEnabled", "false"]');
    expect(setup).toContain("Replace stale enabled flags");
  });
  it("never treats a closed consent form as ad-request eligibility", () => {
    const bridge = source("src/lib/ads/admob-bridge.ts");
    expect(bridge).toContain("info = await mod.AdMob.showConsentForm()");
    expect(bridge).toContain("if (!info.canRequestAds) return null");
    expect(bridge).not.toContain("continue without ads consent form");
  });
  it("keeps ad disclosures aligned with frequency and banner placements", () => {
    const privacy = source("src/routes/legal.privacy.tsx");
    expect(privacy).toContain("8 rewarded and 7 interstitial");
    expect(privacy).toContain("at least 2 minutes");
    expect(privacy).toContain("UTC calendar day");
    expect(privacy).toContain("(Home and Profile)");
    const layout = source("src/routes/_authenticated/route.tsx");
    expect(layout).toContain('const BANNER_ROUTES = ["/home", "/profile"]');
  });
});
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getSessionSafe } from "@/lib/session";

function GoogleIcon() {
  return (
    <svg className="size-5" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.1 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z" />
    </svg>
  );
}


import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { lovable } from "@/integrations/lovable";
import { BrandLogo, BrandMark } from "@/components/BrandLogo";
import { trackEvent } from "@/lib/analytics";
import { isNativeTradeVirtApp, signInWithGoogleNative } from "@/lib/native-google";

const TRADEVIRT_WEB_ORIGIN = "https://tradevirt.online";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — TradeVirt Paper Trading Simulator" },
      { name: "description", content: "Create your TradeVirt account and start practising simulated trading with virtual money." },
      { property: "og:title", content: "Sign in — TradeVirt" },
      { property: "og:description", content: "Create an account to practise paper trading with virtual money." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [sent, setSent] = useState(false);
  // Hold the sign-in form back until we know whether a session already exists,
  // so a returning user never sees the sign-in screen before their home screen.
  const [checkingSession, setCheckingSession] = useState(true);
  const googleSignInRunning = useRef(false);

  useEffect(() => {
    let active = true;
    getSessionSafe().then((session) => {
      if (!active) return;
      if (session) navigate({ to: "/home", replace: true });
      else setCheckingSession(false);
    });
    return () => {
      active = false;
    };
  }, [navigate]);

  if (checkingSession) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 gradient-hero">
        <BrandMark size="lg" className="animate-pulse rounded-3xl p-4" />
        <Loader2 className="size-5 animate-spin text-primary" />
      </main>
    );
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const id = loginId.trim();
    if (id.includes("@")) {
      const { error } = await supabase.auth.signInWithPassword({ email: id, password });
      setLoading(false);
      if (error) {
        toast.error(error.message);
        return;
      }
    } else {
      try {
        const r = await mobileLogin({ data: { mobile: id, password } });
        if (!r.ok) {
          setLoading(false);
          toast.error(r.error);
          return;
        }
        const { error } = await supabase.auth.setSession({ access_token: r.access_token, refresh_token: r.refresh_token });
        setLoading(false);
        if (error) {
          toast.error(error.message);
          return;
        }
      } catch {
        setLoading(false);
        toast.error("Invalid mobile number or password.");
        return;
      }
    }
    void trackEvent("login_completed", { method: id.includes("@") ? "password" : "mobile_password" });
    navigate({ to: "/home", replace: true });
  }

  async function handleGoogleSignIn() {
    if (googleSignInRunning.current) return;
    googleSignInRunning.current = true;
    setLoading(true);
    try {
      // Native builds must never fall back to browser OAuth. If native Google
      // setup fails, show the error so the signing/client configuration can be
      // corrected instead of stranding the user in a browser session.
      if (isNativeTradeVirtApp()) {
        const r = await signInWithGoogleNative();
        if (r.cancelled) return;
        if (r.error) {
          toast.error(r.error.message || "Google sign-in failed. Please try again.");
          return;
        }
        void trackEvent("login_completed", { method: "google_native" });
        navigate({ to: "/home", replace: true });
        return;
      }
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${TRADEVIRT_WEB_ORIGIN}/auth`,
      });
      if (result.error) {
        toast.error(result.error.message ?? "Google sign-in failed. Please try again.");
        return;
      }
      // Full-page OAuth: the browser redirects to Google and control returns
      // before the session is set — no further navigation here.
      if (result.redirected) return;
      void trackEvent("login_completed", { method: "google" });
      navigate({ to: "/home", replace: true });
    } catch (e) {
      console.error("[google-native] handler failed:", e);
      toast.error(e instanceof Error ? e.message : "Google sign-in failed. Please try again.");
    } finally {
      googleSignInRunning.current = false;
      setLoading(false);
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    const u = username.trim();
    if (u.length < 3 || u.length > 20) {
      toast.error("Username must be 3–20 characters.");
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(u)) {
      toast.error("Username can only contain letters, numbers and underscores.");
      return;
    }
    const m = mobile.trim();
    if (m && !/^\+?[0-9 ]{6,20}$/.test(m)) {
      toast.error("Enter a valid mobile number, or leave it empty.");
      return;
    }
    // Onboarding owns the user_personalization row (it only exists once the
    // account session does), so hand the optional details over through
    // sessionStorage and let onboarding prefill and save them.
    try {
      sessionStorage.setItem(
        "tv-signup-personal",
        JSON.stringify({ full_name: fullName.trim() || null, mobile: m || null }),
      );
    } catch {
      // Storage unavailable — onboarding still asks for the details itself.
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin, data: { username: u } },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data.session) {
      void trackEvent("sign_up_completed", { method: "password" });
      navigate({ to: "/onboarding", replace: true });
      return;
    }
    setSent(true);
  }




  if (sent) {
    return (
      <main className="mesh-bg flex min-h-screen items-center justify-center bg-background px-6">
        <div className="glass-card max-w-sm p-6 text-center">
          <BrandMark size="md" className="mx-auto mb-4" />
          <h1 className="text-xl font-semibold">Check your email</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We sent a confirmation link to <span className="text-foreground">{email}</span>. Confirm your
            address to activate your simulated trading account.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mesh-bg min-h-screen bg-background px-6 py-12">
      <div className="mx-auto max-w-sm">
        <Link to="/" className="text-sm text-muted-foreground">
          ← Back
        </Link>
        <BrandLogo size="md" withTagline className="mt-6" />
        <h1 className="mt-6 text-2xl font-bold">Welcome to TradeVirt</h1>

        <Tabs defaultValue="signup" className="mt-8">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signup">Sign up</TabsTrigger>
            <TabsTrigger value="signin">Log in</TabsTrigger>
          </TabsList>

          <TabsContent value="signup">
            <form onSubmit={handleSignUp} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="su-username">Username</Label>
                <Input id="su-username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="tradevirt" required minLength={3} maxLength={20} className="h-12 rounded-xl bg-elevated/40" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="su-name">Full name (optional)</Label>
                <Input id="su-name" value={fullName} maxLength={80} onChange={(e) => setFullName(e.target.value)} className="h-12 rounded-xl bg-elevated/40" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="su-mobile">Mobile number (optional)</Label>
                <Input id="su-mobile" type="tel" inputMode="tel" value={mobile} maxLength={20} placeholder="+91 98765 43210" onChange={(e) => setMobile(e.target.value)} className="h-12 rounded-xl bg-elevated/40" />
                <p className="text-[11px] text-muted-foreground">Kept private — never shown to other users.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="su-email">Email</Label>
                <Input id="su-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-12 rounded-xl bg-elevated/40" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="su-password">Password</Label>
                <Input id="su-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="h-12 rounded-xl bg-elevated/40" />
              </div>
              <Button type="submit" disabled={loading} className="h-13 w-full rounded-2xl text-base font-semibold shadow-[0_16px_36px_-18px_oklch(0.78_0.17_158/80%)]">
                {loading ? <Loader2 className="size-4 animate-spin" /> : "Create account"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signin">
            <form onSubmit={handleSignIn} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="si-email">Email</Label>
                <Input id="si-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-12 rounded-xl bg-elevated/40" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="si-password">Password</Label>
                <Input id="si-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="h-12 rounded-xl bg-elevated/40" />
              </div>
              <Button type="submit" disabled={loading} className="h-13 w-full rounded-2xl text-base font-semibold shadow-[0_16px_36px_-18px_oklch(0.78_0.17_158/80%)]">
                {loading ? <Loader2 className="size-4 animate-spin" /> : "Log in"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <div className="mt-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="mt-6 h-13 w-full rounded-2xl text-base font-semibold"
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <GoogleIcon />
          )}
          <span className="ml-2">Continue with Google</span>
        </Button>

        <p className="mt-8 text-center text-[11px] leading-relaxed text-muted-foreground">
          By continuing you agree that TradeVirt is a simulated paper trading application for
          educational purposes only. No real money trading is available.
        </p>
      </div>
    </main>
  );
}

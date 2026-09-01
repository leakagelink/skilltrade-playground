import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — PaperEdge Paper Trading Simulator" },
      { name: "description", content: "Create your PaperEdge account and start practising simulated trading with virtual money." },
      { property: "og:title", content: "Sign in — PaperEdge" },
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
  const [sent, setSent] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/home", replace: true });
    });
  }, [navigate]);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    navigate({ to: "/home", replace: true });
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
      navigate({ to: "/onboarding", replace: true });
      return;
    }
    setSent(true);
  }

  async function handleGoogle() {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) {
      setLoading(false);
      toast.error("Google sign-in is unavailable right now.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/home", replace: true });
  }

  if (sent) {
    return (
      <main className="flex min-h-screen items-center justify-center gradient-hero px-6">
        <div className="surface-card max-w-sm p-6 text-center">
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
    <main className="min-h-screen gradient-hero px-6 py-12">
      <div className="mx-auto max-w-sm">
        <Link to="/" className="text-sm text-muted-foreground">
          ← Back
        </Link>
        <h1 className="mt-6 text-2xl font-bold">Welcome to PaperEdge</h1>
        <p className="mt-1 text-sm text-muted-foreground">Practice Trading. Build Your Skill.</p>

        <Tabs defaultValue="signup" className="mt-8">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signup">Sign up</TabsTrigger>
            <TabsTrigger value="signin">Log in</TabsTrigger>
          </TabsList>

          <TabsContent value="signup">
            <form onSubmit={handleSignUp} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="su-username">Username</Label>
                <Input id="su-username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="tradepro" required minLength={3} maxLength={20} className="h-12" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="su-email">Email</Label>
                <Input id="su-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-12" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="su-password">Password</Label>
                <Input id="su-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="h-12" />
              </div>
              <Button type="submit" disabled={loading} className="h-12 w-full rounded-xl text-base font-semibold">
                {loading ? <Loader2 className="size-4 animate-spin" /> : "Create account"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signin">
            <form onSubmit={handleSignIn} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="si-email">Email</Label>
                <Input id="si-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-12" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="si-password">Password</Label>
                <Input id="si-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="h-12" />
              </div>
              <Button type="submit" disabled={loading} className="h-12 w-full rounded-xl text-base font-semibold">
                {loading ? <Loader2 className="size-4 animate-spin" /> : "Log in"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
        </div>

        <Button variant="outline" onClick={handleGoogle} disabled={loading} className="h-12 w-full rounded-xl">
          Continue with Google
        </Button>

        <p className="mt-8 text-center text-[11px] leading-relaxed text-muted-foreground">
          By continuing you agree that PaperEdge is a simulated paper trading application for
          educational purposes only. No real money trading is available.
        </p>
      </div>
    </main>
  );
}

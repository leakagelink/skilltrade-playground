import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { deleteMyAccount, getDashboard, updateProfileSettings } from "@/lib/trading.functions";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { DisclaimerNote } from "@/components/Disclaimer";
import { toast } from "sonner";
import { ChevronRight, LogOut } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — TradeVirt" },
      { name: "description", content: "Manage your username, leaderboard visibility, legal information and account." },
      { property: "og:title", content: "Settings — TradeVirt" },
      { property: "og:description", content: "Manage your TradeVirt paper trading account." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const loadDash = useServerFn(getDashboard);
  const save = useServerFn(updateProfileSettings);
  const removeAccount = useServerFn(deleteMyAccount);

  const { data } = useQuery({ queryKey: ["dashboard"], queryFn: () => loadDash() });
  const [username, setUsername] = useState("");
  const [visible, setVisible] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data?.profile) {
      setUsername(data.profile.username);
      setVisible(data.profile.leaderboardVisible);
    }
  }, [data]);

  async function saveSettings(patch: { username?: string; leaderboardVisible?: boolean }) {
    setSaving(true);
    try {
      await save({ data: patch });
      await qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Settings saved.");
    } catch (e) {
      toast.error((e as Error).message || "Could not save your settings.");
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  async function deleteAccount() {
    try {
      await removeAccount();
      await supabase.auth.signOut();
      qc.clear();
      navigate({ to: "/", replace: true });
    } catch {
      toast.error("Could not delete your account. Please try again.");
    }
  }

  return (
    <main>
      <AppHeader title="Settings" back="/home" />

      <div className="space-y-6 p-5">
        <section className="surface-card space-y-4 p-4">
          <div>
            <Label htmlFor="username">Username</Label>
            <div className="mt-1.5 flex gap-2">
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-11 rounded-xl"
              />
              <Button
                variant="outline"
                className="h-11 rounded-xl"
                disabled={saving || username === data?.profile?.username}
                onClick={() => saveSettings({ username })}
              >
                Save
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Show me on the leaderboard</p>
              <p className="text-xs text-muted-foreground">Your username, level and skill score become visible.</p>
            </div>
            <Switch
              checked={visible}
              onCheckedChange={(v) => {
                setVisible(v);
                saveSettings({ leaderboardVisible: v });
              }}
            />
          </div>
        </section>

        <section className="surface-card divide-y divide-border overflow-hidden">
          <LegalLink to="/legal/terms" label="Terms of Service" />
          <LegalLink to="/legal/privacy" label="Privacy Policy" />
          <LegalLink to="/legal/disclaimer" label="Risk Disclaimer" />
        </section>

        <DisclaimerNote />

        <div className="space-y-3">
          <Button variant="outline" className="h-11 w-full rounded-xl" onClick={signOut}>
            <LogOut className="size-4" /> Sign out
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" className="h-11 w-full rounded-xl text-destructive hover:text-destructive">
                Delete account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently removes your profile, simulated trades and progress. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={deleteAccount}>Delete permanently</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </main>
  );
}

function LegalLink({ to, label }: { to: "/legal/terms" | "/legal/privacy" | "/legal/disclaimer"; label: string }) {
  return (
    <Link to={to} className="flex items-center gap-3 px-4 py-3.5 text-sm active:bg-elevated">
      <span className="flex-1">{label}</span>
      <ChevronRight className="size-4 text-muted-foreground" />
    </Link>
  );
}

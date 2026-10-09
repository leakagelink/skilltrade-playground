import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAdminStatus, getBroadcastStats, broadcastPushAll, sendAdminTestPush, getAdminUsers } from "@/lib/admin-notifications.functions";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { BellRing, Download, Search, Send, ShieldAlert, Users } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin Notifications — TradeVirt" },
      { name: "description", content: "Admin-only panel to send test and broadcast push notifications." },
      { property: "og:title", content: "Admin Notifications — TradeVirt" },
      { property: "og:description", content: "Admin-only panel to send test and broadcast push notifications." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminNotificationsPage,
});

function AdminNotificationsPage() {
  const loadStatus = useServerFn(getAdminStatus);
  const loadStats = useServerFn(getBroadcastStats);
  const sendTest = useServerFn(sendAdminTestPush);
  const broadcast = useServerFn(broadcastPushAll);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [capitalFilter, setCapitalFilter] = useState("all");
  const [marketFilter, setMarketFilter] = useState("all");

  const status = useQuery({ queryKey: ["admin-status"], queryFn: () => loadStatus(), staleTime: 60_000 });
  const stats = useQuery({
    queryKey: ["admin-broadcast-stats"],
    queryFn: () => loadStats(),
    staleTime: 60_000,
    enabled: status.data?.admin === true,
  });
  const loadUsers = useServerFn(getAdminUsers);
  const users = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => loadUsers(),
    staleTime: 30_000,
    enabled: status.data?.admin === true,
  });

  const testMutation = useMutation({
    mutationFn: (input: { title: string; body: string }) => sendTest({ data: input }),
    onSuccess: (r) => {
      if (r.sent > 0) toast.success(`Test notification sent to ${r.sent} of your device(s).`);
      else if (!r.configured) toast.error("Firebase is not configured. Ask the developer to check the key.");
      else if (r.error) toast.error(`Send failed: ${r.error}`);
      else toast.error("No registered device found for your account. Open the app on your phone and enable notifications.");
    },
    onError: (e: Error) => toast.error(e.message || "Could not send the test notification."),
  });

  const broadcastMutation = useMutation({
    mutationFn: (input: { title: string; body: string }) => broadcast({ data: input }),
    onSuccess: (r) => {
      setConfirmOpen(false);
      if (r.sent > 0) toast.success(`Notification sent to ${r.sent} device(s).`);
      else if (r.error) toast.error(`Send failed: ${r.error}`);
      else toast.error("No registered devices found yet.");
      void stats.refetch();
    },
    onError: (e: Error) => {
      setConfirmOpen(false);
      toast.error(e.message || "Could not send the broadcast.");
    },
  });

  const canSend = title.trim().length > 0 && body.trim().length > 0;

  const filteredUsers = (users.data ?? []).filter((u) => {
    const q = userSearch.trim().toLowerCase();
    if (q && ![u.full_name, u.username, u.email, u.mobile].some((v) => v?.toLowerCase().includes(q))) return false;
    if (levelFilter !== "all" && u.experience_level !== levelFilter) return false;
    if (capitalFilter !== "all" && u.capital_range !== capitalFilter) return false;
    if (marketFilter !== "all" && !u.preferred_markets?.includes(marketFilter)) return false;
    return true;
  });

  function exportUsersCsv() {
    const rows = filteredUsers;
    if (!rows.length) {
      toast.error("Export ke liye koi user nahi mila.");
      return;
    }
    const esc = (v: string | number | null | undefined) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const header = ["Full Name", "Username", "Email", "Mobile", "Experience Level", "Learning Goal", "Preferred Markets", "Capital Range", "App Level", "XP", "Signup Date"];
    const lines = rows.map((u) =>
      [
        esc(u.full_name), esc(u.username), esc(u.email), esc(u.mobile), esc(u.experience_level),
        esc(u.learning_goal), esc(u.preferred_markets?.join(", ")), esc(u.capital_range),
        esc(u.level), esc(u.xp), esc(u.created_at ? new Date(u.created_at).toLocaleString("en-IN") : ""),
      ].join(","),
    );
    const csv = [header.map(esc).join(","), ...lines].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tradevirt-users-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${rows.length} user(s) export ho gaye.`);
  }

  if (status.isLoading) {
    return (
      <div className="min-h-dvh">
        <AppHeader title="Admin" />
        <div className="mx-auto max-w-md space-y-4 p-4">
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (status.data && !status.data.admin) {
    return (
      <div className="min-h-dvh">
        <AppHeader title="Admin" />
        <div className="mx-auto max-w-md p-4">
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <ShieldAlert className="h-10 w-10 text-muted-foreground" />
              <p className="font-medium">Not authorized</p>
              <p className="text-sm text-muted-foreground">This area is only for TradeVirt admins.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh">
      <AppHeader title="TradeVirt Admin" back="/home" showSettings />
      <div className="mx-auto grid w-full max-w-[1600px] grid-cols-1 gap-6 p-4 pb-8 sm:p-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:p-8 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 lg:col-span-2">
          <h2 className="text-2xl font-semibold">Admin panel</h2>
          <p className="mt-1 text-sm text-muted-foreground">Users & notifications</p>
        </div>
        <section className="grid grid-cols-2 gap-4 border-y py-5 lg:col-span-2" aria-label="Overview">
          <div className="flex min-w-0 items-center gap-3">
            <Users className="size-6 shrink-0 text-primary" />
            <div className="min-w-0"><p className="text-3xl font-semibold tabular-nums">{stats.data?.users ?? "—"}</p><p className="text-sm text-muted-foreground">Registered users</p></div>
          </div>
          <div className="flex min-w-0 items-center gap-3">
            <BellRing className="size-6 shrink-0 text-bull" />
            <div className="min-w-0"><p className="text-3xl font-semibold tabular-nums">{stats.data?.devices ?? "—"}</p><p className="text-sm text-muted-foreground">Devices with push on</p></div>
          </div>
        </section>
        <section className="min-w-0" aria-label="Registered users">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" /> Registered users
            </CardTitle>
            <CardDescription>{filteredUsers.length} of {users.data?.length ?? 0} users · Admin-only access</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_auto]">
              <div className="relative min-w-0">
              <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <Input
                aria-label="Search users"
                className="pl-9"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Naam, email, username ya mobile se khojein…"
              />
              </div>
              <Button variant="outline" size="sm" className="h-10 shrink-0" onClick={exportUsersCsv} disabled={!filteredUsers.length}>
                <Download className="mr-2 h-4 w-4" /> Export {filteredUsers.length} user(s) as CSV
              </Button>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 xl:col-span-2">
                <select aria-label="Experience level" value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} className="h-10 min-w-0 rounded-md border bg-background px-3 text-sm">
                  <option value="all">Sab levels</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="expert">Expert</option>
                </select>
                <select aria-label="Starting capital" value={capitalFilter} onChange={(e) => setCapitalFilter(e.target.value)} className="h-10 min-w-0 rounded-md border bg-background px-3 text-sm">
                  <option value="all">Sab capital</option>
                  <option value="unknown">Don't know</option>
                  <option value="1k_10k">₹1k–₹10k</option>
                  <option value="10k_50k">₹10k–₹50k</option>
                  <option value="50k_1l">₹50k–₹1L</option>
                  <option value="1l_5l">₹1L–₹5L</option>
                  <option value="5l_plus">₹5L+</option>
                  <option value="prefer_not">Prefer not</option>
                </select>
                <select aria-label="Preferred market" value={marketFilter} onChange={(e) => setMarketFilter(e.target.value)} className="h-10 min-w-0 rounded-md border bg-background px-3 text-sm">
                  <option value="all">Sab markets</option>
                  <option value="us_stocks">US Stocks</option>
                  <option value="indian_stocks">Indian Stocks</option>
                  <option value="crypto">Crypto</option>
                  <option value="commodities">Commodities</option>
                </select>
              </div>
            </div>
            {users.isLoading && <Skeleton className="h-24 w-full" />}
            {!users.isLoading && filteredUsers.length === 0 && <p className="text-sm text-muted-foreground">Is filter se koi user nahi mila.</p>}
            <div className="hidden overflow-x-auto rounded-lg border lg:block">
              <table className="w-full min-w-[900px] text-left text-xs">
                <thead className="bg-muted/60 text-muted-foreground">
                  <tr>{["User", "Contact", "Experience / Goal", "Markets", "Capital", "Progress", "Joined"].map((heading) => <th key={heading} scope="col" className="px-4 py-3 font-semibold">{heading}</th>)}</tr>
                </thead>
                <tbody className="divide-y">
                  {filteredUsers.map((u) => (
                    <tr key={u.user_id} className="align-top transition-colors hover:bg-muted/30">
                      <td className="max-w-44 break-words px-4 py-4"><p className="font-semibold text-sm">{u.full_name || u.username}</p><p className="mt-1 text-muted-foreground">@{u.username}</p></td>
                      <td className="max-w-56 break-words px-4 py-4"><p>{u.email || "—"}</p><p className="mt-1 text-muted-foreground">{u.mobile || "—"}</p></td>
                      <td className="max-w-44 break-words px-4 py-4"><p className="capitalize">{u.experience_level || "—"}</p><p className="mt-1 text-muted-foreground">{u.learning_goal || "—"}</p></td>
                      <td className="max-w-40 break-words px-4 py-4">{u.preferred_markets?.length ? u.preferred_markets.join(", ") : "—"}</td>
                      <td className="px-4 py-4">{u.capital_range || "—"}</td>
                      <td className="whitespace-nowrap px-4 py-4 tabular-nums"><p>Level {u.level}</p><p className="mt-1 text-muted-foreground">{u.xp} XP</p></td>
                      <td className="whitespace-nowrap px-4 py-4">{u.created_at ? new Date(u.created_at).toLocaleDateString("en-IN") : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-3 lg:hidden">
            {filteredUsers.map((u) => (
              <div key={u.user_id} className="rounded-lg border p-3 text-sm space-y-1 break-words">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                  <p className="min-w-0 font-medium">{u.full_name || u.username}</p>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString("en-IN") : ""}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">@{u.username}{u.email ? ` · ${u.email}` : ""}</p>
                <p className="text-xs">Mobile: {u.mobile || "—"}</p>
                <p className="text-xs">Level: {u.experience_level || "—"}{u.learning_goal ? ` · Goal: ${u.learning_goal}` : ""}</p>
                <p className="text-xs">Markets: {u.preferred_markets?.length ? u.preferred_markets.join(", ") : "—"}</p>
                <p className="text-xs">Starting capital: {u.capital_range || "—"}</p>
                <p className="text-xs text-muted-foreground">App level {u.level} · {u.xp} XP</p>
              </div>
            ))}
            </div>
          </CardContent>
        </section>

        <aside className="min-w-0 space-y-4 border-t pt-6 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0" aria-label="Notifications">
        <section>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BellRing className="h-4 w-4" /> New notification
            </CardTitle>
            <CardDescription>Custom message</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notif-title">Title</Label>
              <Input
                id="notif-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. New challenge is live!"
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notif-body">Message</Label>
              <Textarea
                id="notif-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write the notification text here…"
                maxLength={500}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">{body.length}/500</p>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                disabled={!canSend || testMutation.isPending}
                onClick={() => testMutation.mutate({ title: title.trim(), body: body.trim() })}
              >
                {testMutation.isPending ? "Sending…" : "Send test to me"}
              </Button>
              <Button
                disabled={!canSend || broadcastMutation.isPending}
                onClick={() => setConfirmOpen(true)}
              >
                <Send className="mr-2 h-4 w-4" /> {broadcastMutation.isPending ? "Sending…" : "Send to all users"}
              </Button>
            </div>
          </CardContent>
        </section>

        <p className="text-xs text-muted-foreground">
          "Send to all users" delivers to every registered device and also saves the message in each user's in-app
          notifications. Test notifications go only to your own devices.
        </p>
        </aside>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send to all users?</AlertDialogTitle>
            <AlertDialogDescription>
              This sends "{title.trim()}" to every registered device ({stats.data?.devices ?? 0}) and saves it in every
              user's in-app notifications. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={broadcastMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                broadcastMutation.mutate({ title: title.trim(), body: body.trim() });
              }}
            >
              {broadcastMutation.isPending ? "Sending…" : "Send to everyone"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

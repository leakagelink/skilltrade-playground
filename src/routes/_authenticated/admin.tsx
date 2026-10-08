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
import { BellRing, Send, ShieldAlert, Users } from "lucide-react";
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
      <AppHeader title="Admin Notifications" />
      <div className="mx-auto max-w-md space-y-4 p-4 pb-24">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" /> Reach
            </CardTitle>
            <CardDescription>Registered devices and app users right now.</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-6">
            <div>
              <p className="text-2xl font-semibold">{stats.data?.devices ?? "—"}</p>
              <p className="text-xs text-muted-foreground">Devices with push on</p>
            </div>
            <div>
              <p className="text-2xl font-semibold">{stats.data?.users ?? "—"}</p>
              <p className="text-xs text-muted-foreground">App users</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" /> Registered users
            </CardTitle>
            <CardDescription>Har user ki signup details — sirf admin dekh sakta hai.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {users.isLoading && <Skeleton className="h-24 w-full" />}
            {users.data?.length === 0 && <p className="text-sm text-muted-foreground">Abhi koi user nahi mila.</p>}
            {users.data?.map((u) => (
              <div key={u.user_id} className="rounded-xl border p-3 text-sm space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{u.full_name || u.username}</p>
                  <span className="text-xs text-muted-foreground">
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BellRing className="h-4 w-4" /> New notification
            </CardTitle>
            <CardDescription>Sent via Firebase directly. No AI credits are used.</CardDescription>
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
        </Card>

        <p className="text-xs text-muted-foreground">
          "Send to all users" delivers to every registered device and also saves the message in each user's in-app
          notifications. Test notifications go only to your own devices.
        </p>
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

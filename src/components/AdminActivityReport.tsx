import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download, RefreshCw } from "lucide-react";
import { getActivityReport } from "@/lib/admin-activity.functions";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const PERIODS = [{ value: "day", label: "Daily" }, { value: "week", label: "Weekly" }, { value: "month", label: "Monthly" }, { value: "year", label: "Yearly" }] as const;
const dateTime = (value: string) => new Date(value).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

export function AdminActivityReport() {
  const [period, setPeriod] = useState<"day" | "week" | "month" | "year">("day");
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("all");
  const load = useServerFn(getActivityReport);
  const report = useQuery({ queryKey: ["admin-activity", period], queryFn: () => load({ data: { period } }), staleTime: 30_000, refetchInterval: 60_000 });
  const data = report.data;
  const rows = (data?.active_users ?? []).filter((user) => (country === "all" || (user.country || "Not provided") === country) && `${user.full_name ?? ""} ${user.username}`.toLowerCase().includes(search.toLowerCase()));
  function exportCsv() {
    const esc = (v: string | number | null) => `"${String(v ?? "").replace(/^[=+@-]/, "'$&").replace(/"/g, '""')}"`;
    const csv = [["Name", "Username", "Country (self-reported)", "Last active (IST)", "Platforms"], ...rows.map((u) => [u.full_name || u.username, u.username, u.country || "Not provided", dateTime(u.last_seen_at), u.platforms.join(", ")])].map((r) => r.map(esc).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `tradevirt-active-${period}.csv`; link.click(); URL.revokeObjectURL(url);
  }
  return <section className="min-w-0 space-y-5 border-b pb-6 lg:col-span-2" aria-label="Growth and activity">
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
      <div className="min-w-0"><h2 className="text-xl">Growth & activity</h2><p className="mt-1 text-xs text-muted-foreground">Calendar periods · India time (IST) · {data ? `${data.total_users} accounts` : "Loading"}</p></div>
      <Button size="icon" variant="outline" aria-label="Refresh activity report" title="Refresh activity report" disabled={report.isFetching} onClick={() => void report.refetch()}><RefreshCw className={`size-4 ${report.isFetching ? "animate-spin" : ""}`} /></Button>
    </div>
    {report.isError ? <p role="alert" className="text-sm text-destructive">Activity report could not be loaded. Please refresh.</p> : !data ? <Skeleton className="h-40 w-full" /> : <>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {PERIODS.map(({ value, label }) => {
          const metrics = data.periods.find((p) => p.period === value);
          return <div key={value} className="rounded-lg border bg-card p-4"><p className="text-sm font-semibold">{label}</p><dl className="mt-3 space-y-2 text-sm"><div className="flex justify-between gap-2"><dt className="text-muted-foreground">New signups</dt><dd className="font-semibold tabular-nums">{metrics?.signups ?? "—"}</dd></div><div className="flex justify-between gap-2"><dt className="text-muted-foreground">Active users</dt><dd className="font-semibold tabular-nums">{metrics?.active_users ?? "—"}</dd></div></dl></div>;
        })}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="border-l-2 border-warning pl-4"><p className="text-sm font-semibold">Downloads: Not connected</p><p className="mt-1 text-xs text-muted-foreground">Verified store downloads require Google Play / App Store reporting.</p></div>
        <div className="border-l-2 border-warning pl-4"><p className="text-sm font-semibold">New installs: Not connected</p><p className="mt-1 text-xs text-muted-foreground">Firebase first-open reports are not imported. Signups and push devices are not install counts.</p></div>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">Active = signed-in account observed while TradeVirt is open in the foreground. History starts {data.tracking_started_at ? dateTime(data.tracking_started_at) : "with the first recorded visit"}; earlier activity is unavailable. Country is supplied by the user, not GPS or verified location.</p>
      <div className="overflow-x-auto"><table className="w-full min-w-[520px] text-left text-xs"><caption className="mb-3 text-left text-sm font-semibold">Daily trend · last 30 days</caption><thead className="bg-muted/60"><tr><th className="p-2">Date (IST)</th><th className="p-2">New signups</th><th className="p-2">Active users</th></tr></thead><tbody>{data.trend.slice().reverse().map((day) => <tr key={day.date} className="border-b"><td className="p-2">{day.date}</td><td className="p-2 tabular-nums">{day.signups}</td><td className="p-2 tabular-nums">{data.tracking_started_at && day.date >= new Date(new Date(data.tracking_started_at).getTime() + 19800000).toISOString().slice(0, 10) ? day.active_users : "Not tracked"}</td></tr>)}</tbody></table></div>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Activity period">{PERIODS.map(({ value, label }) => <Button key={value} size="sm" variant={period === value ? "default" : "outline"} aria-pressed={period === value} onClick={() => setPeriod(value)}>{label}</Button>)}</div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="min-w-0 space-y-3"><h3 className="text-base">Active accounts · since {data.period_start}</h3>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px_auto]"><input aria-label="Search active users" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or username" className="h-9 min-w-0 rounded-md border bg-background px-3 text-sm" /><select aria-label="Active user country" className="h-9 min-w-0 rounded-md border bg-background px-2 text-sm" value={country} onChange={(e) => setCountry(e.target.value)}><option value="all">All countries</option>{data.countries.map((c) => <option key={c.country} value={c.country}>{c.country}</option>)}</select><Button size="sm" variant="outline" disabled={!rows.length} onClick={exportCsv}><Download className="size-4" /> Export active</Button></div>
          <div className="max-h-96 overflow-auto rounded-lg border"><table className="w-full min-w-[520px] text-left text-xs"><thead className="sticky top-0 bg-muted"><tr>{["User", "Country", "Last active (IST)", "Platform"].map((h) => <th key={h} className="p-3">{h}</th>)}</tr></thead><tbody>{rows.map((u) => <tr key={u.user_id} className="border-t"><td className="p-3"><p className="font-semibold">{u.full_name || u.username}</p><p className="mt-1 text-muted-foreground">@{u.username}</p></td><td className="p-3">{u.country || "Not provided"}</td><td className="p-3">{dateTime(u.last_seen_at)}</td><td className="p-3">{u.platforms.join(", ")}</td></tr>)}</tbody></table>{!rows.length && <p className="p-4 text-sm text-muted-foreground">No recorded active users for this selection.</p>}</div>
        </div>
        <div className="min-w-0"><h3 className="mb-3 text-base">Active users by country</h3>{data.countries.map((c) => <div key={c.country} className="flex justify-between gap-3 border-b py-3 text-sm"><span>{c.country}</span><span className="font-semibold tabular-nums">{c.users}</span></div>)}{!data.countries.length && <p className="text-sm text-muted-foreground">No activity recorded yet.</p>}</div>
      </div>
    </>}
  </section>;
}
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Calculator, Download, FlaskConical, Lock, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { runPaidPractice } from "@/lib/paid-practice.functions";
import { canUsePracticeTool, type PracticeResult, type PracticeTool } from "@/lib/billing/practice-benefits";
import type { Tier } from "@/lib/billing/plans";

export function PaidPracticeTools({ tier }: { tier: Tier }) {
  const run = useServerFn(runPaidPractice);
  const [tool, setTool] = useState<PracticeTool>("risk");
  const [values, setValues] = useState({ balance: "100000", riskPct: "1", entry: "100", stop: "95", target: "110", losses: "10" });
  const [result, setResult] = useState<PracticeResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const allowed = canUsePracticeTool(tier, tool);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setResult(null);
    try {
      const balance = Number(values.balance), riskPct = Number(values.riskPct);
      const data = tool === "risk" ? { tool, balance, riskPct, entry: Number(values.entry), stop: Number(values.stop), target: Number(values.target) } : tool === "stress" ? { tool, balance, riskPct, losses: Number(values.losses) } : { tool };
      setResult(await run({ data }));
    } catch (e) { setError(e instanceof Error ? e.message : "Could not run this tool. Please retry."); }
    finally { setBusy(false); }
  }
  function download() {
    if (!result) return;
    const cell = (s: string) => `"${(/^[=+\-@]/.test(s) ? "'" : "") + s.replaceAll('"', '""')}"`;
    const csv = [["TradeVirt educational report", result.title], ...result.metrics.map(m => [m.label, m.value]), ...result.notes.map(n => ["Note", n])].map(row => row.map(cell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = "tradevirt-discipline-report.csv"; a.click(); URL.revokeObjectURL(url);
  }
  const fields = tool === "risk" ? (["balance", "riskPct", "entry", "stop", "target"] as const) : (["balance", "riskPct", "losses"] as const);
  const labels = { balance: "Virtual capital", riskPct: "Risk per trade (%)", entry: "Entry price", stop: "Stop price", target: "Target price", losses: "Consecutive losses" };
  return <section className="space-y-4 border-t pt-6" aria-label="Paid practice tools">
    <h2 className="text-xl tracking-normal">Your practice workbench</h2>
    <div className="grid gap-2" role="tablist" aria-label="Practice tools">
      {([{ id: "risk", name: "Position & risk planner", tier: "Basic+", Icon: Calculator }, { id: "audit", name: "Discipline report", tier: "Pro+", Icon: ClipboardCheck }, { id: "stress", name: "Losing-streak stress lab", tier: "Elite", Icon: FlaskConical }] as const).map(t => <Button key={t.id} variant={tool === t.id ? "default" : "outline"} role="tab" aria-selected={tool === t.id} className="h-auto min-h-11 justify-start whitespace-normal py-3" disabled={busy} onClick={() => { setTool(t.id); setResult(null); setError(""); }}><t.Icon className="shrink-0" /><span className="flex-1 text-left">{t.name}</span><span className="text-xs">{t.tier}</span>{!canUsePracticeTool(tier,t.id) ? <Lock className="size-3.5" /> : null}</Button>)}
    </div>
    {!allowed ? <p className="border-l-2 border-primary pl-3 text-sm text-muted-foreground">{tool === "risk" ? "Included with Basic, Pro and Elite." : tool === "audit" ? "Included with Pro and Elite." : "Included with Elite."} Your existing Free tools remain available.</p> : <form onSubmit={submit} className="space-y-4">
      {tool !== "audit" ? <div className="grid grid-cols-2 gap-3">{fields.map(f => <label key={f} className="space-y-1.5 text-xs font-medium">{labels[f]}<Input aria-label={labels[f]} type="number" required min={f === "losses" ? 1 : 0.000001} max={f === "riskPct" ? 10 : f === "losses" ? 50 : 1e9} step={f === "losses" ? 1 : "any"} value={values[f]} onChange={e => setValues(v => ({ ...v, [f]: e.target.value }))} /></label>)}</div> : <p className="text-sm text-muted-foreground">Review your latest 500 closed simulated trades: recorded stops, targets, realized R and a focused next-session checklist.</p>}
      <Button type="submit" disabled={busy} className="w-full"><Calculator />{busy ? "Calculating…" : tool === "audit" ? "Generate my report" : "Calculate scenario"}</Button>
    </form>}
    {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    {result ? <div aria-live="polite" className="space-y-4 border-t pt-4"><h3 className="text-base tracking-normal">{result.title}</h3><dl className="divide-y">{result.metrics.map(m => <div key={m.label} className="flex items-start justify-between gap-4 py-3 text-sm"><dt className="text-muted-foreground">{m.label}</dt><dd className="max-w-[55%] break-words text-right font-semibold tabular-nums">{m.value}</dd></div>)}</dl><ul className="space-y-2">{result.notes.map(n => <li key={n} className="text-xs leading-relaxed text-muted-foreground">{n}</li>)}</ul>{tool === "audit" ? <Button variant="outline" onClick={download}><Download />Download CSV report</Button> : null}</div> : null}
    <p className="text-xs text-muted-foreground">Educational simulation only · no AI credits · no trade execution.</p>
  </section>;
}
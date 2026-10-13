import { featuresForTier, type Tier } from "./plans";

export type PracticeTool = "risk" | "audit" | "stress";
export function canUsePracticeTool(tier: Tier, tool: PracticeTool) {
  const features = featuresForTier(tier);
  return tool === "risk" ? features.riskPlanner : tool === "audit" ? features.disciplineReport : features.stressLab;
}
export type PracticeResult = { title: string; metrics: { label: string; value: string }[]; notes: string[] };
export function riskPlan(balance: number, riskPct: number, entry: number, stop: number, target: number): PracticeResult {
  const distance = Math.abs(entry - stop);
  if (distance === 0 || entry === target || (stop - entry) * (target - entry) >= 0) throw new Error("Stop and target must be on opposite sides of entry.");
  const budget = balance * riskPct / 100;
  const units = Math.floor(Math.min(budget / distance, balance / entry));
  return {
    title: "Position & risk plan",
    metrics: [
      { label: "Risk budget", value: budget.toFixed(2) },
      { label: "Whole units (no leverage)", value: String(units) },
      { label: "Planned stop loss", value: (units * distance).toFixed(2) },
      { label: "Planned target gain", value: (units * Math.abs(target - entry)).toFixed(2) },
      { label: "Reward / risk", value: `${(Math.abs(target - entry) / distance).toFixed(2)} : 1` },
      { label: "Capital required", value: (units * entry).toFixed(2) },
    ],
    notes: ["Amounts use the same currency as your inputs. This sandbox does not place trades or change your virtual balance.", units ? "Whole-unit sizing is capped by your entered capital and risk budget." : "Your inputs do not support one whole unit within both limits.", "Fees, slippage, gaps, leverage and instrument-specific lot sizes are excluded. A stop does not guarantee an exit price."],
  };
}
export type AuditTrade = { symbol: string; realized_pnl: number | null; stop_loss: number | null; take_profit: number | null; entry_price: number; position_size: number; opened_at: string; closed_at: string | null };
export function disciplineAudit(trades: AuditTrade[]): PracticeResult {
  const n = trades.length;
  const protectedCount = trades.filter(t => t.stop_loss !== null).length;
  const planned = trades.filter(t => t.take_profit !== null).length;
  const withRisk = trades.filter(t => t.stop_loss !== null && Math.abs(t.entry_price - Number(t.stop_loss)) > 0);
  const rs = withRisk.map(t => Number(t.realized_pnl ?? 0) / (Math.abs(t.entry_price - Number(t.stop_loss)) * t.position_size)).filter(Number.isFinite);
  const buckets = new Map<string, { n: number; pnl: number }>();
  for (const t of trades) { const b = buckets.get(t.symbol) ?? { n: 0, pnl: 0 }; b.n++; b.pnl += Number(t.realized_pnl ?? 0); buckets.set(t.symbol, b); }
  const most = [...buckets.entries()].sort((a,b) => b[1].n - a[1].n)[0];
  return {
    title: "Personal discipline report",
    metrics: [
      { label: "Closed trades reviewed (latest 500)", value: String(n) },
      { label: "Trades with recorded stop", value: `${protectedCount} / ${n}` },
      { label: "Trades with recorded target", value: `${planned} / ${n}` },
      { label: "Average realized R (eligible trades)", value: rs.length ? `${(rs.reduce((a,b) => a+b,0) / rs.length).toFixed(2)} R` : "Not enough risk data" },
      { label: "Most traded symbol", value: most ? `${most[0]} · ${most[1].n} trades` : "No closed trades yet" },
    ],
    notes: [!n ? "Close simulated trades to populate your personal report." : protectedCount < n ? `${n - protectedCount} trades have no recorded stop. In your next practice session, write your loss limit before entering.` : "Every reviewed trade has a recorded stop. Keep checking position size and gap risk.", planned < n ? "Some trades lack a recorded target. Set an exit objective before your next practice trade." : "Your reviewed trades have recorded targets. Compare actual exits with those plans.", "R uses recorded entry, stop and position size; edited stops can affect the result. This is a rule-based educational review, not financial advice."],
  };
}
export function stressPlan(balance: number, riskPct: number, losses: number): PracticeResult {
  const fixedLoss = balance * riskPct / 100;
  const fixedEnd = Math.max(0, balance - fixedLoss * losses);
  const compoundEnd = balance * Math.pow(1 - riskPct / 100, losses);
  const dd = (balance - compoundEnd) / balance * 100;
  return { title: "Losing-streak stress test", metrics: [
    { label: "Consecutive hypothetical losses", value: String(losses) },
    { label: "Fixed starting-capital risk: ending balance", value: fixedEnd.toFixed(2) },
    { label: "Resized remaining-capital risk: ending balance", value: compoundEnd.toFixed(2) },
    { label: "Resized-risk drawdown", value: `${dd.toFixed(2)}%` },
    { label: "Gain needed to recover (resized risk)", value: `${((balance / compoundEnd - 1) * 100).toFixed(2)}%` },
  ], notes: ["Hypothetical what-if calculation, not market history, a backtest or a prediction.", "Each loss is assumed to equal the selected risk budget. Fees, gaps and slippage are excluded; actual losses can exceed it.", "Compare lower risk percentages to see how position sizing changes drawdown. No virtual funds or XP are awarded."] };
}
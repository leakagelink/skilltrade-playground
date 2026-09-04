import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getCandles, getQuote } from "@/lib/market.functions";
import { closeTrade, getTrades, openTrade } from "@/lib/trading.functions";
import { ProChart } from "@/components/chart/ProChart";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { TIMEFRAMES, type Timeframe } from "@/lib/market/types";
import { money, pct, price, signedMoney } from "@/lib/format";
import { toast } from "sonner";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/chart/$symbol")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.symbol} Chart — PaperEdge Paper Trading` },
      { name: "description", content: `Simulated ${params.symbol} price chart with a practice order ticket. Educational use only.` },
      { property: "og:title", content: `${params.symbol} — PaperEdge` },
      { property: "og:description", content: `Practice trading ${params.symbol} with virtual money.` },
    ],
  }),
  component: ChartPage,
});

function ChartPage() {
  const { symbol } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const loadCandles = useServerFn(getCandles);
  const loadQuote = useServerFn(getQuote);
  const loadTrades = useServerFn(getTrades);
  const open = useServerFn(openTrade);
  const close = useServerFn(closeTrade);

  const [tf, setTf] = useState<Timeframe>("1h");
  const [direction, setDirection] = useState<"BUY" | "SELL">("BUY");
  const [size, setSize] = useState("1000");
  const [sl, setSl] = useState("");
  const [tp, setTp] = useState("");
  const [notes, setNotes] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);

  const chart = useQuery({
    queryKey: ["candles", symbol, tf],
    queryFn: () => loadCandles({ data: { symbol, timeframe: tf } }),
    refetchInterval: 15000,
    refetchIntervalInBackground: true,
    staleTime: 0,
  });

  // Continuous real-price loop: quotes tick every 5s, candles refresh every 15s.
  const tick = useQuery({
    queryKey: ["quote", symbol],
    queryFn: () => loadQuote({ data: { symbol } }),
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
    refetchOnMount: "always",
    staleTime: 0,
  });

  const trades = useQuery({
    queryKey: ["trades"],
    queryFn: () => loadTrades(),
    refetchInterval: 15000,
  });

  const openHere = useMemo(
    () => (trades.data?.trades ?? []).filter((t) => t.status === "OPEN" && t.symbol === symbol),
    [trades.data, symbol],
  );

  const quote = tick.data ?? chart.data?.quote;
  const livePrice = quote?.price ?? null;
  const prevPriceRef = useRef<number | null>(null);
  const [tickDelta, setTickDelta] = useState(0);

  useEffect(() => {
    if (livePrice == null) return;
    const prev = prevPriceRef.current;
    if (prev != null && prev !== livePrice) setTickDelta(livePrice - prev);
    prevPriceRef.current = livePrice;
  }, [livePrice]);


  useEffect(() => {
    if (quote && !sl && !tp) {
      const p = quote.price;
      setSl((direction === "BUY" ? p * 0.98 : p * 1.02).toFixed(2));
      setTp((direction === "BUY" ? p * 1.04 : p * 0.96).toFixed(2));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quote?.price, direction]);

  const openMutation = useMutation({
    mutationFn: () =>
      open({
        data: {
          symbol,
          direction,
          positionSize: Number(size),
          stopLoss: sl ? Number(sl) : null,
          takeProfit: tp ? Number(tp) : null,
          notes: notes || null,
        },
      }),
    onSuccess: (r) => {
      toast.success(`Simulated ${direction} opened at ${price(r.entryPrice)}.`);
      setSheetOpen(false);
      setNotes("");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message || "Could not open this trade."),
  });

  const closeMutation = useMutation({
    mutationFn: (tradeId: string) => close({ data: { tradeId } }),
    onSuccess: () => {
      toast.success("Trade closed. Review added to your history.");
      qc.invalidateQueries();
      navigate({ to: "/profile" });
    },
    onError: (e: Error) => toast.error(e.message || "Could not close this trade."),
  });

  return (
    <main className="pb-6">
      <AppHeader
        title={`${symbol}/USD`}
        subtitle={quote ? `${price(quote.price)} · ${pct(quote.changePercent)}` : "Loading price…"}
        back="/trade"
      />

      <div className="space-y-4 p-5">
        {quote ? (
          <div className="surface-card flex items-center justify-between p-4">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Live price</p>
              <p
                className={`num text-2xl font-bold transition-colors ${
                  tickDelta > 0 ? "text-bull" : tickDelta < 0 ? "text-bear" : "text-foreground"
                }`}
              >
                {price(quote.price)}
              </p>
              <p className="num text-[11px] text-muted-foreground">
                Tick {tickDelta === 0 ? "—" : `${tickDelta > 0 ? "+" : ""}${tickDelta.toFixed(4)}`}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Momentum (24h)</p>
              <span
                className={`num mt-1 inline-flex items-center gap-1 rounded-full px-2 py-1 text-sm font-bold ${
                  quote.changePercent >= 0 ? "bg-bull/12 text-bull" : "bg-bear/12 text-bear"
                }`}
              >
                {quote.changePercent >= 0 ? (
                  <ArrowUpRight className="size-4" />
                ) : (
                  <ArrowDownRight className="size-4" />
                )}
                {pct(quote.changePercent)}
              </span>
            </div>
          </div>
        ) : null}


        <div className="surface-card overflow-hidden p-2">
          {chart.isLoading || !chart.data ? (
            <Skeleton className="h-[380px] w-full rounded-xl" />
          ) : (
            <ProChart symbol={symbol} candles={chart.data.candles} height={380} livePrice={livePrice} />
          )}
          <div className="flex gap-1 px-1 pb-1 pt-2">
            {TIMEFRAMES.map((t) => (
              <button
                key={t.value}
                onClick={() => setTf(t.value)}
                className={`flex-1 rounded-lg py-1.5 text-[11px] font-semibold transition-colors ${
                  tf === t.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {quote ? (
          <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
            <span
              className={`inline-block size-1.5 rounded-full ${
                quote.status === "SIMULATED" ? "bg-muted-foreground" : "animate-pulse bg-bull"
              }`}
            />
            {quote.status === "SIMULATED"
              ? "Simulated market data — live feed unavailable right now."
              : quote.status === "LIVE"
                ? "Live crypto market data (Coinbase). Trades are simulated — no real money involved."
                : "Real market data, ~15 min delayed (Yahoo Finance). Trades are simulated — no real money involved."}
          </p>
        ) : null}


        {openHere.length ? (
          <div className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Your open positions
            </h2>
            {openHere.map((t) => {
              const entry = Number(t.entry_price);
              const notional = Number(t.position_size);
              const pnl =
                livePrice && entry > 0
                  ? ((livePrice - entry) / entry) * notional * (t.direction === "BUY" ? 1 : -1)
                  : Number(t.unrealized_pnl ?? 0);
              return (
                <div key={t.id} className="surface-card flex items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">
                      {t.direction} · {money(Number(t.position_size))}
                    </p>
                    <p className="num text-xs text-muted-foreground">
                      Entry {price(entry)}
                      {livePrice ? ` · Now ${price(livePrice)}` : ""}
                    </p>
                  </div>
                  <p className={`num text-sm font-semibold ${pnl >= 0 ? "text-bull" : "text-bear"}`}>
                    {signedMoney(pnl)}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-lg"
                    disabled={closeMutation.isPending}
                    onClick={() => closeMutation.mutate(t.id)}
                  >
                    Close
                  </Button>
                </div>
              );
            })}
          </div>
        ) : null}

        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <div className="fixed inset-x-0 bottom-16 z-30 mx-auto flex max-w-lg gap-3 border-t border-border bg-background/95 p-4 backdrop-blur">
            <SheetTrigger asChild>
              <Button
                className="h-12 flex-1 rounded-xl bg-bull text-base font-semibold text-background hover:bg-bull/90"
                onClick={() => setDirection("BUY")}
              >
                <ArrowUpRight className="size-4" /> BUY
              </Button>
            </SheetTrigger>
            <SheetTrigger asChild>
              <Button
                className="h-12 flex-1 rounded-xl bg-bear text-base font-semibold text-background hover:bg-bear/90"
                onClick={() => setDirection("SELL")}
              >
                <ArrowDownRight className="size-4" /> SELL
              </Button>
            </SheetTrigger>
          </div>

          <SheetContent side="bottom" className="mx-auto max-w-lg rounded-t-3xl">
            <SheetHeader>
              <SheetTitle>
                {direction} {symbol} — simulated order
              </SheetTitle>
              {livePrice ? (
                <p className="num text-left text-xs text-muted-foreground">
                  Live price {price(livePrice)} · order fills at the latest market price
                </p>
              ) : null}
            </SheetHeader>
            <div className="space-y-4 overflow-y-auto px-4 pb-6">
              <div>
                <Label htmlFor="size">Position size (USD)</Label>
                <Input
                  id="size"
                  inputMode="decimal"
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  className="mt-1.5 h-12 rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="sl">Stop loss</Label>
                  <Input id="sl" inputMode="decimal" value={sl} onChange={(e) => setSl(e.target.value)} className="mt-1.5 h-12 rounded-xl" />
                </div>
                <div>
                  <Label htmlFor="tp">Take profit</Label>
                  <Input id="tp" inputMode="decimal" value={tp} onChange={(e) => setTp(e.target.value)} className="mt-1.5 h-12 rounded-xl" />
                </div>
              </div>
              <div>
                <Label htmlFor="notes">Why are you taking this trade? (optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Setup, reasoning, risk plan…"
                  className="mt-1.5 rounded-xl"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Opening a trade costs 1 Trading Credit. All trades are simulated with virtual money.
              </p>
              <Button
                className="h-12 w-full rounded-xl text-base font-semibold"
                disabled={openMutation.isPending}
                onClick={() => openMutation.mutate()}
              >
                Confirm simulated {direction}
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        <div className="h-16" />
      </div>
    </main>
  );
}

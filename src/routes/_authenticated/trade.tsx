import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getQuotes } from "@/lib/market.functions";
import { CATALOG } from "@/lib/market/catalog";
import { AppHeader } from "@/components/AppHeader";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/EmptyState";
import { DisclaimerNote } from "@/components/Disclaimer";
import { Search, SearchX, ChevronRight, TrendingUp, TrendingDown } from "lucide-react";
import { pct, price } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/trade")({
  head: () => ({
    meta: [
      { title: "Markets — TradeVirt Paper Trading" },
      { name: "description", content: "Browse and search supported stocks and crypto assets for simulated paper trading." },
      { property: "og:title", content: "Markets — TradeVirt" },
      { property: "og:description", content: "Browse supported stocks and crypto for simulated trading." },
    ],
  }),
  component: TradePage,
});

function TradePage() {
  const loadQuotes = useServerFn(getQuotes);
  const symbols = useMemo(() => CATALOG.map((asset) => asset.symbol), []);
  // Continuous real-price loop for the markets list.
  const quotes = useQuery({
    queryKey: ["quotes", symbols],
    queryFn: () => loadQuotes({ data: { symbols, requestId: Date.now() } }),
    enabled: symbols.length > 0,
    refetchInterval: 1000,
    refetchIntervalInBackground: true,
    refetchOnMount: "always",
    staleTime: 0,
  });
  const quoteBy = useMemo(
    () => new Map((quotes.data?.quotes ?? []).map((q) => [q.symbol, q])),
    [quotes.data],
  );
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"ALL" | "STOCK" | "CRYPTO">("ALL");
  const previousPrices = useRef(new Map<string, number>());
  const [tickMoves, setTickMoves] = useState(new Map<string, number>());

  useEffect(() => {
    const nextMoves = new Map<string, number>();
    for (const quote of quotes.data?.quotes ?? []) {
      const previous = previousPrices.current.get(quote.symbol);
      if (previous != null && previous !== quote.price) nextMoves.set(quote.symbol, quote.price - previous);
      previousPrices.current.set(quote.symbol, quote.price);
    }
    if (nextMoves.size > 0) setTickMoves((current) => new Map([...current, ...nextMoves]));
  }, [quotes.data]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return CATALOG.filter(
      (a) =>
        (tab === "ALL" || a.assetType === tab) &&
        (!needle || a.name.toLowerCase().includes(needle) || a.symbol.toLowerCase().includes(needle)),
    );
  }, [q, tab]);

  return (
    <main>
      <AppHeader title="Markets" subtitle="Live prices · simulated trading only" showSettings />

      <div className="space-y-4 p-5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search Bitcoin, BTC, Apple, AAPL…"
            className="h-12 rounded-2xl border-border bg-surface pl-9 shadow-[0_10px_24px_-22px_oklch(0.4_0.08_258/60%)]"
          />
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className="grid h-11 w-full grid-cols-3 rounded-2xl bg-secondary p-1">
            <TabsTrigger value="ALL">All</TabsTrigger>
            <TabsTrigger value="STOCK">Stocks</TabsTrigger>
            <TabsTrigger value="CRYPTO">Crypto</TabsTrigger>
          </TabsList>
        </Tabs>

        {filtered.length === 0 ? (
          <EmptyState icon={SearchX} title="No assets found." description="Try a different name or symbol." />
        ) : (
          <ul className="space-y-2">
            {filtered.map((a) => (
              <li key={a.symbol}>
                <Link
                  to="/chart/$symbol"
                  params={{ symbol: a.symbol }}
                  className="bento-tile bento-tile-interactive flex items-center gap-3 p-3.5"
                >
                  <div className="brand-gradient flex h-11 min-w-11 shrink-0 items-center justify-center rounded-2xl px-2 text-[11px] font-extrabold tracking-tight">
                    {a.symbol}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="num truncate text-sm font-bold text-foreground">{a.symbol}</p>
                    <p className="truncate text-xs text-muted-foreground">{a.name}</p>
                  </div>
                  {quoteBy.get(a.symbol) ? (
                    (() => {
                      const qd = quoteBy.get(a.symbol)!;
                       const tickMove = tickMoves.get(a.symbol) ?? 0;
                       const up = tickMove !== 0 ? tickMove > 0 : qd.changePercent >= 0;
                      return (
                        <div className="flex flex-col items-end gap-1">
                          <p className="num text-sm font-semibold">{price(qd.price)}</p>
                           {a.assetType === "STOCK" && qd.marketState === "CLOSED" ? (
                             <span className="text-[10px] font-medium text-muted-foreground">Market closed</span>
                           ) : null}
                          <span
                            className={`num inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
                              up ? "bg-bull/12 text-bull" : "bg-bear/12 text-bear"
                            }`}
                          >
                            {up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                             {tickMove === 0
                               ? pct(qd.changePercent)
                               : `${tickMove > 0 ? "+" : ""}${tickMove.toFixed(qd.price < 10 ? 4 : 2)}`}
                          </span>
                        </div>
                      );
                    })()
                  ) : (
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                      {a.assetType}
                    </span>
                  )}

                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        )}

        <DisclaimerNote />
      </div>
    </main>
  );
}

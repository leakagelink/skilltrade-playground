import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getQuotes } from "@/lib/market.functions";
import { CATALOG } from "@/lib/market/catalog";
import { AppHeader } from "@/components/AppHeader";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/EmptyState";
import { DisclaimerNote } from "@/components/Disclaimer";
import { Search, SearchX, ChevronRight } from "lucide-react";
import { pct, price } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/trade")({
  head: () => ({
    meta: [
      { title: "Markets — PaperEdge Paper Trading" },
      { name: "description", content: "Browse and search supported stocks and crypto assets for simulated paper trading." },
      { property: "og:title", content: "Markets — PaperEdge" },
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
    queryFn: () => loadQuotes({ data: { symbols } }),
    enabled: symbols.length > 0,
    refetchInterval: 10000,
    refetchIntervalInBackground: false,
  });
  const quoteBy = useMemo(
    () => new Map((quotes.data?.quotes ?? []).map((q) => [q.symbol, q])),
    [quotes.data],
  );
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"ALL" | "STOCK" | "CRYPTO">("ALL");

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
            className="h-12 rounded-xl pl-9"
          />
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className="grid w-full grid-cols-3">
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
                  className="surface-card flex items-center gap-3 p-4 transition-colors active:bg-elevated"
                >
                  <div className="flex size-10 items-center justify-center rounded-xl bg-primary/12 text-xs font-bold text-primary">
                    {a.symbol.slice(0, 3)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{a.name}</p>
                    <p className="num text-xs text-muted-foreground">{a.displaySymbol}</p>
                  </div>
                  {quoteBy.get(a.symbol) ? (
                    <div className="text-right">
                      <p className="num text-sm font-semibold">{price(quoteBy.get(a.symbol)!.price)}</p>
                      <p
                        className={`num text-[11px] ${
                          quoteBy.get(a.symbol)!.changePercent >= 0 ? "text-bull" : "text-bear"
                        }`}
                      >
                        {pct(quoteBy.get(a.symbol)!.changePercent)}
                      </p>
                    </div>
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

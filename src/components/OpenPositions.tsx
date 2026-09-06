import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { closeTrade } from "@/lib/trading.functions";
import { getQuotes } from "@/lib/market.functions";
import { catalogEntry } from "@/lib/market/catalog";
import { AssetLogo } from "@/components/AssetLogo";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { money, price, signedMoney } from "@/lib/format";
import { Loader2, History, TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { trackEvent } from "@/lib/analytics";

export type OpenTrade = {
  id: string;
  symbol: string;
  direction: string;
  entry_price: number | string;
  position_size: number | string;
  unrealized_pnl: number | string | null;
  current_price?: number | string | null;
  stop_loss?: number | string | null;
  take_profit?: number | string | null;
};

function livePnl(direction: string, entry: number, current: number, size: number) {
  const units = size / entry;
  const diff = direction === "BUY" ? current - entry : entry - current;
  return Math.round(units * diff * 100) / 100;
}

/**
 * Live open-position list with a working close action. Prices refresh on the
 * same cadence as the markets screen so P&L keeps moving while a trade is open.
 */
export function OpenPositions({ trades, emptyText }: { trades: OpenTrade[]; emptyText?: string }) {
  const qc = useQueryClient();
  const loadQuotes = useServerFn(getQuotes);
  const close = useServerFn(closeTrade);
  const [closingId, setClosingId] = useState<string | null>(null);

  const symbols = useMemo(() => Array.from(new Set(trades.map((t) => t.symbol))), [trades]);
  const hasCrypto = symbols.some((s) => catalogEntry(s)?.assetType === "CRYPTO");

  const quotes = useQuery({
    queryKey: ["quotes", "positions", symbols],
    queryFn: () => loadQuotes({ data: { symbols, requestId: Date.now() } }),
    enabled: symbols.length > 0,
    refetchInterval: hasCrypto ? 1_000 : 3_000,
    refetchIntervalInBackground: true,
    staleTime: hasCrypto ? 750 : 2_000,
  });

  const priceBy = useMemo(() => {
    const map = new Map<string, number>();
    for (const q of quotes.data?.quotes ?? []) map.set(q.symbol, q.price);
    return map;
  }, [quotes.data]);

  const closeMutation = useMutation({
    mutationFn: (tradeId: string) => close({ data: { tradeId } }),
    onMutate: (tradeId: string) => setClosingId(tradeId),
    onSuccess: (r) => {
      toast.success(`Trade closed at ${price(r.exitPrice)} · ${signedMoney(r.pnl)} simulated P&L.`);
      void trackEvent("trade_closed", {});
      void qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message || "Could not close this trade."),
    onSettled: () => setClosingId(null),
  });

  if (trades.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="No open trades"
        description={emptyText ?? "Your active simulated positions appear here."}
      />
    );
  }

  return (
    <ul className="space-y-2">
      {trades.map((t) => {
        const entry = Number(t.entry_price);
        const size = Number(t.position_size);
        const current = priceBy.get(t.symbol) ?? (t.current_price != null ? Number(t.current_price) : null);
        const pnl = current != null ? livePnl(t.direction, entry, current, size) : Number(t.unrealized_pnl ?? 0);
        const up = pnl >= 0;
        const busy = closingId === t.id && closeMutation.isPending;

        return (
          <li key={t.id} className="bento-tile space-y-3 p-3.5">
            <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
              <AssetLogo
                symbol={t.symbol}
                assetType={catalogEntry(t.symbol)?.assetType ?? "STOCK"}
                size={38}
              />
              <div className="min-w-0">
                <p className="num truncate text-sm font-bold">
                  {t.symbol} · {t.direction}
                </p>
                <p className="num truncate text-[11px] text-muted-foreground">
                  Entry {price(entry)} · {money(size)}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="num whitespace-nowrap text-sm font-semibold">
                  {current == null ? "—" : price(current)}
                </p>
                <span
                  className={`num mt-0.5 inline-flex items-center gap-0.5 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
                    up ? "bg-bull/12 text-bull" : "bg-bear/12 text-bear"
                  }`}
                >
                  {up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                  {signedMoney(pnl)}
                </span>
              </div>
            </div>

            <Button
              variant="secondary"
              className="h-10 w-full rounded-xl text-xs font-semibold"
              disabled={busy}
              onClick={() => closeMutation.mutate(t.id)}
            >
              {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Close position at market price
            </Button>
          </li>
        );
      })}
    </ul>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { getPublicTraderCard, type TraderCard } from "@/lib/social.functions";

/**
 * Public, shareable Trader Card (V3, spec section 24).
 *
 * Shows only non-sensitive, opt-in simulated performance data. It is a
 * top-level public route so shared links work for anyone. The card never
 * shows email, mobile number, full name, private journal notes or the
 * hypothetical starting capital, and it never presents itself as proof of
 * real trading performance.
 */
export const Route = createFileRoute("/trader/$username")({
  head: ({ match }) => {
    const username = match.params.username ?? "Trader";
    return {
      meta: [
        { title: `${username} — Trader Card — TradeVirt` },
        {
          name: "description",
          content: "Shareable simulated-performance trader card from TradeVirt, the educational paper trading app.",
        },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
        { property: "og:title", content: `${username} — Trader Card — TradeVirt` },
        {
          property: "og:description",
          content: "Simulated trading performance — practice only, never real money.",
        },
        { name: "twitter:title", content: `${username} — Trader Card — TradeVirt` },
        {
          name: "twitter:description",
          content: "Simulated trading performance — practice only, never real money.",
        },
      ],
    };
  },
  loader: async ({ params }) => {
    const card = await getPublicTraderCard({ data: { username: params.username } });
    return { card };
  },
  component: TraderCardPage,
});

function TraderCardPage() {
  const loadCard = useServerFn(getPublicTraderCard);
  void loadCard; // card data comes from the loader
  const { card } = Route.useLoaderData() as { card: TraderCard };

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md p-5">
      <div className="flex items-center justify-between py-3">
        <Link to="/" className="text-sm font-extrabold tracking-tight">
          TradeVirt
        </Link>
        <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Simulated practice
        </span>
      </div>

      {!card.visible ? (
        <div className="surface-card mt-16 space-y-3 p-8 text-center">
          <p className="text-lg font-bold">This profile is private</p>
          <p className="text-sm text-muted-foreground">
            Traders choose whether their card is public. Email, phone number and private
            trades are never shared either way.
          </p>
          <Link to="/" className="mt-2 inline-block text-sm font-semibold text-primary underline-offset-4 hover:underline">
            Open TradeVirt
          </Link>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="brand-gradient brand-shadow relative overflow-hidden rounded-[28px] p-6 text-center">
            <div className="pointer-events-none absolute -right-14 -top-16 size-48 rounded-full bg-primary-foreground/15 blur-2xl" />
            <div className="relative space-y-2">
              <div className="mx-auto flex size-16 items-center justify-center rounded-3xl bg-primary-foreground/20 text-2xl font-extrabold">
                {card.username?.slice(0, 1).toUpperCase()}
              </div>
              <p className="truncate text-xl font-extrabold tracking-tight">{card.username}</p>
              <p className="text-xs opacity-85">
                Level {card.level}
                {card.country ? ` · ${card.country}` : ""}
              </p>
            </div>
          </div>

          <div className="bento-tile grid grid-cols-2 gap-x-3 gap-y-4 p-4 text-center">
            <CardStat label="Trading Skill Score" value={String(card.skillScore ?? 0)} />
            <CardStat label="XP" value={String(card.xp ?? 0)} />
            <CardStat label="Followers" value={String(card.followers ?? 0)} />
            <CardStat label="Following" value={String(card.following ?? 0)} />
            <CardStat label="Simulated trades" value={String(card.tradesSimulated ?? 0)} />
            <CardStat label="Challenges completed" value={String(card.challengesCompleted ?? 0)} />
          </div>

          {card.badges && card.badges.length > 0 ? (
            <div className="bento-tile space-y-2 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Badges</p>
              <div className="flex flex-wrap gap-1.5">
                {card.badges.map((b) => (
                  <span key={b} className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-primary">
                    {b}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {card.learningMode || (card.markets && card.markets.length > 0) ? (
            <div className="bento-tile space-y-2 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Practice focus</p>
              <p className="text-xs text-muted-foreground">
                {card.learningMode ? `${card.learningMode} mode` : ""}
                {card.learningMode && card.markets && card.markets.length > 0 ? " · " : ""}
                {card.markets && card.markets.length > 0 ? card.markets.join(", ") : ""}
              </p>
            </div>
          ) : null}

          <div className="rounded-2xl border border-border bg-secondary/50 p-4 text-center">
            <p className="text-xs font-bold uppercase tracking-wide text-primary">
              TradeVirt simulated performance
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
              This card shows practice results in a paper trading simulator with virtual funds.
              It is not proof of real trading performance and is not financial advice.
            </p>
          </div>

          <Link
            to="/"
            className="surface-card flex items-center justify-between gap-3 p-4"
          >
            <div>
              <p className="text-sm font-bold">Practice trading yourself</p>
              <p className="text-[11px] text-muted-foreground">
                Free educational simulator — $100,000 virtual credits, never real money.
              </p>
            </div>
            <span className="shrink-0 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">
              Open
            </span>
          </Link>
        </div>
      )}
    </main>
  );
}

function CardStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="num break-words text-sm font-semibold">{value}</p>
      <p className="truncate text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

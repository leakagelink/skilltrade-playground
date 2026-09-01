/**
 * Educational trade review. Rule-based by default; a real AI provider can be
 * plugged in later behind the same interface. This is NOT financial advice and
 * never tells the user what to buy or sell.
 */

export interface TradeReviewInput {
  direction: "BUY" | "SELL";
  entryPrice: number;
  exitPrice: number;
  positionSize: number;
  stopLoss: number | null;
  takeProfit: number | null;
  realizedPnl: number;
  virtualBalance: number;
}

export interface TradeAnalysisService {
  readonly id: string;
  review(input: TradeReviewInput): Promise<string[]>;
}

export const ruleBasedAnalysis: TradeAnalysisService = {
  id: "rule-based",
  async review(t) {
    const notes: string[] = [];

    if (t.stopLoss == null) {
      notes.push(
        "No stop loss was set on this trade. A predefined exit level is one of the simplest ways to keep a single mistake small.",
      );
    } else {
      const riskAmount = (Math.abs(t.entryPrice - t.stopLoss) / t.entryPrice) * t.positionSize;
      const riskPct = (riskAmount / Math.max(t.virtualBalance, 1)) * 100;
      if (riskPct <= 2) {
        notes.push(
          `Your stop loss limited downside risk to roughly ${riskPct.toFixed(2)}% of your virtual balance — that is disciplined position sizing.`,
        );
      } else {
        notes.push(
          `This position risked around ${riskPct.toFixed(2)}% of your virtual balance. Many practice frameworks keep single-trade risk under 2%.`,
        );
      }
    }

    if (t.stopLoss != null && t.takeProfit != null) {
      const risk = Math.abs(t.entryPrice - t.stopLoss);
      const reward = Math.abs(t.takeProfit - t.entryPrice);
      const rr = risk > 0 ? reward / risk : 0;
      if (rr >= 2) notes.push(`Planned risk/reward was about 1:${rr.toFixed(2)} — a strong structural setup.`);
      else if (rr >= 1) notes.push(`Planned risk/reward was about 1:${rr.toFixed(2)}. Consider whether the target justified the risk taken.`);
      else notes.push(`This trade had a low risk/reward ratio (about 1:${rr.toFixed(2)}), meaning it risked more than it aimed to gain.`);
    } else if (t.takeProfit == null) {
      notes.push("No take profit was defined, so the exit was discretionary rather than planned in advance.");
    }

    const sizePct = (t.positionSize / Math.max(t.virtualBalance, 1)) * 100;
    if (sizePct > 50) {
      notes.push(`Position size was ${sizePct.toFixed(0)}% of your virtual balance — concentrated exposure amplifies both outcomes.`);
    }

    notes.push(
      t.realizedPnl >= 0
        ? "Outcome: this simulated trade closed positive. Review whether the process, not just the result, was repeatable."
        : "Outcome: this simulated trade closed negative. A losing trade that followed your plan can still be a well-executed trade.",
    );

    notes.push("Educational analysis of simulated trading only. This is not financial or investment advice.");
    return notes;
  },
};

export function getTradeAnalysisService(): TradeAnalysisService {
  // An AI-backed implementation can be selected here once configured.
  return ruleBasedAnalysis;
}

import { describe, expect, it } from "vitest";
import { canUsePracticeTool, disciplineAudit, riskPlan, stressPlan } from "./practice-benefits";
import { pickTier } from "./plans";

describe("additive paid practice tools", () => {
  it("enforces each tier", () => {
    expect(["risk", "audit", "stress"].map(t => canUsePracticeTool("free", t as "risk" | "audit" | "stress"))).toEqual([false,false,false]);
    expect(canUsePracticeTool("basic", "risk")).toBe(true);
    expect(canUsePracticeTool("basic", "audit")).toBe(false);
    expect(canUsePracticeTool("pro", "audit")).toBe(true);
    expect(canUsePracticeTool("pro", "stress")).toBe(false);
    expect(canUsePracticeTool("elite", "stress")).toBe(true);
  });
  it("expired, pending and revoked subscriptions cannot use tools", () => {
    for (const status of ["SUBSCRIPTION_STATE_EXPIRED", "SUBSCRIPTION_STATE_PENDING", "SUBSCRIPTION_STATE_REVOKED"]) {
      const tier = pickTier([{product_id:"tradevirt_elite",status,expires_at:"2099-01-01"}]);
      expect(canUsePracticeTool(tier,"risk")).toBe(false);
    }
    expect(canUsePracticeTool(pickTier([{product_id:"tradevirt_elite",status:"SUBSCRIPTION_STATE_ACTIVE",expires_at:"2000-01-01"}]),"stress")).toBe(false);
  });
  it("sizes positions from risk and capital and supports sell-side plans", () => {
    const result = riskPlan(100000,1,100,95,110);
    expect(result.metrics.find(m => m.label === "Whole units (no leverage)")?.value).toBe("200");
    expect(result.metrics.find(m => m.label === "Reward / risk")?.value).toBe("2.00 : 1");
    expect(riskPlan(100,10,100,99,102).metrics[1]?.value).toBe("1");
    expect(riskPlan(100000,1,100,105,90).metrics[4]?.value).toBe("2.00 : 1");
    expect(() => riskPlan(100,1,100,100,110)).toThrow();
    expect(() => riskPlan(100,1,100,105,110)).toThrow();
  });
  it("reports actual recorded risk without fabricating empty results", () => {
    expect(disciplineAudit([]).metrics[3]?.value).toBe("Not enough risk data");
    const report = disciplineAudit([{symbol:"TEST",realized_pnl:100,stop_loss:95,take_profit:110,entry_price:100,position_size:10,opened_at:"2026-01-01",closed_at:"2026-01-02"}]);
    expect(report.metrics[3]?.value).toBe("2.00 R");
  });
  it("calculates fixed and resized risk separately", () => {
    const report = stressPlan(100000,1,10);
    expect(report.metrics[1]?.value).toBe("90000.00");
    expect(report.metrics[2]?.value).toBe("90438.21");
    expect(report.metrics[3]?.value).toBe("9.56%");
    expect(report.notes[0]).toContain("not market history");
  });
});
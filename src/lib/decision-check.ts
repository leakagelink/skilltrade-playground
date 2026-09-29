const KEY = "tv_decision_check_enabled";

export function isDecisionCheckEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(KEY) === "1";
}

export function setDecisionCheckEnabled(on: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, on ? "1" : "0");
}

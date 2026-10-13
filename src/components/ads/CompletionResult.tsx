import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useInterstitialContinue } from "@/lib/ads/useInterstitial";
import type { InterstitialPlacement } from "@/lib/ads/config";

export function CompletionResult({ result, onClose }: {
  result: { title: string; description: string; placement: InterstitialPlacement } | null;
  onClose: () => void;
}) {
  const showAdThenContinue = useInterstitialContinue();
  const [busy, setBusy] = useState(false);
  async function continueFromResult() {
    if (!result || busy) return;
    setBusy(true);
    await showAdThenContinue(result.placement, onClose);
    setBusy(false);
  }
  return (
    <Dialog open={!!result} onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
      <DialogContent className="w-[calc(100%-2rem)] rounded-lg">
        <DialogTitle>{result?.title}</DialogTitle>
        <DialogDescription>{result?.description}</DialogDescription>
        <Button disabled={busy} onClick={() => void continueFromResult()}>Continue</Button>
      </DialogContent>
    </Dialog>
  );
}
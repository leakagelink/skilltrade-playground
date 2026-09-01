import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { grantRewardedAdCredit } from "@/lib/trading.functions";
import { getRewardedAdProvider } from "@/lib/ads/rewarded-ad";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PlayCircle } from "lucide-react";
import { toast } from "sonner";

export function RewardedAdButton({ label = "Watch Ad for +1 Credit" }: { label?: string }) {
  const qc = useQueryClient();
  const grant = useServerFn(grantRewardedAdCredit);
  const [open, setOpen] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const provider = getRewardedAdProvider();

  async function watch() {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    setOpen(true);
    try {
      const result = await provider.show(auth.user.id, setSeconds);
      if (!result.completed) throw new Error("Ad was not completed.");
      const res = await grant({
        data: { completionToken: result.completionToken, providerId: result.providerId },
      });
      toast.success(`+${res.granted} Trading Credit added.`);
      qc.invalidateQueries();
    } catch (e) {
      toast.error((e as Error).message || "Reward could not be granted.");
    } finally {
      setOpen(false);
      setSeconds(0);
    }
  }

  return (
    <>
      <Button variant="outline" className="h-11 w-full rounded-xl" onClick={watch}>
        <PlayCircle className="size-4" /> {label}
      </Button>
      <Dialog open={open} onOpenChange={() => {}}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-center text-base">Rewarded advertisement</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="num text-4xl font-bold text-primary">{seconds || "✓"}</div>
            <p className="text-center text-xs text-muted-foreground">
              {provider.isTestMode
                ? "TEST MODE — no real ad network is configured yet. Your reward is granted only after the server verifies completion."
                : "Your reward will be granted once the advertisement completes."}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { completeRewardedAd, getAdStatus, startRewardedAd } from "@/lib/ads.functions";
import {
  AD_DISCLOSURE,
  AD_LIMIT_MESSAGE,
  AD_UNAVAILABLE_MESSAGE,
  REWARD_BY_PLACEMENT,
  type RewardedPlacement,
} from "@/lib/ads/config";
import { adsAvailable, preloadRewarded, showRewardedAd } from "@/lib/ads/admob-bridge";

export function useAdStatus() {
  const load = useServerFn(getAdStatus);
  return useQuery({ queryKey: ["ad-status"], queryFn: () => load(), staleTime: 30_000 });
}

/**
 * Optional rewarded ad offer. Renders nothing when ads are not available on
 * this device or the daily limit is reached, so it can never block a flow.
 */
export function RewardedAdOffer({
  placement,
  title,
  onGranted,
}: {
  placement: RewardedPlacement;
  title: string;
  onGranted?: () => void;
}) {
  const [supported, setSupported] = useState(false);
  const status = useAdStatus();
  const qc = useQueryClient();
  const start = useServerFn(startRewardedAd);
  const complete = useServerFn(completeRewardedAd);

  useEffect(() => {
    let alive = true;
    void adsAvailable().then((ok) => {
      if (!alive) return;
      setSupported(ok);
      if (ok) void preloadRewarded();
    });
    return () => {
      alive = false;
    };
  }, []);

  const watch = useMutation({
    mutationFn: async () => {
      const opened = await start({ data: { placement } });
      const earned = await showRewardedAd();
      if (!earned) throw new Error(AD_UNAVAILABLE_MESSAGE);
      return complete({ data: { nonce: opened.nonce } });
    },
    onSuccess: (res) => {
      toast.success(res.message);
      void qc.invalidateQueries({ queryKey: ["ad-status"] });
      onGranted?.();
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : AD_LIMIT_MESSAGE;
      toast.message(msg);
    },
  });

  if (!supported) return null;
  if (!status.data?.adsEnabled || !status.data.rewardedEnabled) return null;
  if (!status.data.available[placement]) return null;

  const reward = REWARD_BY_PLACEMENT[placement];

  return (
    <section className="bento-tile space-y-2 p-4">
      <h2 className="text-sm font-bold">{title}</h2>
      <p className="text-xs text-muted-foreground">
        Watch a short ad to unlock {reward.label}. This is completely optional.
      </p>
      <Button size="sm" disabled={watch.isPending} onClick={() => watch.mutate()}>
        {watch.isPending ? "Loading ad…" : `Watch ad — ${reward.label}`}
      </Button>
      <p className="text-[11px] text-muted-foreground">{AD_DISCLOSURE}</p>
    </section>
  );
}

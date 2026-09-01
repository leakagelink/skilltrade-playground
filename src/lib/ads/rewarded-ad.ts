/** Client-side rewarded advertisement abstraction. */

export interface RewardedAdResult {
  completed: boolean;
  providerId: string;
  /** Opaque token the server verifies before granting any reward. */
  completionToken: string;
}

export interface RewardedAdProvider {
  readonly id: string;
  readonly isTestMode: boolean;
  isAvailable(): boolean;
  show(userId: string, onProgress?: (secondsLeft: number) => void): Promise<RewardedAdResult>;
}

/** TEST MODE ONLY — simulates a rewarded ad. No real ad network is involved. */
export const testRewardedAdProvider: RewardedAdProvider = {
  id: "test",
  isTestMode: true,
  isAvailable: () => true,
  async show(userId, onProgress) {
    const duration = 5;
    for (let s = duration; s > 0; s--) {
      onProgress?.(s);
      await new Promise((r) => setTimeout(r, 1000));
    }
    onProgress?.(0);
    return { completed: true, providerId: "test", completionToken: `test:${userId}:${Date.now()}` };
  },
};

export function getRewardedAdProvider(): RewardedAdProvider {
  return testRewardedAdProvider;
}

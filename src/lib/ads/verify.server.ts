/**
 * Server-side rewarded-ad verification hook.
 *
 * In production a real ad network posts a signed server-to-server callback (SSV)
 * which is verified here before any credit is granted. Until an ad provider is
 * configured, TEST MODE accepts the locally generated completion token so the
 * flow can be exercised in development. Credits are never granted by the client.
 */
export async function verifyAdCompletion(
  providerId: string,
  token: string,
  userId: string,
): Promise<boolean> {
  const configured = process.env["AD_PROVIDER"];

  if (!configured || configured === "test") {
    // TEST MODE ONLY — no real ad network is configured.
    return providerId === "test" && token.startsWith(`test:${userId}:`);
  }

  // Real provider verification (signature / SSV callback lookup) goes here.
  return false;
}

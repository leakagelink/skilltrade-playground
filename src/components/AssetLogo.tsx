import { useEffect, useState } from "react";
import type { AssetType } from "@/lib/market/types";

const TOKEN = import.meta.env["VITE_LOVABLE_CONNECTOR_LOGO_DEV_API_KEY"] as string | undefined;

interface AssetLogoProps {
  symbol: string;
  assetType: AssetType;
  name?: string | undefined;
  className?: string | undefined;
  size?: number | undefined;
}

/** Company / coin logo with a branded initials fallback. */
export function AssetLogo({ symbol, assetType, name, className = "", size = 44 }: AssetLogoProps) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [symbol]);

  const path = assetType === "CRYPTO" ? `crypto/${symbol}` : `ticker/${symbol}`;
  const src = TOKEN
    ? `https://img.logo.dev/${path}?token=${TOKEN}&size=${size * 2}&format=png&retina=true`
    : undefined;

  const showFallback = !src || failed;

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-2xl ${
        showFallback ? "brand-gradient px-2 text-[11px] font-extrabold tracking-tight" : "bg-card border border-border"
      } ${className}`}
      style={{ height: size, width: size, minWidth: size }}
    >
      {showFallback ? (
        <span>{symbol.slice(0, 4)}</span>
      ) : (
        <img
          src={src}
          alt={`${name ?? symbol} logo`}
          loading="lazy"
          width={size}
          height={size}
          className="size-full object-contain"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}

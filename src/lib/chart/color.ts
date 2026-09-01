/** Color helpers — lightweight-charts and canvas cannot parse `oklch()`, so tokens are converted to hex. */

export function oklchToHex(str: string): string | null {
  const m = str
    .trim()
    .match(/^oklch\(\s*([\d.]+%?)\s+([\d.]+%?)\s+([\d.]+)(?:deg)?\s*(?:\/\s*[\d.]+%?\s*)?\)$/i);
  if (!m) return null;
  const num = (s: string, scale: number) =>
    s.endsWith("%") ? (parseFloat(s) / 100) * scale : parseFloat(s);
  const L = num(m[1]!, 1);
  const C = num(m[2]!, 0.4);
  const h = (parseFloat(m[3]!) * Math.PI) / 180;
  const a = Math.cos(h) * C;
  const b = Math.sin(h) * C;
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l3 = l_ ** 3;
  const m3 = m_ ** 3;
  const s3 = s_ ** 3;
  const lin = [
    4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
    -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
    -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3,
  ];
  const toHex = (v: number) => {
    const c = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(Math.max(v, 0), 1 / 2.4) - 0.055;
    return Math.round(Math.min(1, Math.max(0, c)) * 255)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${lin.map(toHex).join("")}`;
}

/** Reads a CSS custom property and always returns a canvas-safe hex color. */
export function cssColor(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (!v) return fallback;
  if (v.startsWith("oklch")) return oklchToHex(v) ?? fallback;
  if (/^[\d.]+%?\s+[\d.]+%?\s+[\d.]+$/.test(v)) return oklchToHex(`oklch(${v})`) ?? fallback;
  if (v.startsWith("#") || v.startsWith("rgb") || v.startsWith("hsl")) return v;
  return fallback;
}

/** Adds an alpha channel to a #rrggbb color. */
export function withAlpha(hex: string, alpha: number): string {
  if (!hex.startsWith("#") || hex.length < 7) return hex;
  const a = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex.slice(0, 7)}${a}`;
}

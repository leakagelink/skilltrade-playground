import logo from "@/assets/tradevirt-logo.png";
import { cn } from "@/lib/utils";

const SIZES = { sm: "size-7", md: "size-10", lg: "size-16" } as const;

export function BrandMark({
  size = "md",
  className,
}: {
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-2xl bg-primary/10 p-1.5 ring-1 ring-primary/20",
        className,
      )}
    >
      <img
        src={logo}
        alt="TradeVirt logo"
        width={1024}
        height={1024}
        className={cn(SIZES[size], "object-contain")}
      />
    </span>
  );
}

export function BrandLogo({
  size = "md",
  withTagline = false,
  className,
}: {
  size?: keyof typeof SIZES;
  withTagline?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <BrandMark size={size} />
      <div className="min-w-0">
        <p
          className={cn(
            "font-semibold tracking-tight",
            size === "lg" ? "text-2xl" : size === "md" ? "text-lg" : "text-sm",
          )}
        >
          Trade<span className="text-primary">Virt</span>
        </p>
        {withTagline ? (
          <p className="text-xs text-muted-foreground">Practice Trading. Build Your Skill.</p>
        ) : null}
      </div>
    </div>
  );
}

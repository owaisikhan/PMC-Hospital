import type { BadgeIcon } from "@/components/badge-icons";
import { Card, CardContent } from "@/components/ui/card";
import { TiltCard } from "@/components/ui/tilt-card";
import { formatPKR } from "@/lib/format";
import { cn } from "@/lib/utils";

interface RevenueCardProps {
  label: string;
  amount: number;
  icon: BadgeIcon;
  /** Share of total income for the period, 0-100. Omitted when total is zero. */
  sharePercent?: number;
  emphasis?: "default" | "positive" | "negative";
}

export function RevenueCard({
  label,
  amount,
  icon: Icon,
  sharePercent,
  emphasis = "default",
}: RevenueCardProps) {
  return (
    <TiltCard>
      <Card>
        <CardContent className="flex flex-col gap-2 pt-5">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-muted-foreground">{label}</p>
            <Icon className="size-9 shrink-0 drop-shadow-[0_3px_5px_rgb(0_0_0/0.18)]" />
          </div>

          {/* Money never wraps: it drops a step in size before it breaks a line. */}
          <p
            className={cn(
              "text-xl font-semibold tracking-tight whitespace-nowrap tabular-nums sm:text-2xl",
              emphasis === "positive" && amount > 0 && "text-success",
              emphasis === "negative" && amount > 0 && "text-destructive",
            )}
          >
            {formatPKR(amount)}
          </p>

          {sharePercent !== undefined ? (
            <div className="flex items-center gap-2">
              <div
                className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
                role="meter"
                aria-label={`${label} share of income`}
                aria-valuenow={Math.round(sharePercent)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.min(100, sharePercent)}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground tabular-nums">
                {Math.round(sharePercent)}%
              </span>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </TiltCard>
  );
}

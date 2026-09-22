import type { BadgeIcon } from "@/components/badge-icons";
import { Card, CardContent } from "@/components/ui/card";
import { TiltCard } from "@/components/ui/tilt-card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  icon: BadgeIcon;
  /** Human-readable delta, e.g. "+12 since yesterday". */
  trend?: string;
  trendDirection?: "up" | "down" | "flat";
}

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  trendDirection = "flat",
}: StatCardProps) {
  return (
    <TiltCard>
      <Card>
        <CardContent className="flex items-start justify-between gap-3 pt-5">
          <div className="flex flex-col gap-1">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-semibold tracking-tight tabular-nums">
              {value}
            </p>
            {trend ? (
              <p
                className={cn(
                  "text-xs",
                  trendDirection === "up" && "text-success",
                  trendDirection === "down" && "text-destructive",
                  trendDirection === "flat" && "text-muted-foreground",
                )}
              >
                {trend}
              </p>
            ) : null}
          </div>
          <Icon className="size-10 shrink-0 drop-shadow-[0_3px_5px_rgb(0_0_0/0.18)]" />
        </CardContent>
      </Card>
    </TiltCard>
  );
}

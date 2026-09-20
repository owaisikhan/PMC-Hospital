import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { TiltCard } from "@/components/ui/tilt-card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
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
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-4.5" />
          </span>
        </CardContent>
      </Card>
    </TiltCard>
  );
}

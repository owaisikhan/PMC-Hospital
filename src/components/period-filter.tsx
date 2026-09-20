import { SlidingTabs, type TabItem } from "@/components/ui/sliding-tabs"
import { PERIOD_LABELS, PERIOD_ORDER, type Period } from "@/lib/dates"

/**
 * Plain links rather than a client-side control: the period lives in the URL,
 * so the figures are server-rendered, shareable and survive a refresh. The
 * pill that marks the active one slides between them.
 */
export function PeriodFilter({ active }: { active: Period }) {
  const items: TabItem[] = PERIOD_ORDER.map((period) => ({
    key: period,
    label: PERIOD_LABELS[period],
    href: `/?period=${period}`,
  }))

  return (
    <SlidingTabs
      items={items}
      active={active}
      groupId="period"
      ariaLabel="Time period"
    />
  )
}

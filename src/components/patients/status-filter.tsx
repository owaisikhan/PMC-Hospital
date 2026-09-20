import { SlidingTabs, type TabItem } from "@/components/ui/sliding-tabs"

export type PatientFilter = "admitted" | "all"

export const FILTER_LABELS: Record<PatientFilter, string> = {
  admitted: "Admitted now",
  all: "All patients",
}

export function isPatientFilter(value: string | undefined): value is PatientFilter {
  return value === "admitted" || value === "all"
}

/**
 * The search term rides along, so changing the filter does not silently wipe
 * it. The selected chip is a span rather than a link back to the page you are
 * already on; that rule lives in SlidingTabs, along with the sliding pill.
 */
export function StatusFilter({
  active,
  query,
}: {
  active: PatientFilter
  query: string
}) {
  const items: TabItem[] = (Object.keys(FILTER_LABELS) as PatientFilter[]).map(
    (filter) => {
      const params = new URLSearchParams()
      if (query) params.set("q", query)
      params.set("show", filter)
      return {
        key: filter,
        label: FILTER_LABELS[filter],
        href: `/patients?${params.toString()}`,
      }
    }
  )

  return (
    <SlidingTabs
      items={items}
      active={active}
      groupId="patient-filter"
      ariaLabel="Filter patients"
      size="large"
    />
  )
}

import {
  BILLING_FILTER_LABELS,
  BILLING_STATUS_LABELS,
  type BillingFilter,
  type BillingStatus,
} from "@/lib/billing"
import { SlidingTabs, type TabItem } from "@/components/ui/sliding-tabs"
import { UrlSearch } from "@/components/ui/url-search"

/** Builds a /billing URL that keeps every other control's value. */
function href(params: { show: string; status: string; q: string }): string {
  const next = new URLSearchParams()
  next.set("show", params.show)
  next.set("status", params.status)
  if (params.q) next.set("q", params.q)
  return `/billing?${next.toString()}`
}

export function BillingSearch({
  query,
  show,
  status,
}: {
  query: string
  show: BillingFilter
  status: BillingStatus
}) {
  return (
    <UrlSearch
      basePath="/billing"
      initialQuery={query}
      carry={{ show, status }}
      placeholder="Search by name or MRN"
      label="Search bills by patient name or medical record number"
    />
  )
}

/** Money: who still owes something. */
export function OwingFilter({
  show,
  status,
  query,
}: {
  show: BillingFilter
  status: BillingStatus
  query: string
}) {
  const items: TabItem[] = (
    Object.keys(BILLING_FILTER_LABELS) as BillingFilter[]
  ).map((key) => ({
    key,
    label: BILLING_FILTER_LABELS[key],
    href: href({ show: key, status, q: query }),
  }))

  return (
    <SlidingTabs
      items={items}
      active={show}
      groupId="billing-owing"
      ariaLabel="Filter bills by what is owed"
      size="large"
    />
  )
}

/** Where the patient is: in a bed, gone home, or simply on the books. */
export function StatusFilter({
  show,
  status,
  query,
}: {
  show: BillingFilter
  status: BillingStatus
  query: string
}) {
  const items: TabItem[] = (
    Object.keys(BILLING_STATUS_LABELS) as BillingStatus[]
  ).map((key) => ({
    key,
    label: BILLING_STATUS_LABELS[key],
    href: href({ show, status: key, q: query }),
  }))

  return (
    <SlidingTabs
      items={items}
      active={status}
      groupId="billing-status"
      ariaLabel="Filter bills by patient status"
      size="large"
    />
  )
}

"use client"

import { UrlSearch } from "@/components/ui/url-search"

export function LabOrderSearch({
  initialQuery,
  carry,
}: {
  initialQuery: string
  carry: Record<string, string>
}) {
  return (
    <UrlSearch
      basePath="/laboratory"
      initialQuery={initialQuery}
      carry={carry}
      placeholder="Search by patient name"
      label="Search lab orders by patient name"
    />
  )
}

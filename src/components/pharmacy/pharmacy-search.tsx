"use client"

import { UrlSearch } from "@/components/ui/url-search"

export function PharmacySearch({
  initialQuery,
  carry,
}: {
  initialQuery: string
  carry: Record<string, string>
}) {
  return (
    <UrlSearch
      basePath="/pharmacy"
      initialQuery={initialQuery}
      carry={carry}
      placeholder="Search medicines"
      label="Search medicines by name"
    />
  )
}

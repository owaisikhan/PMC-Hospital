"use client"

import { UrlSearch } from "@/components/ui/url-search"

export function PatientSearch({
  initialQuery,
  filter,
}: {
  initialQuery: string
  filter: string
}) {
  return (
    <UrlSearch
      basePath="/patients"
      initialQuery={initialQuery}
      carry={{ show: filter }}
      placeholder="Search by name or MRN"
      label="Search patients by name or medical record number"
    />
  )
}

"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Search } from "lucide-react"

import { controlClass } from "@/components/ui/field"

/**
 * The query lives in the URL so results are server-rendered and the Back button
 * walks through searches. Debounced, and scroll is preserved because only the
 * list below changes.
 */
export function PatientSearch({
  initialQuery,
  filter,
}: {
  initialQuery: string
  filter: string
}) {
  const router = useRouter()
  const [value, setValue] = useState(initialQuery)

  useEffect(() => {
    const timer = setTimeout(() => {
      const next = new URLSearchParams()
      if (value.trim()) next.set("q", value.trim())
      // The filter rides along: two controls on one page each carry the
      // other's value, or changing one silently resets the other.
      next.set("show", filter)
      router.replace(`/patients?${next.toString()}`, { scroll: false })
    }, 300)
    return () => clearTimeout(timer)
  }, [value, filter, router])

  return (
    <div className="relative w-full sm:max-w-md">
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4.5 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search by name or MRN"
        aria-label="Search patients by name or medical record number"
        className={`${controlClass} pl-10`}
      />
    </div>
  )
}

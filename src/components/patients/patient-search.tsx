"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Search } from "lucide-react"

import { controlClass } from "@/components/ui/field"

/**
 * The query lives in the URL so results are server-rendered and the Back button
 * walks through searches. Debounced, and scroll is preserved because only the
 * list below changes.
 */
export function PatientSearch({ initialQuery }: { initialQuery: string }) {
  const router = useRouter()
  const params = useSearchParams()
  const [value, setValue] = useState(initialQuery)

  useEffect(() => {
    const timer = setTimeout(() => {
      const next = new URLSearchParams(params.toString())
      if (value.trim()) next.set("q", value.trim())
      else next.delete("q")
      next.delete("page")
      router.replace(`/patients?${next.toString()}`, { scroll: false })
    }, 300)
    return () => clearTimeout(timer)
    // params is intentionally not a dependency: reacting to it would re-fire
    // the search every time the URL it just wrote comes back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, router])

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

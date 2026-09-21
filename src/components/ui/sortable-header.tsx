import Link from "next/link"
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"

/**
 * A <th> that is also a sort toggle: clicking it asks for the same column
 * ascending, clicking it again flips to descending. State lives in the URL
 * like every other filter on this page, so a sorted list survives a reload,
 * Back, or a shared link.
 */
export function SortableHeader({
  label,
  sortKey,
  active,
  direction,
  basePath,
  carry,
  align = "left",
}: {
  label: string
  sortKey: string
  active: boolean
  direction: "asc" | "desc"
  basePath: string
  /** Every other param on the page, so sorting never drops a search or a filter. */
  carry: Record<string, string>
  align?: "left" | "right"
}) {
  const nextDirection = active && direction === "asc" ? "desc" : "asc"
  const params = new URLSearchParams(carry)
  params.set("sort", sortKey)
  params.set("dir", nextDirection)

  const Icon = active ? (direction === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown

  return (
    <th scope="col" className={`px-4 py-3 font-medium ${align === "right" ? "text-right" : ""}`}>
      <Link
        href={`${basePath}?${params.toString()}`}
        scroll={false}
        className={`inline-flex items-center gap-1 hover:text-foreground ${
          active ? "text-foreground" : "text-muted-foreground"
        } ${align === "right" ? "flex-row-reverse" : ""}`}
      >
        {label}
        <Icon className="size-3.5 shrink-0" aria-hidden />
      </Link>
    </th>
  )
}

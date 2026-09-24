import Link from "next/link"
import { ArrowDown, ArrowUp } from "lucide-react"

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

  // Only the sorted column shows an arrow, pointing the way it is sorted. An
  // arrow on every sortable column was noise that also hid which one was in
  // use. The others keep the arrow's space (so headings never shift) and
  // show it faintly on hover or keyboard focus, so they still read as
  // clickable, with the direction a click would give.
  const Icon = (active ? direction : nextDirection) === "asc" ? ArrowUp : ArrowDown

  // data-sort keeps this header on screen, as a sort chip, when a
  // .stack-table turns into cards on a phone (see globals.css).
  return (
    <th
      scope="col"
      data-sort=""
      aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : undefined}
      className={`px-4 py-3 font-medium ${align === "right" ? "text-right" : ""}`}
    >
      <Link
        href={`${basePath}?${params.toString()}`}
        scroll={false}
        className={`group/sort inline-flex items-center gap-1 align-middle hover:text-foreground ${
          active ? "text-foreground" : "text-muted-foreground"
        } ${align === "right" ? "md:flex-row-reverse" : ""}`}
      >
        {label}
        <Icon
          className={`size-3.5 shrink-0 transition-opacity ${
            active
              ? ""
              : // On a phone the header is a row of chips and there is no
                // hover to reveal it with, so there the space is dropped too.
                "opacity-0 group-hover/sort:opacity-60 group-focus-visible/sort:opacity-60 max-md:hidden"
          }`}
          aria-hidden
        />
      </Link>
    </th>
  )
}

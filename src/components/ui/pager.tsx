import Link from "next/link"

/**
 * Previous / Next for a paginated list.
 *
 * A dead control is a span, not a faded link: a disabled-looking link still
 * takes focus from the keyboard and still navigates when pressed, so it lies
 * about being unavailable.
 *
 * Rendered from server components, so hrefFor can be a plain function - no
 * prop crosses to the client.
 */
export function Pager({
  page,
  lastPage,
  hrefFor,
}: {
  page: number
  lastPage: number
  hrefFor: (page: number) => string
}) {
  if (lastPage <= 1) return null

  const base =
    "flex h-11 items-center rounded-lg border border-border px-4 text-base font-medium"

  return (
    <div className="flex gap-2">
      {page > 1 ? (
        <Link
          href={hrefFor(page - 1)}
          className={`${base} transition-colors hover:bg-muted`}
        >
          Previous
        </Link>
      ) : (
        <span className={`${base} text-muted-foreground opacity-50`}>Previous</span>
      )}
      {page < lastPage ? (
        <Link
          href={hrefFor(page + 1)}
          className={`${base} transition-colors hover:bg-muted`}
        >
          Next
        </Link>
      ) : (
        <span className={`${base} text-muted-foreground opacity-50`}>Next</span>
      )}
    </div>
  )
}

/** Clamps a `?page=` value to something sane before it reaches a query. */
export function parsePage(raw: string | undefined): number {
  return Math.max(1, Math.min(9999, Number.parseInt(raw ?? "1", 10) || 1))
}

import { Skeleton, SkeletonLine } from "@/components/ui/skeleton"

export interface SkeletonColumn {
  /** Column headings are fixed copy, so they render for real. */
  label: string
  /** Width of the placeholder bar in the body cells. */
  bar: string
  align?: "left" | "right"
  /** Extra classes on the header cell, e.g. "w-14" for the S# column. */
  head?: string
  /** True when the real heading is visually hidden, as the actions column is. */
  hiddenLabel?: boolean
  /**
   * Width of a second, smaller line under the first. The real rows carry one
   * in the columns that show a detail under the main value, which makes them
   * 69px rather than 49px - without it the whole table is 20px short per row.
   */
  subBar?: string
}

/**
 * Mirrors the stock and lab tables: same wrapper, same min-width, same cell
 * padding, so the rows do not resize when the data lands.
 *
 * The wrapper's classes are copied deliberately rather than approximated.
 * min-w-0: a flex child defaults to min-width:auto, so without it the wrapper
 * grows to the table's width and scrolls the whole page sideways. relative:
 * sr-only is position:absolute, and with no positioned ancestor a hidden
 * label inside a table wider than the screen escapes the scroller and drags
 * the page's scrollable width out with it.
 */
export function TableSkeleton({
  columns,
  rows = 6,
  minWidth,
  caption,
}: {
  columns: SkeletonColumn[]
  rows?: number
  /** e.g. "min-w-[52rem]" - must match the real table. */
  minWidth: string
  caption: string
}) {
  return (
    <div className="relative min-w-0 overflow-x-auto rounded-xl surface">
      <table className={`w-full ${minWidth} border-collapse text-base`}>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-border text-left">
            {columns.map((column) => (
              <th
                key={column.label}
                scope="col"
                className={[
                  "px-4 py-3 font-medium",
                  column.align === "right" ? "text-right" : "",
                  column.head ?? "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {column.hiddenLabel ? (
                  <span className="sr-only">{column.label}</span>
                ) : (
                  column.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody aria-busy="true">
          {Array.from({ length: rows }, (_, rowIndex) => (
            <tr key={rowIndex} className="border-b border-border/60 last:border-b-0">
              {columns.map((column, columnIndex) => (
                <td key={column.label} className="px-4 py-3">
                  {/* Cells are text-base, so the line box is h-6. Each row
                      starts a little later, so the table fills in as one
                      sweep rather than flashing cell by cell. */}
                  <SkeletonLine
                    line="h-6"
                    bar="h-4"
                    width={column.bar}
                    align={column.align}
                    delay={rowIndex * 0.1 + columnIndex * 0.03}
                  />
                  {column.subBar ? (
                    <SkeletonLine
                      line="h-5"
                      bar="h-3"
                      width={column.subBar}
                      align={column.align}
                      delay={rowIndex * 0.1 + columnIndex * 0.03 + 0.04}
                    />
                  ) : null}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** The one-line summary that sits above each table. */
export function TableSummarySkeleton({ width = "w-72" }: { width?: string }) {
  return <SkeletonLine line="h-6" bar="h-4" width={width} />
}

/** A filter chip group in a page header, at its real 46px height. */
export function FilterGroupSkeleton({ width }: { width: string }) {
  return <Skeleton className={`h-[2.875rem] ${width} rounded-lg`} />
}

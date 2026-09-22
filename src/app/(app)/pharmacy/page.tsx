import { AlertTriangle, CircleCheck, CircleX } from "lucide-react"

import { MedicineIcon } from "@/components/badge-icons"
import { PageHeader } from "@/components/layout/page-header"
import { PharmacySearch } from "@/components/pharmacy/pharmacy-search"
import { EditBatchButton, ReceiveStockButton } from "@/components/pharmacy/stock-dialogs"
import { Badge } from "@/components/ui/badge"
import { SortableHeader } from "@/components/ui/sortable-header"
import { daysFromNowISO, todayISO } from "@/lib/dates"
import { formatPKR } from "@/lib/format"
import { createClient } from "@/lib/supabase/server"
import { requireProfile } from "@/lib/supabase/session"
import { cn } from "@/lib/utils"

export const metadata = { title: "Pharmacy" }

interface BatchRow {
  id: string
  batch_no: string
  expiry_date: string
  qty_remaining: number
  cost_price: number | string
  sale_price: number | string
}

interface ItemRow {
  id: string
  sku: string
  name: string
  form: string | null
  strength: string | null
  unit: string
  reorder_level: number
}

const SORT_KEYS = ["stock", "costPrice", "salePrice", "expiry"] as const
type SortKey = (typeof SORT_KEYS)[number]

function isSortKey(value: string | undefined): value is SortKey {
  return SORT_KEYS.includes(value as SortKey)
}

export default async function PharmacyPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string; dir?: string }>
}) {
  const params = await searchParams
  const q = (params.q ?? "").trim()
  const sort = isSortKey(params.sort) ? params.sort : null
  const dir = params.dir === "desc" ? "desc" : "asc"

  const profile = await requireProfile()
  const isAdmin = profile.role === "admin"
  const supabase = await createClient()

  const { data: itemsData, error } = await supabase
    .from("pharmacy_items")
    .select("id, sku, name, form, strength, unit, reorder_level")
    .eq("is_active", true)
    .order("name")

  const items = (itemsData ?? []) as ItemRow[]

  // A separate query against the masked view, not a nested embed: staff must
  // not see cost_price, and a masking view has to be queried directly - the
  // FK metadata PostgREST needs to embed it under pharmacy_items does not
  // carry over from the base table it wraps.
  const itemIds = items.map((item) => item.id)
  const { data: batchesData } =
    itemIds.length > 0
      ? await supabase
          .from("pharmacy_batches_view")
          .select("id, item_id, batch_no, expiry_date, qty_remaining, cost_price, sale_price")
          .in("item_id", itemIds)
      : { data: [] as BatchRow[] & { item_id: string }[] }

  const batchesByItem = new Map<string, (BatchRow & { item_id: string })[]>()
  for (const batch of (batchesData ?? []) as (BatchRow & { item_id: string })[]) {
    const list = batchesByItem.get(batch.item_id) ?? []
    list.push(batch)
    batchesByItem.set(batch.item_id, list)
  }

  const today = todayISO()
  const soon = daysFromNowISO(90)

  const rows = items.map((item) => {
    const batches = batchesByItem.get(item.id) ?? []
    const inStock = batches
      .filter((batch) => batch.qty_remaining > 0)
      // Earliest expiry first: that is the batch dispensed next, so its prices
      // and date are the ones that describe this medicine right now.
      .sort((a, b) => a.expiry_date.localeCompare(b.expiry_date))

    const stock = batches.reduce((sum, batch) => sum + batch.qty_remaining, 0)
    const next = inStock[0] ?? null

    return {
      id: item.id,
      sku: item.sku,
      name: item.name,
      detail: [item.strength, item.form].filter((part) => part && part !== "-").join(" · "),
      unit: item.unit,
      stock,
      batchCount: inStock.length,
      // null for a staff login - the view masks it, this just carries that through.
      costPrice: next?.cost_price === null || next?.cost_price === undefined
        ? null
        : Number(next.cost_price),
      salePrice: next ? Number(next.sale_price) : null,
      expiry: next ? next.expiry_date : null,
      // The row the Edit dialog changes - the batch actually shown here.
      editableBatch: next
        ? {
            id: next.id,
            batchNo: next.batch_no,
            qtyRemaining: next.qty_remaining,
            costPrice: Number(next.cost_price ?? 0),
            salePrice: Number(next.sale_price),
            expiryDate: next.expiry_date,
          }
        : null,
    }
  })

  const filteredRows = q
    ? rows.filter((row) => row.name.toLowerCase().includes(q.toLowerCase()))
    : rows

  const sortedRows = sort
    ? [...filteredRows].sort((a, b) => {
        const av = a[sort]
        const bv = b[sort]
        // A missing value (no batch, or a masked cost price) always sorts
        // last, in either direction, rather than jumping to the top on desc.
        if (av === null && bv === null) return 0
        if (av === null) return 1
        if (bv === null) return -1
        const comparison = typeof av === "number" ? av - (bv as number) : String(av).localeCompare(String(bv))
        return dir === "desc" ? -comparison : comparison
      })
    : filteredRows

  const outOfStock = sortedRows.filter((row) => row.stock === 0).length
  const itemOptions = items.map((item) => ({
    id: item.id,
    name: item.name,
    detail: [item.strength, item.form].filter((part) => part && part !== "-").join(" · "),
  }))

  // What each control hands off to the other, so searching and sorting
  // compose in the URL instead of one clobbering the other. The sort
  // headers carry the current search along; the search box carries the
  // current sort along - never its own param, or clearing the box could
  // not remove a q that the carry itself kept re-adding.
  const carryForSortHeaders: Record<string, string> = q ? { q } : {}
  const carryForSearchBox: Record<string, string> = sort ? { sort, dir } : {}

  return (
    <>
      <PageHeader
        title="Pharmacy"
        description={
          isAdmin
            ? "Medicines held in stock, with what they cost and what they sell for."
            : "Medicines held in stock and what they sell for."
        }
        actions={isAdmin ? <ReceiveStockButton items={itemOptions} /> : undefined}
      />

      <div className="flex flex-col gap-4 px-4 py-6 sm:px-6">
        {error ? (
          <p role="alert" className="rounded-lg bg-destructive/12 px-3 py-2.5 text-base text-destructive">
            Could not load the pharmacy: {error.message}
          </p>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-6 py-14 text-center">
            <MedicineIcon className="size-12 drop-shadow-[0_4px_6px_rgb(0_0_0/0.15)]" />
            <p className="text-base font-medium">No medicines yet.</p>
            <p className="text-base text-muted-foreground">
              Stock will appear here once it is received.
            </p>
          </div>
        ) : (
          <>
            <PharmacySearch initialQuery={q} carry={carryForSearchBox} />

            <p className="text-base text-muted-foreground">
              {sortedRows.length} {sortedRows.length === 1 ? "medicine" : "medicines"}
              {q ? ` matching "${q}"` : ""}
              {outOfStock > 0 ? (
                <>
                  {" · "}
                  <span className="font-medium text-destructive">
                    {outOfStock} out of stock
                  </span>
                </>
              ) : null}
            </p>

            {sortedRows.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-6 py-10 text-center">
                <p className="text-base font-medium">No medicines match &quot;{q}&quot;.</p>
                <p className="text-base text-muted-foreground">
                  Check the spelling, or clear the search to see everything.
                </p>
              </div>
            ) : (
            /* min-w-0: a flex child defaults to min-width:auto, so without it the
               wrapper grows to the table's width and scrolls the whole page
               sideways instead of scrolling inside its own card.

               relative: sr-only is position:absolute, and with no positioned
               ancestor its containing block is the document rather than this
               wrapper. A visually hidden label inside a table wider than the
               screen then sits outside the scroller and drags the page's
               scrollable width out with it - 500px of blank space the page
               could be scrolled into. Making this the containing block keeps
               it clipped here. */
            <div className="relative min-w-0 overflow-x-auto rounded-xl surface">
              <table className="stack-table w-full md:min-w-[52rem] border-collapse text-base">
                <caption className="sr-only">
                  Pharmacy stock, with purchase price, sale price and expiry date
                </caption>
                <thead>
                  <tr className="border-b border-border text-left">
                    <th scope="col" className="w-14 px-4 py-3 font-medium">S#</th>
                    <th scope="col" className="px-4 py-3 font-medium">SKU</th>
                    <th scope="col" className="px-4 py-3 font-medium">Medicine</th>
                    <SortableHeader
                      label="Stock"
                      sortKey="stock"
                      active={sort === "stock"}
                      direction={dir}
                      basePath="/pharmacy"
                      carry={carryForSortHeaders}
                    />
                    {isAdmin ? (
                      <SortableHeader
                        label="Purchase price"
                        sortKey="costPrice"
                        active={sort === "costPrice"}
                        direction={dir}
                        basePath="/pharmacy"
                        carry={carryForSortHeaders}
                        align="right"
                      />
                    ) : null}
                    <SortableHeader
                      label="Sale price"
                      sortKey="salePrice"
                      active={sort === "salePrice"}
                      direction={dir}
                      basePath="/pharmacy"
                      carry={carryForSortHeaders}
                      align="right"
                    />
                    <SortableHeader
                      label="Expiry date"
                      sortKey="expiry"
                      active={sort === "expiry"}
                      direction={dir}
                      basePath="/pharmacy"
                      carry={carryForSortHeaders}
                    />
                    {isAdmin ? (
                      <th scope="col" className="px-4 py-3 font-medium">
                        <span className="sr-only">Actions</span>
                      </th>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.map((row, index) => {
                    const expired = row.expiry !== null && row.expiry < today
                    const expiringSoon =
                      row.expiry !== null && !expired && row.expiry <= soon

                    return (
                      <tr
                        key={row.id}
                        className="border-b border-border/60 last:border-b-0"
                      >
                        <td data-cell="skip" className="px-4 py-3 text-muted-foreground tabular-nums">
                          {index + 1}
                        </td>

                        <td data-label="SKU" className="px-4 py-3 whitespace-nowrap text-muted-foreground tabular-nums">
                          {row.sku}
                        </td>

                        <td data-cell="primary" className="px-4 py-3">
                          <span className="font-medium">{row.name}</span>
                          {row.detail ? (
                            <span className="block text-sm text-muted-foreground">
                              {row.detail}
                            </span>
                          ) : null}
                        </td>

                        {/* The word changes as well as the colour, so the state
                            does not depend on seeing red or green. */}
                        <td data-label="Stock" className="px-4 py-3">
                          {row.stock === 0 ? (
                            <span className="flex items-center gap-1.5 font-semibold whitespace-nowrap text-destructive">
                              <CircleX className="size-4 shrink-0" aria-hidden />
                              Out of stock
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 font-semibold whitespace-nowrap text-success">
                              <CircleCheck className="size-4 shrink-0" aria-hidden />
                              <span className="tabular-nums">{row.stock}</span>
                              <span className="font-normal text-muted-foreground">
                                {row.unit}
                                {row.stock === 1 ? "" : "s"}
                              </span>
                            </span>
                          )}
                          {row.batchCount > 1 ? (
                            <span className="block text-sm text-muted-foreground">
                              across {row.batchCount} batches
                            </span>
                          ) : null}
                        </td>

                        {isAdmin ? (
                          <td data-label="Purchase price" className="px-4 py-3 text-right whitespace-nowrap tabular-nums">
                            {row.costPrice === null ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              formatPKR(row.costPrice)
                            )}
                          </td>
                        ) : null}

                        <td data-label="Sale price" className="px-4 py-3 text-right font-medium whitespace-nowrap tabular-nums">
                          {row.salePrice === null ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            formatPKR(row.salePrice)
                          )}
                        </td>

                        <td data-label="Expiry date" className="px-4 py-3">
                          {row.expiry === null ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            <span className="flex flex-wrap items-center gap-1.5">
                              <span
                                className={cn(
                                  "whitespace-nowrap tabular-nums",
                                  expired && "font-semibold text-destructive"
                                )}
                              >
                                {row.expiry}
                              </span>
                              {expired ? (
                                <Badge variant="destructive" className="text-sm">
                                  <AlertTriangle className="size-3.5" aria-hidden />
                                  Expired
                                </Badge>
                              ) : expiringSoon ? (
                                <Badge variant="warning" className="text-sm">
                                  <AlertTriangle className="size-3.5" aria-hidden />
                                  Expiring soon
                                </Badge>
                              ) : null}
                            </span>
                          )}
                        </td>

                        {isAdmin ? (
                          <td data-cell="actions" className="px-4 py-3">
                            {row.editableBatch ? (
                              <EditBatchButton medicineName={row.name} batch={row.editableBatch} />
                            ) : null}
                          </td>
                        ) : null}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            )}

            <p className="text-sm text-muted-foreground">
              Stock is the total across every batch. {isAdmin ? "Purchase price, sale price" : "Sale price"}{" "}
              and expiry come from the batch that expires first, which is the one
              dispensed next.
            </p>
          </>
        )}
      </div>
    </>
  )
}

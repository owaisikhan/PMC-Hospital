import { AlertTriangle, CircleCheck, CircleX, Pill } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { EditBatchButton, ReceiveStockButton } from "@/components/pharmacy/stock-dialogs"
import { Badge } from "@/components/ui/badge"
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

export default async function PharmacyPage() {
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

  const outOfStock = rows.filter((row) => row.stock === 0).length
  const itemOptions = items.map((item) => ({
    id: item.id,
    name: item.name,
    detail: [item.strength, item.form].filter((part) => part && part !== "-").join(" · "),
  }))

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
            <Pill className="size-8 text-muted-foreground" aria-hidden />
            <p className="text-base font-medium">No medicines yet.</p>
            <p className="text-base text-muted-foreground">
              Stock will appear here once it is received.
            </p>
          </div>
        ) : (
          <>
            <p className="text-base text-muted-foreground">
              {rows.length} {rows.length === 1 ? "medicine" : "medicines"}
              {outOfStock > 0 ? (
                <>
                  {" · "}
                  <span className="font-medium text-destructive">
                    {outOfStock} out of stock
                  </span>
                </>
              ) : null}
            </p>

            {/* min-w-0: a flex child defaults to min-width:auto, so without it the
                wrapper grows to the table's width and scrolls the whole page
                sideways instead of scrolling inside its own card.

                relative: sr-only is position:absolute, and with no positioned
                ancestor its containing block is the document rather than this
                wrapper. A visually hidden label inside a table wider than the
                screen then sits outside the scroller and drags the page's
                scrollable width out with it - 500px of blank space the page
                could be scrolled into. Making this the containing block keeps
                it clipped here. */}
            <div className="relative min-w-0 overflow-x-auto rounded-xl border border-border bg-card">
              <table className="w-full min-w-[52rem] border-collapse text-base">
                <caption className="sr-only">
                  Pharmacy stock, with purchase price, sale price and expiry date
                </caption>
                <thead>
                  <tr className="border-b border-border text-left">
                    <th scope="col" className="w-14 px-4 py-3 font-medium">S#</th>
                    <th scope="col" className="px-4 py-3 font-medium">SKU</th>
                    <th scope="col" className="px-4 py-3 font-medium">Medicine</th>
                    <th scope="col" className="px-4 py-3 font-medium">Stock</th>
                    {isAdmin ? (
                      <th scope="col" className="px-4 py-3 text-right font-medium">
                        Purchase price
                      </th>
                    ) : null}
                    <th scope="col" className="px-4 py-3 text-right font-medium">
                      Sale price
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">Expiry date</th>
                    {isAdmin ? (
                      <th scope="col" className="px-4 py-3 font-medium">
                        <span className="sr-only">Actions</span>
                      </th>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => {
                    const expired = row.expiry !== null && row.expiry < today
                    const expiringSoon =
                      row.expiry !== null && !expired && row.expiry <= soon

                    return (
                      <tr
                        key={row.id}
                        className="border-b border-border/60 last:border-b-0"
                      >
                        <td className="px-4 py-3 text-muted-foreground tabular-nums">
                          {index + 1}
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground tabular-nums">
                          {row.sku}
                        </td>

                        <td className="px-4 py-3">
                          <span className="font-medium">{row.name}</span>
                          {row.detail ? (
                            <span className="block text-sm text-muted-foreground">
                              {row.detail}
                            </span>
                          ) : null}
                        </td>

                        {/* The word changes as well as the colour, so the state
                            does not depend on seeing red or green. */}
                        <td className="px-4 py-3">
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
                          <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">
                            {row.costPrice === null ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              formatPKR(row.costPrice)
                            )}
                          </td>
                        ) : null}

                        <td className="px-4 py-3 text-right font-medium whitespace-nowrap tabular-nums">
                          {row.salePrice === null ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            formatPKR(row.salePrice)
                          )}
                        </td>

                        <td className="px-4 py-3">
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
                          <td className="px-4 py-3">
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

import { AlertTriangle, CircleCheck, CircleX, Pill } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
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
  name: string
  form: string | null
  strength: string | null
  unit: string
  reorder_level: number
  pharmacy_batches: BatchRow[]
}

export default async function PharmacyPage() {
  await requireProfile()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("pharmacy_items")
    .select(
      "id, name, form, strength, unit, reorder_level, pharmacy_batches(id, batch_no, expiry_date, qty_remaining, cost_price, sale_price)"
    )
    .eq("is_active", true)
    .order("name")

  const items = (data ?? []) as unknown as ItemRow[]
  const today = todayISO()
  const soon = daysFromNowISO(90)

  const rows = items.map((item) => {
    const inStock = item.pharmacy_batches
      .filter((batch) => batch.qty_remaining > 0)
      // Earliest expiry first: that is the batch dispensed next, so its prices
      // and date are the ones that describe this medicine right now.
      .sort((a, b) => a.expiry_date.localeCompare(b.expiry_date))

    const stock = item.pharmacy_batches.reduce(
      (sum, batch) => sum + batch.qty_remaining,
      0
    )
    const next = inStock[0] ?? null

    return {
      id: item.id,
      name: item.name,
      detail: [item.strength, item.form].filter((part) => part && part !== "-").join(" · "),
      unit: item.unit,
      stock,
      batchCount: inStock.length,
      costPrice: next ? Number(next.cost_price) : null,
      salePrice: next ? Number(next.sale_price) : null,
      expiry: next ? next.expiry_date : null,
    }
  })

  const outOfStock = rows.filter((row) => row.stock === 0).length

  return (
    <>
      <PageHeader
        title="Pharmacy"
        description="Medicines held in stock, with what they cost and what they sell for."
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

            <div className="overflow-x-auto rounded-xl border border-border bg-card">
              <table className="w-full min-w-[46rem] border-collapse text-base">
                <caption className="sr-only">
                  Pharmacy stock, with purchase price, sale price and expiry date
                </caption>
                <thead>
                  <tr className="border-b border-border text-left">
                    <th scope="col" className="w-14 px-4 py-3 font-medium">S#</th>
                    <th scope="col" className="px-4 py-3 font-medium">Medicine</th>
                    <th scope="col" className="px-4 py-3 font-medium">Stock</th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">
                      Purchase price
                    </th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">
                      Sale price
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">Expiry date</th>
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

                        <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">
                          {row.costPrice === null ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            formatPKR(row.costPrice)
                          )}
                        </td>

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
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <p className="text-sm text-muted-foreground">
              Stock is the total across every batch. Purchase price, sale price
              and expiry come from the batch that expires first, which is the one
              dispensed next.
            </p>
          </>
        )}
      </div>
    </>
  )
}

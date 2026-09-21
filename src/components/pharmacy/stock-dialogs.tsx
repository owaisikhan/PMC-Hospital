"use client"

import { useActionState, useEffect, useState } from "react"
import { Loader2, Pencil, Plus } from "lucide-react"

import { Dialog } from "@/components/ui/dialog"
import { Field, controlClass } from "@/components/ui/field"
import { FormMessage } from "@/components/ui/form-message"
import { useFormValues } from "@/hooks/use-form-values"
import { useToastOnResult } from "@/hooks/use-toast-on-result"
import { receiveStock, updateBatch, type ActionResult } from "@/lib/actions"
import { todayISO } from "@/lib/dates"

const primaryButton =
  "flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
const outlineButton =
  "flex h-11 items-center gap-2 rounded-lg border border-border px-3.5 text-base font-medium transition-colors hover:bg-muted"

export interface ItemOption {
  id: string
  name: string
  detail: string
}

/** Admin only — this is where a delivery's cost price is entered. */
export function ReceiveStockButton({ items }: { items: ItemOption[] }) {
  const [open, setOpen] = useState(false)
  const [itemId, setItemId] = useState("")
  const [result, action, pending] = useActionState<ActionResult | null, FormData>(
    receiveStock,
    null
  )
  const { formRef, captureValues } = useFormValues(result)
  useToastOnResult(result)

  useEffect(() => {
    if (result?.ok) {
      const timer = setTimeout(() => {
        setOpen(false)
        setItemId("")
      }, 1400)
      return () => clearTimeout(timer)
    }
  }, [result])

  const isNewItem = itemId === "__new__"

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={primaryButton}>
        <Plus className="size-4.5" aria-hidden />
        Receive stock
      </button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Receive stock"
        description="A new delivery is its own batch and its own cost price, even for a medicine already on the shelf."
      >
        <form
          ref={formRef}
          action={action}
          onSubmit={captureValues}
          className="flex flex-col gap-4"
        >
          <Field label="Medicine" htmlFor="item_picker" required>
            {/* Unnamed — a UI-only choice between an existing item and the
                "new medicine" fields below. The hidden input is what
                actually submits, and only carries a real id, never
                "__new__" itself. */}
            <select
              id="item_picker"
              required
              value={itemId}
              onChange={(event) => setItemId(event.target.value)}
              className={controlClass}
            >
              <option value="" disabled>
                Choose…
              </option>
              <option value="__new__">+ New medicine…</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                  {item.detail ? ` · ${item.detail}` : ""}
                </option>
              ))}
            </select>
          </Field>
          <input type="hidden" name="item_id" value={isNewItem ? "" : itemId} />

          {isNewItem ? (
            <>
              <Field label="Name" htmlFor="new_item_name" required>
                <input
                  id="new_item_name"
                  name="new_item_name"
                  required={isNewItem}
                  autoComplete="off"
                  placeholder="Paracetamol"
                  className={controlClass}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Form" htmlFor="form">
                  <input
                    id="form"
                    name="form"
                    autoComplete="off"
                    placeholder="Syrup"
                    className={controlClass}
                  />
                </Field>
                <Field label="Strength" htmlFor="strength">
                  <input
                    id="strength"
                    name="strength"
                    autoComplete="off"
                    placeholder="120mg/5ml"
                    className={controlClass}
                  />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Unit" htmlFor="unit" hint="What one is counted as.">
                  <input
                    id="unit"
                    name="unit"
                    autoComplete="off"
                    placeholder="bottle"
                    defaultValue="unit"
                    className={controlClass}
                  />
                </Field>
                <Field label="Reorder level" htmlFor="reorder_level" hint="Warn below this count.">
                  <input
                    id="reorder_level"
                    name="reorder_level"
                    type="number"
                    min="0"
                    step="1"
                    inputMode="numeric"
                    defaultValue="0"
                    className={controlClass}
                  />
                </Field>
              </div>
            </>
          ) : null}

          <Field label="Batch number" htmlFor="batch_no" required>
            <input
              id="batch_no"
              name="batch_no"
              required
              autoComplete="off"
              className={controlClass}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Quantity received" htmlFor="qty_received" required>
              <input
                id="qty_received"
                name="qty_received"
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                required
                className={controlClass}
              />
            </Field>
            <Field label="Expiry date" htmlFor="expiry_date" required>
              <input
                id="expiry_date"
                name="expiry_date"
                type="date"
                required
                min={todayISO()}
                className={controlClass}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Cost price"
              htmlFor="cost_price"
              required
              hint="Per unit: what this batch cost PMC."
            >
              <input
                id="cost_price"
                name="cost_price"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                required
                className={controlClass}
              />
            </Field>
            <Field label="Sale price" htmlFor="sale_price" required hint="Per unit: what a patient pays.">
              <input
                id="sale_price"
                name="sale_price"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                required
                className={controlClass}
              />
            </Field>
          </div>

          <Field label="Received on" htmlFor="received_on" required>
            <input
              id="received_on"
              name="received_on"
              type="date"
              required
              max={todayISO()}
              defaultValue={todayISO()}
              className={controlClass}
            />
          </Field>

          <FormMessage result={result} />

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setOpen(false)} className={outlineButton}>
              Cancel
            </button>
            <button type="submit" disabled={pending} className={primaryButton}>
              {pending ? <Loader2 className="size-4.5 animate-spin" aria-hidden /> : null}
              {pending ? "Saving…" : "Receive stock"}
            </button>
          </div>
        </form>
      </Dialog>
    </>
  )
}

export interface BatchToEdit {
  id: string
  batchNo: string
  qtyRemaining: number
  costPrice: number
  salePrice: number
  expiryDate: string
}

/** Admin only. Edits the batch currently shown on this row — see the note
 * on updateBatch in actions.ts for why this is the one exception to
 * "a delivery is never edited, only added". */
export function EditBatchButton({ medicineName, batch }: { medicineName: string; batch: BatchToEdit }) {
  const [open, setOpen] = useState(false)
  const [result, action, pending] = useActionState<ActionResult | null, FormData>(
    updateBatch,
    null
  )
  const { formRef, captureValues } = useFormValues(result)
  useToastOnResult(result)

  useEffect(() => {
    if (result?.ok) {
      const timer = setTimeout(() => setOpen(false), 1400)
      return () => clearTimeout(timer)
    }
  }, [result])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Edit ${medicineName} stock`}
        className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Pencil className="size-4" aria-hidden />
      </button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={`Edit ${medicineName} stock`}
        description="For correcting a mistake in this batch's own record, not for a sale, which changes the count on its own."
      >
        <form
          ref={formRef}
          action={action}
          onSubmit={captureValues}
          className="flex flex-col gap-4"
        >
          <input type="hidden" name="batch_id" value={batch.id} />

          <Field label="Batch number" htmlFor="edit_batch_no" required>
            <input
              id="edit_batch_no"
              name="batch_no"
              required
              autoComplete="off"
              defaultValue={batch.batchNo}
              className={controlClass}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Quantity remaining" htmlFor="qty_remaining" required>
              <input
                id="qty_remaining"
                name="qty_remaining"
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                required
                defaultValue={batch.qtyRemaining}
                className={controlClass}
              />
            </Field>
            <Field label="Expiry date" htmlFor="edit_expiry_date" required>
              <input
                id="edit_expiry_date"
                name="expiry_date"
                type="date"
                required
                defaultValue={batch.expiryDate}
                className={controlClass}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Cost price" htmlFor="edit_cost_price" required>
              <input
                id="edit_cost_price"
                name="cost_price"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                required
                defaultValue={batch.costPrice}
                className={controlClass}
              />
            </Field>
            <Field label="Sale price" htmlFor="edit_sale_price" required>
              <input
                id="edit_sale_price"
                name="sale_price"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                required
                defaultValue={batch.salePrice}
                className={controlClass}
              />
            </Field>
          </div>

          <FormMessage result={result} />

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setOpen(false)} className={outlineButton}>
              Cancel
            </button>
            <button type="submit" disabled={pending} className={primaryButton}>
              {pending ? <Loader2 className="size-4.5 animate-spin" aria-hidden /> : null}
              {pending ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </Dialog>
    </>
  )
}

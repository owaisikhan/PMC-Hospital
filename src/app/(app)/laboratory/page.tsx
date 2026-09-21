import Link from "next/link"
import { CircleDashed, CircleCheck, CircleX, FlaskConical, Send } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import type { PatientOption } from "@/components/patients/admit-dialog"
import {
  NewLabOrderButton,
  UpdateLabOrderButton,
  type TestOption,
} from "@/components/laboratory/lab-dialogs"
import { Badge } from "@/components/ui/badge"
import { formatPKR } from "@/lib/format"
import {
  LAB_FILTER_LABELS,
  LAB_STATUS_LABELS,
  isLabFilter,
  type LabFilter,
  type LabStatus,
} from "@/lib/lab"
import { createClient } from "@/lib/supabase/server"
import { requireProfile } from "@/lib/supabase/session"
import { cn } from "@/lib/utils"

export const metadata = { title: "Laboratory" }

interface OrderRow {
  id: string
  patient_id: string
  test_id: string
  ordered_on: string
  status: LabStatus
  charge_amount: number | string
  // null for a staff login — lab_orders_view masks it, this just carries
  // that through the rest of the page.
  cost_amount: number | string | null
  external_lab: string | null
  result_note: string | null
}

const STATUS_STYLE: Record<
  LabStatus,
  { variant: "neutral" | "info" | "success" | "destructive"; icon: typeof CircleDashed }
> = {
  ordered: { variant: "neutral", icon: CircleDashed },
  sample_sent: { variant: "info", icon: Send },
  resulted: { variant: "success", icon: CircleCheck },
  cancelled: { variant: "destructive", icon: CircleX },
}

export default async function LaboratoryPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string }>
}) {
  const { show } = await searchParams
  const filter: LabFilter = isLabFilter(show) ? show : "open"

  const profile = await requireProfile()
  const isAdmin = profile.role === "admin"
  const supabase = await createClient()

  // The masked view, not lab_orders directly - staff must not see
  // cost_amount. Patient and test names are fetched separately below and
  // joined in JS, rather than nested-embedded here: PostgREST resolves an
  // embed via the foreign key metadata on the queried relation, and a view
  // wrapping a table does not carry that over.
  let request = supabase
    .from("lab_orders_view")
    .select("id, patient_id, test_id, ordered_on, status, charge_amount, cost_amount, external_lab, result_note")
    .order("ordered_on", { ascending: false })
    .order("created_at", { ascending: false })

  if (filter === "open") {
    request = request.in("status", ["ordered", "sample_sent"])
  }

  const [ordersResult, testsResult, patientsResult, settingsResult] = await Promise.all([
    request,
    supabase
      .from("lab_tests")
      .select("id, name, external_lab, charge_price")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("patients")
      .select("id, mrn, full_name, date_of_birth, admissions!left(id)")
      .is("admissions.discharged_on", null)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase.from("settings").select("value").eq("key", "lab_mode").maybeSingle(),
  ])

  const orders = (ordersResult.data ?? []) as unknown as OrderRow[]
  const isExternal = settingsResult.data?.value !== "in_house"

  const tests: TestOption[] = (testsResult.data ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    externalLab: t.external_lab,
    chargePrice: Number(t.charge_price),
  }))
  const testNameById = new Map(tests.map((t) => [t.id, t.name]))

  // Orders can reference a discharged patient or an inactive test, neither of
  // which is in the two lists above (admitted patients only; active tests
  // only), so names missing from those lists are fetched separately here -
  // by exactly the ids this page's orders actually reference, not a second
  // copy of the same broad list.
  const missingTestIds = [...new Set(orders.map((o) => o.test_id))].filter(
    (id) => !testNameById.has(id)
  )
  const orderPatientIds = [...new Set(orders.map((o) => o.patient_id))]

  const [extraTestsResult, orderPatientsResult] = await Promise.all([
    missingTestIds.length > 0
      ? supabase.from("lab_tests").select("id, name").in("id", missingTestIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    orderPatientIds.length > 0
      ? supabase.from("patients").select("id, mrn, full_name").in("id", orderPatientIds)
      : Promise.resolve({ data: [] as { id: string; mrn: string; full_name: string }[] }),
  ])
  for (const t of extraTestsResult.data ?? []) testNameById.set(t.id, t.name)
  const orderPatientById = new Map(
    ((orderPatientsResult.data ?? []) as { id: string; mrn: string; full_name: string }[]).map(
      (p) => [p.id, p]
    )
  )

  const patients: PatientOption[] = (
    (patientsResult.data ?? []) as unknown as {
      id: string
      mrn: string
      full_name: string
      date_of_birth: string
      admissions: { id: string }[]
    }[]
  ).map((p) => ({
    id: p.id,
    mrn: p.mrn,
    fullName: p.full_name,
    dateOfBirth: p.date_of_birth,
    isAdmitted: p.admissions.length > 0,
  }))

  const billable = orders.filter((order) => order.status !== "cancelled")
  const charged = billable.reduce((sum, o) => sum + Number(o.charge_amount), 0)
  const cost = billable.reduce((sum, o) => sum + Number(o.cost_amount), 0)

  return (
    <>
      <PageHeader
        title="Laboratory"
        description={
          isExternal
            ? isAdmin
              ? "Tests sent to outside labs. What the family is charged, and what the lab costs PMC."
              : "Tests sent to outside labs."
            : "Tests run in PMC's own laboratory."
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div
              role="group"
              aria-label="Filter tests"
              className="inline-flex rounded-lg border border-border bg-card p-0.5"
            >
              {(Object.keys(LAB_FILTER_LABELS) as LabFilter[]).map((key) => {
                const base = "rounded-md px-3.5 py-2 text-base font-medium transition-colors"
                if (key === filter) {
                  return (
                    <span
                      key={key}
                      aria-current="true"
                      className={cn(base, "bg-primary text-primary-foreground")}
                    >
                      {LAB_FILTER_LABELS[key]}
                    </span>
                  )
                }
                return (
                  <Link
                    key={key}
                    href={`/laboratory?show=${key}`}
                    scroll={false}
                    className={cn(base, "text-muted-foreground hover:text-foreground")}
                  >
                    {LAB_FILTER_LABELS[key]}
                  </Link>
                )
              })}
            </div>
            <NewLabOrderButton patients={patients} tests={tests} />
          </div>
        }
      />

      <div className="flex flex-col gap-4 px-4 py-6 sm:px-6">
        {ordersResult.error ? (
          <p role="alert" className="rounded-lg bg-destructive/12 px-3 py-2.5 text-base text-destructive">
            Could not load lab orders: {ordersResult.error.message}
          </p>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-6 py-14 text-center">
            <FlaskConical className="size-8 text-muted-foreground" aria-hidden />
            <p className="text-base font-medium">
              {filter === "open" ? "No tests are waiting." : "No tests ordered yet."}
            </p>
            <p className="text-base text-muted-foreground">
              {filter === "open"
                ? "Every test ordered has a result."
                : "Use “New lab order” above to order the first one."}
            </p>
          </div>
        ) : (
          <>
            <p className="text-base text-muted-foreground">
              {orders.length} {orders.length === 1 ? "test" : "tests"} · charged{" "}
              <span className="font-medium whitespace-nowrap text-foreground tabular-nums">
                {formatPKR(charged)}
              </span>
              {isAdmin ? (
                <>
                  {" "}
                  · cost{" "}
                  <span className="font-medium whitespace-nowrap text-foreground tabular-nums">
                    {formatPKR(cost)}
                  </span>{" "}
                  · margin{" "}
                  <span className="font-semibold whitespace-nowrap text-success tabular-nums">
                    {formatPKR(charged - cost)}
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
              <table className="w-full min-w-[56rem] border-collapse text-base">
                <caption className="sr-only">
                  Lab tests ordered, with status, charge and cost
                </caption>
                <thead>
                  <tr className="border-b border-border text-left">
                    <th scope="col" className="w-14 px-4 py-3 font-medium">S#</th>
                    <th scope="col" className="px-4 py-3 font-medium">Patient</th>
                    <th scope="col" className="px-4 py-3 font-medium">Test</th>
                    <th scope="col" className="px-4 py-3 font-medium">Ordered on</th>
                    <th scope="col" className="px-4 py-3 font-medium">Lab</th>
                    <th scope="col" className="px-4 py-3 font-medium">Status</th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">Charge</th>
                    {isAdmin ? (
                      <th scope="col" className="px-4 py-3 text-right font-medium">Cost</th>
                    ) : null}
                    <th scope="col" className="px-4 py-3 font-medium">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order, index) => {
                    const style = STATUS_STYLE[order.status]
                    const StatusIcon = style.icon
                    const patient = orderPatientById.get(order.patient_id) ?? null
                    const testName = testNameById.get(order.test_id) ?? null

                    return (
                      <tr key={order.id} className="border-b border-border/60 last:border-b-0">
                        <td className="px-4 py-3 text-muted-foreground tabular-nums">
                          {index + 1}
                        </td>

                        <td className="px-4 py-3">
                          {patient ? (
                            <Link
                              href={`/patients/${patient.id}`}
                              className="font-medium underline-offset-4 hover:underline"
                            >
                              {patient.full_name}
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                          {patient ? (
                            <span className="block text-sm text-muted-foreground tabular-nums">
                              {patient.mrn}
                            </span>
                          ) : null}
                        </td>

                        <td className="px-4 py-3">
                          <span>{testName ?? "—"}</span>
                          {order.result_note ? (
                            <span className="block text-sm text-muted-foreground">
                              {order.result_note}
                            </span>
                          ) : null}
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                          {order.ordered_on}
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                          {order.external_lab ?? "—"}
                        </td>

                        {/* Word and icon both change, so status never rests on
                            colour alone. */}
                        <td className="px-4 py-3">
                          <Badge variant={style.variant} className="text-sm whitespace-nowrap">
                            <StatusIcon className="size-3.5" aria-hidden />
                            {LAB_STATUS_LABELS[order.status]}
                          </Badge>
                        </td>

                        <td className="px-4 py-3 text-right font-medium whitespace-nowrap tabular-nums">
                          {formatPKR(Number(order.charge_amount))}
                        </td>

                        {isAdmin ? (
                          <td className="px-4 py-3 text-right whitespace-nowrap text-muted-foreground tabular-nums">
                            {formatPKR(Number(order.cost_amount))}
                          </td>
                        ) : null}

                        <td className="px-4 py-3">
                          <UpdateLabOrderButton
                            orderId={order.id}
                            testName={testName ?? "Test"}
                            patientName={patient?.full_name ?? "this patient"}
                            status={order.status}
                            resultNote={order.result_note}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  )
}

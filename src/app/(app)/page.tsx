import { BedDouble, CalendarCheck, Stethoscope, Users } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { StatCard } from "@/components/stat-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// Placeholder figures. Swap for real queries once the data layer is chosen.
const stats = [
  { label: "Patients today", value: "248", icon: Users, trend: "+12 vs yesterday", trendDirection: "up" as const },
  { label: "Appointments", value: "86", icon: CalendarCheck, trend: "14 awaiting check-in", trendDirection: "flat" as const },
  { label: "Beds occupied", value: "132 / 180", icon: BedDouble, trend: "73% occupancy", trendDirection: "flat" as const },
  { label: "Doctors on duty", value: "37", icon: Stethoscope, trend: "4 on call", trendDirection: "flat" as const },
]

const upcoming = [
  { time: "09:00", patient: "Ayesha Khan", doctor: "Dr. Imran Ali", department: "Cardiology", status: "checked-in" as const },
  { time: "09:30", patient: "Bilal Ahmed", doctor: "Dr. Sana Yousaf", department: "Orthopedics", status: "scheduled" as const },
  { time: "10:15", patient: "Fatima Noor", doctor: "Dr. Imran Ali", department: "Cardiology", status: "scheduled" as const },
  { time: "11:00", patient: "Hamza Tariq", doctor: "Dr. Zara Malik", department: "Neurology", status: "in-progress" as const },
]

const statusVariant = {
  "checked-in": "info",
  scheduled: "neutral",
  "in-progress": "success",
} as const

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Hospital activity at a glance."
        actions={<Button size="sm">New appointment</Button>}
      />

      <div className="flex flex-col gap-5 px-4 py-6 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Today&apos;s schedule</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="flex flex-col divide-y divide-border">
                {upcoming.map((slot) => (
                  <li
                    key={`${slot.time}-${slot.patient}`}
                    className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5 first:pt-0"
                  >
                    <span className="w-12 shrink-0 text-sm font-medium tabular-nums">
                      {slot.time}
                    </span>
                    <span className="min-w-0 flex-1 text-sm">
                      <span className="font-medium">{slot.patient}</span>
                      <span className="text-muted-foreground"> · {slot.department}</span>
                    </span>
                    <span className="text-sm text-muted-foreground">{slot.doctor}</span>
                    <Badge variant={statusVariant[slot.status]}>{slot.status}</Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ward occupancy</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 pt-0">
              {[
                { ward: "General", occupied: 48, total: 60 },
                { ward: "ICU", occupied: 18, total: 20 },
                { ward: "Maternity", occupied: 26, total: 40 },
                { ward: "Pediatrics", occupied: 40, total: 60 },
              ].map((ward) => {
                const pct = Math.round((ward.occupied / ward.total) * 100)

                return (
                  <div key={ward.ward} className="flex flex-col gap-1.5">
                    <div className="flex items-baseline justify-between text-sm">
                      <span>{ward.ward}</span>
                      <span className="text-muted-foreground tabular-nums">
                        {ward.occupied}/{ward.total}
                      </span>
                    </div>
                    <div
                      role="meter"
                      aria-label={`${ward.ward} occupancy`}
                      aria-valuenow={pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
                    >
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}

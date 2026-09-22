import { MapPin } from "lucide-react"

import { ComputerIcon, PhoneIcon, TabletIcon } from "@/components/badge-icons"
import { SignOutDeviceButton } from "@/components/settings/login-dialogs"
import type { Login, Session } from "@/components/settings/permissions-section"
import { Badge } from "@/components/ui/badge"
import { describeDevice, describePlace, deviceKind, timeAgo } from "@/lib/device"

const KIND_ICON = { phone: PhoneIcon, tablet: TabletIcon, computer: ComputerIcon }

/**
 * Every device each login is signed in on right now, grouped by person, the
 * admin's own group first and their current device at the top of it.
 *
 * Places are approximate by nature - they come from the IP address, and that
 * is where the connection meets the internet, which on mobile data can be a
 * city or two away. The note under the heading says so, so nobody reads a
 * "Peshawar" as proof someone was in Peshawar.
 */
export function DevicesSection({
  logins,
  sessions,
  currentUserId,
  currentSessionId,
}: {
  logins: Login[]
  sessions: Session[]
  currentUserId: string
  currentSessionId: string | null
}) {
  const nameById = new Map(logins.map((login) => [login.id, login.fullName]))

  const byUser = new Map<string, Session[]>()
  for (const session of sessions) {
    const list = byUser.get(session.userId) ?? []
    list.push(session)
    byUser.set(session.userId, list)
  }

  const groups = [...byUser.entries()]
    .map(([userId, list]) => ({
      userId,
      name: nameById.get(userId) ?? "Unknown login",
      isSelf: userId === currentUserId,
      devices: [...list].sort((a, b) => {
        if (a.sessionId === currentSessionId) return -1
        if (b.sessionId === currentSessionId) return 1
        return b.lastSeenAt.localeCompare(a.lastSeenAt)
      }),
    }))
    .sort((a, b) => {
      if (a.isSelf !== b.isSelf) return a.isSelf ? -1 : 1
      return b.devices[0].lastSeenAt.localeCompare(a.devices[0].lastSeenAt)
    })

  return (
    <section className="overflow-hidden rounded-xl surface" aria-labelledby="devices-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border px-4 py-3.5">
        <h2 id="devices-heading" className="text-base font-semibold tracking-tight">
          Signed-in devices
        </h2>
        <p className="text-sm text-muted-foreground">
          {sessions.length} {sessions.length === 1 ? "device" : "devices"} · places are
          approximate, from the internet connection
        </p>
      </div>

      {groups.length === 0 ? (
        <p className="px-4 py-6 text-center text-base text-muted-foreground">
          Nobody is signed in on any device.
        </p>
      ) : (
        groups.map((group) => (
          <div key={group.userId} className="border-b border-border/60 last:border-b-0">
            <p className="px-4 pt-3.5 pb-1 text-sm font-medium text-muted-foreground">
              {group.name}
              {group.isSelf ? " (you)" : ""}
              {" · "}
              {group.devices.length} {group.devices.length === 1 ? "device" : "devices"}
            </p>
            <ul>
              {group.devices.map((device) => {
                const isCurrent = device.sessionId === currentSessionId
                const Icon = KIND_ICON[deviceKind(device.userAgent)]
                const label = describeDevice(device.userAgent)
                const place = describePlace(device.city, device.country)
                const ip = device.seenIp ?? device.ip

                return (
                  <li
                    key={device.sessionId}
                    className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3"
                  >
                    <Icon className="size-10 shrink-0 drop-shadow-[0_3px_5px_rgb(0_0_0/0.18)]" />

                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 font-medium">
                        {label}
                        {isCurrent ? (
                          <Badge variant="success" className="text-xs">
                            This device
                          </Badge>
                        ) : null}
                      </p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground">
                        <MapPin className="size-3.5 shrink-0" aria-hidden />
                        <span>{place ?? "Place not known yet"}</span>
                        {ip ? <span className="font-mono text-xs">· {ip}</span> : null}
                      </p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        Active {timeAgo(device.lastSeenAt)} · signed in {timeAgo(device.createdAt)}
                      </p>
                    </div>

                    {isCurrent ? null : (
                      <SignOutDeviceButton
                        sessionId={device.sessionId}
                        name={group.isSelf ? "yourself" : group.name}
                        device={label}
                      />
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        ))
      )}
    </section>
  )
}

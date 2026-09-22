import { UserRoundCheck } from "lucide-react"

import { CreateLoginButton } from "@/components/settings/create-login-dialog"
import {
  DeactivateButton,
  DemoteButton,
  PromoteButton,
  ReactivateButton,
  ResetPasswordButton,
} from "@/components/settings/login-dialogs"
import { Badge } from "@/components/ui/badge"
import { describeDevice, timeAgo } from "@/lib/device"
import { ROLE_LABELS, type UserRole } from "@/lib/roles"

export interface Login {
  id: string
  fullName: string
  /** Set only for a staff login — what they actually type to sign in. */
  username: string | null
  email: string
  role: UserRole
  isActive: boolean
}

export interface Session {
  userId: string
  sessionId: string
  userAgent: string | null
  createdAt: string
  /** refreshed_at when the session has been used since, else createdAt. */
  lastSeenAt: string
}

const ROLES: UserRole[] = ["admin", "staff"]

export function PermissionsSection({
  logins,
  sessions,
  currentUserId,
}: {
  logins: Login[]
  sessions: Session[]
  currentUserId: string
}) {
  const pending = logins.filter((login) => !login.isActive)
  const active = logins.filter((login) => login.isActive)

  // One row per login, so each shows its single most recent device rather
  // than every device it has ever signed in from.
  const latestSessionByUser = new Map<string, Session>()
  for (const session of sessions) {
    const current = latestSessionByUser.get(session.userId)
    if (!current || session.lastSeenAt > current.lastSeenAt) {
      latestSessionByUser.set(session.userId, session)
    }
  }
  const sessionCountByUser = new Map<string, number>()
  for (const session of sessions) {
    sessionCountByUser.set(session.userId, (sessionCountByUser.get(session.userId) ?? 0) + 1)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-base text-muted-foreground">
          {logins.length} {logins.length === 1 ? "login" : "logins"} created
          {pending.length > 0 ? ` · ${pending.length} pending` : ""}
        </p>
        <CreateLoginButton />
      </div>

      <div className="overflow-hidden rounded-xl surface">
        <table className="w-full border-collapse text-base">
          <caption className="sr-only">Active users by role</caption>
          <thead>
            <tr className="border-b border-border text-left">
              <th scope="col" className="px-4 py-3 font-medium">
                Role
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium">
                Active users
              </th>
            </tr>
          </thead>
          <tbody>
            {ROLES.map((role) => (
              <tr key={role} className="border-b border-border/60 last:border-b-0">
                <td className="px-4 py-3">{ROLE_LABELS[role]}</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {active.filter((login) => login.role === role).length}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pending.length > 0 ? (
        <p className="flex items-center gap-2 rounded-lg bg-warning/18 px-3 py-2.5 text-base text-warning-foreground">
          <UserRoundCheck className="size-4.5 shrink-0" aria-hidden />
          {pending.length} {pending.length === 1 ? "login is" : "logins are"} deactivated.
        </p>
      ) : null}

      <div className="relative min-w-0 overflow-x-auto rounded-xl surface">
        <table className="w-full min-w-[52rem] border-collapse text-base">
          <caption className="sr-only">Every login, its access and where it is signed in</caption>
          <thead>
            <tr className="border-b border-border text-left">
              <th scope="col" className="px-4 py-3 font-medium">
                Name
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Login
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Role
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Status
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Last seen
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {logins.map((login) => {
              const isSelf = login.id === currentUserId
              const latest = latestSessionByUser.get(login.id)
              const deviceCount = sessionCountByUser.get(login.id) ?? 0

              return (
                <tr key={login.id} className="border-b border-border/60 last:border-b-0">
                  <td className="px-4 py-3">
                    <span className="font-medium">{login.fullName}</span>
                    {isSelf ? (
                      <span className="ml-1.5 text-sm text-muted-foreground">(you)</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                    {login.username ? (
                      <span className="font-mono text-sm">{login.username}</span>
                    ) : (
                      login.email
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={login.role === "admin" ? "default" : "neutral"}>
                      {ROLE_LABELS[login.role]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={login.isActive ? "success" : "warning"}>
                      {login.isActive ? "Active" : "Deactivated"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {latest ? (
                      <>
                        <span className="flex items-center gap-1.5 text-success">
                          <span className="size-1.5 shrink-0 rounded-full bg-success" aria-hidden />
                          {timeAgo(latest.lastSeenAt)}
                        </span>
                        <span className="block text-sm text-muted-foreground">
                          {describeDevice(latest.userAgent)}
                          {deviceCount > 1 ? ` · ${deviceCount} devices` : ""}
                        </span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">Never signed in</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {isSelf ? null : (
                      <div className="flex flex-wrap items-center gap-2">
                        {!login.isActive ? (
                          // A fresh login is created active; the only way one
                          // ends up deactivated is DeactivateButton below, so
                          // reactivating it always keeps its existing role.
                          <ReactivateButton
                            userId={login.id}
                            name={login.fullName}
                            role={login.role}
                          />
                        ) : (
                          <>
                            {login.role === "staff" ? (
                              <PromoteButton userId={login.id} name={login.fullName} />
                            ) : (
                              <DemoteButton userId={login.id} name={login.fullName} />
                            )}
                            <DeactivateButton
                              userId={login.id}
                              name={login.fullName}
                              role={login.role}
                            />
                          </>
                        )}
                        <ResetPasswordButton userId={login.id} name={login.fullName} />
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

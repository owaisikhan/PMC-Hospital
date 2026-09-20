import { UserRoundCheck } from "lucide-react"

import {
  ApproveLoginButton,
  DeactivateButton,
  DemoteButton,
  PromoteButton,
  ReactivateButton,
} from "@/components/settings/login-dialogs"
import { Badge } from "@/components/ui/badge"
import { ROLE_LABELS, type UserRole } from "@/lib/roles"

export interface Login {
  id: string
  fullName: string
  email: string
  role: UserRole
  isActive: boolean
}

const ROLES: UserRole[] = ["admin", "staff"]

export function PermissionsSection({
  logins,
  currentUserId,
}: {
  logins: Login[]
  currentUserId: string
}) {
  const pending = logins.filter((login) => !login.isActive)
  const active = logins.filter((login) => login.isActive)

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-xl border border-border bg-card">
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
          {pending.length} {pending.length === 1 ? "signup is" : "signups are"} waiting for
          approval.
        </p>
      ) : null}

      <div className="relative min-w-0 overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[40rem] border-collapse text-base">
          <caption className="sr-only">Every login and its access</caption>
          <thead>
            <tr className="border-b border-border text-left">
              <th scope="col" className="px-4 py-3 font-medium">
                Name
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Email
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Role
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Status
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {logins.map((login) => {
              const isSelf = login.id === currentUserId
              return (
                <tr key={login.id} className="border-b border-border/60 last:border-b-0">
                  <td className="px-4 py-3">
                    <span className="font-medium">{login.fullName}</span>
                    {isSelf ? (
                      <span className="ml-1.5 text-sm text-muted-foreground">(you)</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                    {login.email}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={login.role === "admin" ? "default" : "neutral"}>
                      {ROLE_LABELS[login.role]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={login.isActive ? "success" : "warning"}>
                      {login.isActive ? "Active" : "Pending"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {isSelf ? null : (
                      <div className="flex flex-wrap items-center gap-2">
                        {!login.isActive ? (
                          // A fresh signup always lands as staff (the database
                          // assigns that on sign-up), so this reads as "Approve"
                          // there and "Reactivate" for an admin someone
                          // deactivated earlier — both just turn is_active back
                          // on without touching the role.
                          login.role === "staff" ? (
                            <ApproveLoginButton userId={login.id} name={login.fullName} />
                          ) : (
                            <ReactivateButton
                              userId={login.id}
                              name={login.fullName}
                              role={login.role}
                            />
                          )
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

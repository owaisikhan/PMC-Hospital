"use client"

import { createContext, useContext, type ReactNode } from "react"

import type { UserRole } from "@/lib/roles"

const RoleContext = createContext<UserRole>("staff")

/**
 * The signed-in role, published by the app layout.
 *
 * It exists for the loading skeletons. A loading.tsx is a static fallback -
 * it cannot await anything, so it cannot look up the profile - but the layout
 * around it has already resolved by the time it renders. Without this the
 * dashboard skeleton would have to guess a role and then jump when the real
 * page disagreed.
 */
export function RoleProvider({
  role,
  children,
}: {
  role: UserRole
  children: ReactNode
}) {
  return <RoleContext.Provider value={role}>{children}</RoleContext.Provider>
}

export function useRole() {
  return useContext(RoleContext)
}

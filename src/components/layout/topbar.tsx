import { SignOutButton } from "@/components/layout/sign-out-button"
import type { SessionProfile } from "@/lib/supabase/session"

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

export function Topbar({ profile }: { profile: SessionProfile }) {
  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-sm sm:px-6">
      <div className="ml-auto flex items-center gap-3">
        <span className="flex flex-col text-right leading-tight">
          <span className="text-sm font-medium">{profile.fullName}</span>
          <span className="text-xs text-muted-foreground capitalize">
            {profile.role}
          </span>
        </span>
        <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
          {initials(profile.fullName)}
        </span>
        <SignOutButton />
      </div>
    </header>
  )
}

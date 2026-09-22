import { MobileNav } from "@/components/layout/mobile-nav"
import { SignOutButton } from "@/components/layout/sign-out-button"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import type { SessionProfile } from "@/lib/supabase/session"

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

export function Topbar({
  profile,
  logoUrl,
}: {
  profile: SessionProfile
  logoUrl?: string | null
}) {
  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/85 px-2 backdrop-blur-sm sm:gap-3 sm:px-6">
      <MobileNav role={profile.role} logoUrl={logoUrl} />
      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        {/* On a phone the initials carry who is signed in; the full name and
            role would push the switch and sign-out off a narrow bar. */}
        <span className="hidden flex-col text-right leading-tight sm:flex">
          <span className="text-sm font-medium">{profile.fullName}</span>
          <span className="text-xs text-muted-foreground capitalize">{profile.role}</span>
        </span>
        <span
          title={`${profile.fullName} (${profile.role})`}
          className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary"
        >
          {initials(profile.fullName)}
        </span>
        <ThemeToggle />
        <SignOutButton />
      </div>
    </header>
  )
}

import { LogOut } from "lucide-react"

/**
 * A form rather than a link: see the note in app/auth/signout/route.ts — a
 * prefetched <Link> to the sign-out route logged people out on its own.
 */
export function SignOutButton({ className }: { className?: string }) {
  return (
    <form action="/auth/signout" method="post" className={className}>
      <button
        type="submit"
        aria-label="Sign out"
        className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <LogOut className="size-4" />
      </button>
    </form>
  )
}

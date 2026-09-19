import { ShieldAlert } from "lucide-react"

export const metadata = { title: "Awaiting approval" }

export default function PendingApprovalPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/40 px-4 py-10">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 text-center">
        <span className="mx-auto mb-3 flex size-11 items-center justify-center rounded-xl bg-warning/15 text-warning-foreground">
          <ShieldAlert className="size-5" />
        </span>
        <h1 className="text-base font-semibold">Account awaiting approval</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account has been created but an administrator has not activated it
          yet. Please ask the hospital administrator to enable your access.
        </p>
        <form action="/auth/signout" method="post" className="mt-4">
          <button
            type="submit"
            className="text-sm text-primary underline-offset-4 hover:underline"
          >
            Sign out
          </button>
        </form>
      </div>
    </main>
  )
}

/**
 * Supabase's auth errors are written for developers. The people signing in here
 * are hospital staff, so every message they can actually hit gets rewritten as
 * something that says what to do next.
 */
export function describeAuthError(raw: string): string {
  const message = raw.toLowerCase()

  if (message.includes("already registered") || message.includes("already been registered")) {
    return "An account with this email already exists. Sign in instead, or ask the administrator to reset it."
  }
  if (message.includes("invalid login credentials")) {
    return "Email or password is incorrect."
  }
  if (message.includes("email not confirmed")) {
    return "This email has not been confirmed yet. Check the inbox for the confirmation link."
  }
  if (message.includes("password") && message.includes("least")) {
    return "That password is too short. Use at least 8 characters."
  }
  if (message.includes("invalid") && message.includes("email")) {
    return "That does not look like a valid email address."
  }
  if (message.includes("rate limit") || message.includes("too many")) {
    return "Too many attempts. Wait a minute and try again."
  }
  if (
    message.includes("fetch") ||
    message.includes("network") ||
    message.includes("failed to")
  ) {
    return "Could not reach the server. Check the internet connection and try again."
  }
  if (message.includes("signups not allowed") || message.includes("signup is disabled")) {
    return "New accounts are switched off. Ask the administrator to create one for you."
  }

  return "Something went wrong. Please try again, and tell the administrator if it keeps happening."
}

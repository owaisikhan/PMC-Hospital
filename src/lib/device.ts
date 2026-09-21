/**
 * A readable label for a session's user_agent, and how long ago it was last
 * seen - both simple, hand-rolled checks rather than a dependency, since the
 * only thing that matters here is "roughly which device, roughly when" for
 * an admin skimming a short list, not perfect detection.
 */
export function describeDevice(userAgent: string | null): string {
  if (!userAgent) return "Unknown device"

  let os = "Unknown OS"
  if (/iphone|ipad|ipod/i.test(userAgent)) os = "iOS"
  else if (/android/i.test(userAgent)) os = "Android"
  else if (/windows/i.test(userAgent)) os = "Windows"
  else if (/mac os x|macintosh/i.test(userAgent)) os = "Mac"
  else if (/linux/i.test(userAgent)) os = "Linux"

  let browser = "Unknown browser"
  if (/edg\//i.test(userAgent)) browser = "Edge"
  else if (/crios\//i.test(userAgent)) browser = "Chrome"
  else if (/chrome\//i.test(userAgent) && !/edg\//i.test(userAgent)) browser = "Chrome"
  else if (/firefox\//i.test(userAgent)) browser = "Firefox"
  else if (/safari\//i.test(userAgent) && !/chrome\//i.test(userAgent)) browser = "Safari"

  return `${os} · ${browser}`
}

const RELATIVE_TIME = new Intl.RelativeTimeFormat("en", { numeric: "auto" })
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31536000],
  ["month", 2592000],
  ["week", 604800],
  ["day", 86400],
  ["hour", 3600],
  ["minute", 60],
]

/** "3 minutes ago", "yesterday" - a plain-language distance from now. */
export function timeAgo(iso: string): string {
  const diffSeconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000)
  const abs = Math.abs(diffSeconds)

  for (const [unit, secondsInUnit] of UNITS) {
    if (abs >= secondsInUnit) {
      return RELATIVE_TIME.format(Math.round(diffSeconds / secondsInUnit), unit)
    }
  }
  return RELATIVE_TIME.format(diffSeconds, "second")
}

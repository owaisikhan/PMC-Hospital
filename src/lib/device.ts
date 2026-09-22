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

/** Which icon a device gets. An iPad on iPadOS 13+ claims to be a Mac. */
export function deviceKind(userAgent: string | null): "phone" | "tablet" | "computer" {
  if (!userAgent) return "computer"
  if (/ipad|tablet/i.test(userAgent) || (/android/i.test(userAgent) && !/mobile/i.test(userAgent))) {
    return "tablet"
  }
  if (/iphone|ipod|android|mobile/i.test(userAgent)) return "phone"
  return "computer"
}

const COUNTRY_NAMES = new Intl.DisplayNames(["en"], { type: "region" })

/**
 * "Nowshera, Pakistan" from Vercel's city name and ISO country code. Null
 * when neither is known yet - a session that has not made a request since
 * locations started being recorded, or anything running locally.
 */
export function describePlace(city: string | null, country: string | null): string | null {
  let countryName: string | null = null
  if (country) {
    try {
      countryName = COUNTRY_NAMES.of(country) ?? country
    } catch {
      countryName = country
    }
  }
  if (city && countryName) return `${city}, ${countryName}`
  return city ?? countryName
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

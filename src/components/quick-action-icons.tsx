import { useId, type ReactNode } from "react"

/**
 * Illustrated icons for the dashboard's Quick Actions. Each is a glossy
 * rounded badge in its own colour with a white glyph on top, so the five
 * tiles can be told apart at a glance rather than all reading as the same
 * blue outline. The badge carries its own colour, so one drawing works on
 * both the light and the dark theme.
 */

export type QuickActionIcon = (props: { className?: string }) => ReactNode

function Badge({
  from,
  to,
  className,
  children,
}: {
  from: string
  to: string
  className?: string
  children: ReactNode
}) {
  // Two badges on one page must not share gradient ids, or the second would
  // silently paint with the first one's colours.
  const id = useId()
  const fill = `${id}-fill`
  const gloss = `${id}-gloss`

  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden className={className}>
      <defs>
        <linearGradient id={fill} x1="8" y1="2" x2="40" y2="46" gradientUnits="userSpaceOnUse">
          <stop stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
        <linearGradient id={gloss} x1="24" y1="2" x2="24" y2="26" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fff" stopOpacity="0.35" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="44" height="44" rx="13" fill={`url(#${fill})`} />
      <path d="M2 15C2 7.8 7.8 2 15 2h18c7.2 0 13 5.8 13 13v7C33 27 15 27 2 22z" fill={`url(#${gloss})`} />
      <rect x="2.5" y="2.5" width="43" height="43" rx="12.5" stroke="#fff" strokeOpacity="0.22" />
      {children}
    </svg>
  )
}

const SKY = { from: "#4cc3f7", to: "#0a6aa8", ink: "#0a6aa8" }
const EMERALD = { from: "#43d9a3", to: "#05785a", ink: "#05785a" }
const VIOLET = { from: "#b39afc", to: "#6a2ed6", ink: "#6a2ed6" }
const AMBER = { from: "#fcc33c", to: "#d0600a", ink: "#c2570a" }
const ROSE = { from: "#fd8a9c", to: "#c0163f", ink: "#c0163f" }

/** A bed with a patient under the blanket, and a plus for "admit". */
export function AdmitPatientIcon({ className }: { className?: string }) {
  return (
    <Badge from={SKY.from} to={SKY.to} className={className}>
      <path d="M11.5 17v17" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M11.5 30h24a1.5 1.5 0 0 1 1.5 1.5V34" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="14" y="22.5" width="6.5" height="5" rx="2.5" fill="#fff" />
      <path d="M22.5 22.5H32a5 5 0 0 1 5 5v.5H22.5z" fill="#fff" fillOpacity="0.9" />
      <circle cx="34" cy="14.5" r="5.5" fill="#fff" />
      <path d="M34 11.8v5.4M31.3 14.5h5.4" stroke={SKY.ink} strokeWidth="2" strokeLinecap="round" />
    </Badge>
  )
}

/** A two-tone capsule and a scored tablet. */
export function PharmacySaleIcon({ className }: { className?: string }) {
  return (
    <Badge from={EMERALD.from} to={EMERALD.to} className={className}>
      <g transform="rotate(-45 21.5 21.5)">
        <rect x="10.5" y="16" width="22" height="11" rx="5.5" fill="#fff" fillOpacity="0.28" />
        <path d="M21.5 16H16a5.5 5.5 0 0 0 0 11h5.5z" fill="#fff" />
        <rect x="10.5" y="16" width="22" height="11" rx="5.5" stroke="#fff" strokeWidth="2.2" />
      </g>
      <circle cx="33" cy="33" r="6" fill="#fff" />
      <path d="M29.3 36.7l7.4-7.4" stroke={EMERALD.ink} strokeWidth="1.8" strokeLinecap="round" />
    </Badge>
  )
}

/** A conical flask, half full, with bubbles rising. */
export function LabOrderIcon({ className }: { className?: string }) {
  return (
    <Badge from={VIOLET.from} to={VIOLET.to} className={className}>
      <path d="M16.5 28.5h15l3 5a2 2 0 0 1-1.7 3H15.2a2 2 0 0 1-1.7-3z" fill="#fff" />
      <path
        d="M19.5 11.5h9M21 11.5v9.2L13.2 33.6a2.6 2.6 0 0 0 2.2 3.9h17.2a2.6 2.6 0 0 0 2.2-3.9L27 20.7v-9.2"
        stroke="#fff"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="22.5" cy="25" r="1.5" fill="#fff" />
      <circle cx="26" cy="21.5" r="1.1" fill="#fff" fillOpacity="0.8" />
      <circle cx="20" cy="32.5" r="1.3" fill={VIOLET.ink} fillOpacity="0.55" />
      <circle cx="27.5" cy="33" r="1" fill={VIOLET.ink} fillOpacity="0.55" />
    </Badge>
  )
}

/** A torn-off receipt with line items, and a plus for "new". */
export function NewInvoiceIcon({ className }: { className?: string }) {
  return (
    <Badge from={AMBER.from} to={AMBER.to} className={className}>
      <path d="M13 12a1.5 1.5 0 0 1 1.5-1.5h17A1.5 1.5 0 0 1 33 12v25l-3.3-2.2-3.4 2.2-3.3-2.2-3.3 2.2-3.4-2.2L13 37z" fill="#fff" />
      <path d="M17.5 17h11M17.5 21.5h11M17.5 26h6" stroke={AMBER.ink} strokeWidth="2" strokeLinecap="round" />
      <circle cx="34.5" cy="33.5" r="6" fill={AMBER.ink} stroke="#fff" strokeWidth="2" />
      <path d="M34.5 30.8v5.4M31.8 33.5h5.4" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </Badge>
  )
}

/** A wallet with a note sliding out of it. */
export function RecordExpenseIcon({ className }: { className?: string }) {
  return (
    <Badge from={ROSE.from} to={ROSE.to} className={className}>
      <rect x="15" y="10.5" width="17" height="11" rx="1.5" fill="#fff" fillOpacity="0.55" transform="rotate(-10 23.5 16)" />
      <rect x="11" y="17" width="26" height="20" rx="4" fill="#fff" />
      <rect x="27.5" y="23.5" width="11" height="7" rx="3.5" fill={ROSE.ink} />
      <circle cx="31.5" cy="27" r="1.4" fill="#fff" />
      <path d="M15 21.5h9" stroke={ROSE.ink} strokeOpacity="0.4" strokeWidth="1.8" strokeLinecap="round" />
    </Badge>
  )
}

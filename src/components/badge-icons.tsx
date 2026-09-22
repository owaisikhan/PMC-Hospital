import { useId, type ReactNode } from "react"

/**
 * Illustrated icons for the dashboard: a glossy rounded badge in its own
 * colour with a white glyph on top. The same subject always wears the same
 * colour (beds are sky, medicine is emerald, the lab is violet...), so a
 * stat card and the Quick Action that leads to it read as one thing. The
 * badge carries its own colour, so one drawing works on the light and the
 * dark theme alike.
 *
 * Plain functions of { className }, with no hooks beyond useId, so they
 * render in server and client components alike.
 */

export type BadgeIcon = (props: { className?: string }) => ReactNode

interface Palette {
  from: string
  to: string
  /** A deep shade of the badge, for details drawn on the white glyph. */
  ink: string
}

const SKY: Palette = { from: "#4cc3f7", to: "#0a6aa8", ink: "#0a6aa8" }
const INDIGO: Palette = { from: "#8fa2ff", to: "#3b3fc4", ink: "#3b3fc4" }
const EMERALD: Palette = { from: "#43d9a3", to: "#05785a", ink: "#05785a" }
const GREEN: Palette = { from: "#7ee07a", to: "#1d8a36", ink: "#1d8a36" }
const VIOLET: Palette = { from: "#b39afc", to: "#6a2ed6", ink: "#6a2ed6" }
const AMBER: Palette = { from: "#fcc33c", to: "#d0600a", ink: "#c2570a" }
const ROSE: Palette = { from: "#fd8a9c", to: "#c0163f", ink: "#c0163f" }

function Badge({
  palette,
  className,
  children,
}: {
  palette: Palette
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
          <stop stopColor={palette.from} />
          <stop offset="1" stopColor={palette.to} />
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

/* Glyphs - white drawings in the 48x48 badge, detailed in the badge's ink. */

function Bed() {
  return (
    <>
      <path d="M11.5 17v17" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M11.5 30h24a1.5 1.5 0 0 1 1.5 1.5V34" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="14" y="22.5" width="6.5" height="5" rx="2.5" fill="#fff" />
      <path d="M22.5 22.5H32a5 5 0 0 1 5 5v.5H22.5z" fill="#fff" fillOpacity="0.9" />
    </>
  )
}

function Medicine({ ink }: { ink: string }) {
  return (
    <>
      <g transform="rotate(-45 21.5 21.5)">
        <rect x="10.5" y="16" width="22" height="11" rx="5.5" fill="#fff" fillOpacity="0.28" />
        <path d="M21.5 16H16a5.5 5.5 0 0 0 0 11h5.5z" fill="#fff" />
        <rect x="10.5" y="16" width="22" height="11" rx="5.5" stroke="#fff" strokeWidth="2.2" />
      </g>
      <circle cx="33" cy="33" r="6" fill="#fff" />
      <path d="M29.3 36.7l7.4-7.4" stroke={ink} strokeWidth="1.8" strokeLinecap="round" />
    </>
  )
}

function Flask({ ink }: { ink: string }) {
  return (
    <>
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
      <circle cx="20" cy="32.5" r="1.3" fill={ink} fillOpacity="0.55" />
      <circle cx="27.5" cy="33" r="1" fill={ink} fillOpacity="0.55" />
    </>
  )
}

function Receipt({ ink }: { ink: string }) {
  return (
    <>
      <path d="M13 12a1.5 1.5 0 0 1 1.5-1.5h17A1.5 1.5 0 0 1 33 12v25l-3.3-2.2-3.4 2.2-3.3-2.2-3.3 2.2-3.4-2.2L13 37z" fill="#fff" />
      <path d="M17.5 17h11M17.5 21.5h11M17.5 26h6" stroke={ink} strokeWidth="2" strokeLinecap="round" />
    </>
  )
}

function Wallet({ ink }: { ink: string }) {
  return (
    <>
      <rect x="15" y="10.5" width="17" height="11" rx="1.5" fill="#fff" fillOpacity="0.55" transform="rotate(-10 23.5 16)" />
      <rect x="11" y="17" width="26" height="20" rx="4" fill="#fff" />
      <rect x="27.5" y="23.5" width="11" height="7" rx="3.5" fill={ink} />
      <circle cx="31.5" cy="27" r="1.4" fill="#fff" />
      <path d="M15 21.5h9" stroke={ink} strokeOpacity="0.4" strokeWidth="1.8" strokeLinecap="round" />
    </>
  )
}

/** Three bars climbing to the right, and an arrow going up with them. */
function Rising() {
  return (
    <>
      <rect x="12" y="28" width="6" height="9" rx="1.5" fill="#fff" fillOpacity="0.55" />
      <rect x="21" y="24" width="6" height="13" rx="1.5" fill="#fff" fillOpacity="0.75" />
      <rect x="30" y="19" width="6" height="18" rx="1.5" fill="#fff" />
      <path d="M11 22.5l7.5-6.5 5.5 3.5 11-8.5" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M30 10.5h5.5V16" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </>
  )
}

/** The same bars stepping down, and the arrow heading down with them. */
function Falling() {
  return (
    <>
      <rect x="12" y="19" width="6" height="18" rx="1.5" fill="#fff" />
      <rect x="21" y="24" width="6" height="13" rx="1.5" fill="#fff" fillOpacity="0.75" />
      <rect x="30" y="28" width="6" height="9" rx="1.5" fill="#fff" fillOpacity="0.55" />
      <path d="M11 11.5l11 8.5 5.5-3.5 7.5 6.5" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M35.5 17.5V23H30" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </>
  )
}

function People() {
  return (
    <>
      <circle cx="31" cy="18" r="4.2" fill="#fff" fillOpacity="0.6" />
      <path d="M26.5 35.5H38a1 1 0 0 0 1-1.1 7.9 7.9 0 0 0-12.4-6z" fill="#fff" fillOpacity="0.6" />
      <circle cx="20" cy="17.5" r="5.2" fill="#fff" />
      <path d="M10 35.5a10 10 0 0 1 20 0z" fill="#fff" />
    </>
  )
}

/** A small round badge at the lower right of a glyph: "new", or a warning. */
function Corner({ ink, mark }: { ink: string; mark: "plus" | "alert" }) {
  return (
    <>
      <circle cx="34.5" cy="33.5" r="6" fill={ink} stroke="#fff" strokeWidth="2" />
      {mark === "plus" ? (
        <path d="M34.5 30.8v5.4M31.8 33.5h5.4" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      ) : (
        <>
          <path d="M34.5 30.6v3.4" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
          <circle cx="34.5" cy="36.4" r="1.1" fill="#fff" />
        </>
      )}
    </>
  )
}

/* Quick Actions: the thing, plus a mark for "make a new one". */

export function AdmitPatientIcon({ className }: { className?: string }) {
  return (
    <Badge palette={SKY} className={className}>
      <Bed />
      <circle cx="34" cy="14.5" r="5.5" fill="#fff" />
      <path d="M34 11.8v5.4M31.3 14.5h5.4" stroke={SKY.ink} strokeWidth="2" strokeLinecap="round" />
    </Badge>
  )
}

export function PharmacySaleIcon({ className }: { className?: string }) {
  return (
    <Badge palette={EMERALD} className={className}>
      <Medicine ink={EMERALD.ink} />
    </Badge>
  )
}

export function LabOrderIcon({ className }: { className?: string }) {
  return (
    <Badge palette={VIOLET} className={className}>
      <Flask ink={VIOLET.ink} />
    </Badge>
  )
}

export function NewInvoiceIcon({ className }: { className?: string }) {
  return (
    <Badge palette={AMBER} className={className}>
      <Receipt ink={AMBER.ink} />
      <Corner ink={AMBER.ink} mark="plus" />
    </Badge>
  )
}

export function RecordExpenseIcon({ className }: { className?: string }) {
  return (
    <Badge palette={ROSE} className={className}>
      <Wallet ink={ROSE.ink} />
    </Badge>
  )
}

/* Stat and revenue cards: the same subjects, without the "new" mark. */

export function BedsIcon({ className }: { className?: string }) {
  return (
    <Badge palette={SKY} className={className}>
      <g transform="translate(0.5 -1.5)">
        <Bed />
      </g>
    </Badge>
  )
}

export function PatientsIcon({ className }: { className?: string }) {
  return (
    <Badge palette={INDIGO} className={className}>
      <People />
    </Badge>
  )
}

export const MedicineIcon = PharmacySaleIcon
export const LabIcon = LabOrderIcon

export function IncomeIcon({ className }: { className?: string }) {
  return (
    <Badge palette={GREEN} className={className}>
      <Rising />
    </Badge>
  )
}

export function ExpensesIcon({ className }: { className?: string }) {
  return (
    <Badge palette={ROSE} className={className}>
      <Falling />
    </Badge>
  )
}

export function NetProfitIcon({ className }: { className?: string }) {
  return (
    <Badge palette={GREEN} className={className}>
      <Wallet ink={GREEN.ink} />
    </Badge>
  )
}

export function NetLossIcon({ className }: { className?: string }) {
  return (
    <Badge palette={ROSE} className={className}>
      <Wallet ink={ROSE.ink} />
    </Badge>
  )
}

/** Bills not yet paid: a receipt with a warning mark. */
export function OutstandingIcon({ className }: { className?: string }) {
  return (
    <Badge palette={AMBER} className={className}>
      <Receipt ink={AMBER.ink} />
      <Corner ink={AMBER.ink} mark="alert" />
    </Badge>
  )
}

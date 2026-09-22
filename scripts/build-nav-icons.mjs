/**
 * Builds the sidebar icons in public/icons/ from the artwork in assets/icons/.
 *
 * The originals are wide scene illustrations - a counter with objects arranged
 * along it - on a 1210x864 canvas. Dropped whole into a 20px box they letterbox
 * to about 20x14 and every shape lands on a fraction of a pixel, which reads as
 * a coloured smudge. So each one is cropped to its subject: the flask, the pill
 * bottle, the chart card, the receipt, the patient in the bed. The artwork is
 * untouched - only the viewBox changes - so re-running this after replacing a
 * file picks the new art up.
 *
 * Alongside each {name}.svg this also writes a {name}-dark.svg for the dark
 * sidebar. Most of these illustrations paint a near-white background shape
 * behind the subject (a monitor screen, a receipt page, a gradient card) -
 * fine once it blends into the light sidebar, but a glowing white tile once
 * the sidebar is dark. DARK_OVERRIDES lists the exact fill this hits per
 * icon, swapped for a tone pulled from that icon's own dark accents rather
 * than an invented one, so the dark file is the same artwork restated in a
 * darker register rather than a second illustration to keep in sync.
 * Icons with no near-white background (pharmacy, laboratory, patients) get
 * no override and the dark file is identical to the light one.
 *
 *   node scripts/build-nav-icons.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const from = join(root, "assets/icons")
const to = join(root, "public/icons")

/** Square crops around each illustration's subject, in the original's own units. */
const CROPS = {
  dashboard: "664 71 500 500",
  // Tight enough to leave out the half-capsule sitting to the bottle's left,
  // which at this size read as a stray blue blob rather than a pill.
  pharmacy: "606 380 264 264",
  laboratory: "572 400 252 252",
  billing: "488 176 442 442",
  patients: "560 150 440 440",
  // Both figures whole, with the cross behind them still legible at 20px.
  staff: "205 160 400 400",
  // Both gears whole; the sliders fall outside, which is fine - at 20px they
  // were a smear under the gear rather than anything readable.
  settings: "235 70 430 430",
  // Note, coins and arrow all in frame. Cropping tighter made the coins
  // bigger but clipped the banknote, which is what makes it read as money
  // rather than as a stack of discs.
  expenses: "170 120 470 470",
}

/**
 * Literal find/replace pairs applied to the dark output only, after cropping
 * and namespacing. Each targets one specific fill or gradient stop by its
 * full attribute so a color used elsewhere in the same source (a doctor's
 * white coat, a badge card) is never touched by accident.
 */
const DARK_OVERRIDES = {
  // Chart "screen" background and the donut's cut-out center; the dark
  // maroon bar would otherwise vanish against the new dark screen.
  dashboard: [
    ['fill="#f6f6f6"', 'fill="#1e2530"'],
    ['fill="#a20b40"', 'fill="#ef4444"'],
  ],
  // The receipt page itself, plus its total/stamp bar for the same reason
  // as dashboard's chart bar.
  billing: [
    ['fill="#f6f6f6"', 'fill="#1e2530"'],
    ['fill="#a20b40"', 'fill="#ef4444"'],
  ],
  // Full-canvas background gradient, and the glow disc behind the cross -
  // recolored to slate-900/800/700, already used elsewhere in this file for
  // hair and pupils, so the dark variant stays in the same palette family.
  staff: [
    ['<stop offset="0%" stop-color="#F0F9FF"/>', '<stop offset="0%" stop-color="#0F172A"/>'],
    ['<stop offset="100%" stop-color="#E0F2FE"/>', '<stop offset="100%" stop-color="#1E293B"/>'],
    ['<circle cx="0" cy="0" r="140" fill="#FFFFFF"/>', '<circle cx="0" cy="0" r="140" fill="#334155"/>'],
  ],
  // Same background gradient as staff (settings was drawn to match it), plus
  // the gear's bolt-hole highlight and its hub disc behind the cross.
  settings: [
    ['<stop offset="0%" stop-color="#F0F9FF"/>', '<stop offset="0%" stop-color="#0F172A"/>'],
    ['<stop offset="100%" stop-color="#E0F2FE"/>', '<stop offset="100%" stop-color="#1E293B"/>'],
    ['<circle cx="0" cy="0" r="196" fill="#FFFFFF"/>', '<circle cx="0" cy="0" r="196" fill="#334155"/>'],
    ['<circle cx="590" cy="168" r="30" fill="#F0F9FF"/>', '<circle cx="590" cy="168" r="30" fill="#334155"/>'],
    [
      '<circle cx="400" cy="300" r="58" fill="#FFFFFF"/>\n      <circle cx="400" cy="300" r="40" fill="#E0F2FE" stroke="#7DD3FC" stroke-width="3"/>',
      '<circle cx="400" cy="300" r="58" fill="#334155"/>\n      <circle cx="400" cy="300" r="40" fill="#1E293B" stroke="#7DD3FC" stroke-width="3"/>',
    ],
  ],
  // Same background gradient again, plus the glow disc behind the coin stack.
  expenses: [
    ['<stop offset="0%" stop-color="#F0F9FF"/>', '<stop offset="0%" stop-color="#0F172A"/>'],
    ['<stop offset="100%" stop-color="#E0F2FE"/>', '<stop offset="100%" stop-color="#1E293B"/>'],
    ['<circle cx="0" cy="0" r="212" fill="#FFFFFF"/>', '<circle cx="0" cy="0" r="212" fill="#334155"/>'],
  ],
}

mkdirSync(to, { recursive: true })

for (const [name, viewBox] of Object.entries(CROPS)) {
  let svg = readFileSync(join(from, `${name}.svg`), "utf8")

  // The source sets width:100%;height:auto so it fills a page; the icon needs
  // to fill its box instead.
  svg = svg.replace('style="width:100%;height:auto;display:block"', "")
  svg = svg.replace(/viewBox="[^"]*"/, `viewBox="${viewBox}"`)

  // Ids are global once a file is on the page. Namespacing them means two of
  // these can render together without one's gradient bleeding into the other.
  for (const id of new Set([...svg.matchAll(/id="([^"]+)"/g)].map((m) => m[1]))) {
    svg = svg.split(`id="${id}"`).join(`id="pmc-${name}-${id}"`)
    svg = svg.split(`url(#${id})`).join(`url(#pmc-${name}-${id})`)
  }

  writeFileSync(join(to, `${name}.svg`), svg.trim() + "\n")

  let dark = svg
  for (const [search, replace] of DARK_OVERRIDES[name] ?? []) {
    if (!dark.includes(search)) {
      throw new Error(`${name}: dark override target not found - "${search}"`)
    }
    dark = dark.split(search).join(replace)
  }
  writeFileSync(join(to, `${name}-dark.svg`), dark.trim() + "\n")

  console.log(`  ${name.padEnd(12)} viewBox="${viewBox}"`)
}
console.log(`\nWrote ${Object.keys(CROPS).length * 2} icons to public/icons/`)

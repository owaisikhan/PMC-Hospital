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
  // Already square, and built as a tile with its own background.
  expenses: "0 0 800 800",
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
  console.log(`  ${name.padEnd(12)} viewBox="${viewBox}"`)
}
console.log(`\nWrote ${Object.keys(CROPS).length} icons to public/icons/`)

# Sidebar artwork

The source illustrations. `scripts/build-nav-icons.mjs` crops each one and
writes the result to `public/icons/`, which is what the app actually serves -
both a light file and, alongside it, a `-dark` one for the dark sidebar.

| File             | Sidebar item |
| ---------------- | ------------ |
| `dashboard.svg`  | Dashboard    |
| `patients.svg`   | Patients     |
| `laboratory.svg` | Laboratory   |
| `pharmacy.svg`   | Pharmacy     |
| `billing.svg`    | Billing      |
| `expenses.svg`   | Expenses     |
| `staff.svg`      | Staff        |
| `settings.svg`   | Settings     |

Every sidebar item has artwork now. `NavItem.icon` is still a Lucide glyph
for each one, used as the fallback if an image is ever removed.

`settings.svg` was drawn to match the set rather than supplied: same canvas,
background gradient, glow and shadow filters, palette and sparkle accents as
`staff.svg`, with the cross in the gear hub to tie it to the others. Its gear
outlines are generated geometry, so if the tooth count or proportions want
changing, the generator is easier to rerun than the path is to edit by hand.

## Why they get cropped

Most of these are wide scene illustrations - a counter with objects arranged
along it - on a 1210x864 canvas. Dropped whole into the sidebar's 20px box they
letterbox to about 20x14, and every shape lands on a fraction of a pixel, so
they read as a coloured smudge rather than an icon.

So each one is cropped to its subject: the flask, the pill bottle, the chart
card, the receipt, the patient in the bed. The artwork itself is untouched -
only the `viewBox` changes - and the crops live in `scripts/build-nav-icons.mjs`.

## Replacing one

Drop the new file in here under the same name, then:

    node scripts/build-nav-icons.mjs

If the new art is framed differently the old crop will be wrong, so check the
`CROPS` map in that script. Anything already square and tightly framed, like
`expenses.svg`, needs no crop at all.

## Dark variants

Most of these paint a near-white background behind the subject - a monitor
screen, a receipt page, a light gradient card - which blends into the light
sidebar but glows as a floating tile on the dark one. `build-nav-icons.mjs`
also writes a `{name}-dark.svg` for each, with just that background (and
anything that would lose contrast against it) recolored via the
`DARK_OVERRIDES` map in that script - never the artwork's own foreground
colors. `pharmacy.svg`, `laboratory.svg` and `patients.svg` have no near-white
background, so their dark files are identical to the light ones.

If new art needs the same treatment, find its near-white fill or gradient
stop the same way the others were found - render it against the dark sidebar
color (`oklch(0.175 0.012 236)`) and see what glows - then add an entry to
`DARK_OVERRIDES` rather than editing `public/icons/*-dark.svg` by hand; that
file is generated and gets overwritten the next time the script runs.

# Sidebar artwork

The source illustrations. `scripts/build-nav-icons.mjs` crops each one and
writes the result to `public/icons/`, which is what the app actually serves.

| File             | Sidebar item |
| ---------------- | ------------ |
| `dashboard.svg`  | Dashboard    |
| `patients.svg`   | Patients     |
| `laboratory.svg` | Laboratory   |
| `pharmacy.svg`   | Pharmacy     |
| `billing.svg`    | Billing      |
| `expenses.svg`   | Expenses     |

Staff and Settings have no artwork yet and fall back to a Lucide glyph.

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

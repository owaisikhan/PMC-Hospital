# PMC Hospital

Hospital management system for PMC Hospital.

## Stack

- **Next.js 16** (App Router, React 19, TypeScript strict)
- **Tailwind CSS v4** with oklch design tokens
- **shadcn/ui** primitives (`base-nova` style) + **Lucide** icons

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |
| `npm run check` | lint + typecheck + build |

## Structure

```
src/
  app/
    (app)/            # Shell: sidebar + topbar + module routes
  components/
    layout/           # Sidebar, topbar, page header, module placeholder
    ui/               # shadcn primitives (button, card, badge, input)
  lib/
    navigation.ts     # Single source of truth for sidebar + in-page tabs
    utils.ts          # cn()
  types/              # Domain models (Patient, Doctor, Appointment, ...)
```

### Adding a module

1. Add an entry to `navSections` in `src/lib/navigation.ts` (with `tabs` if it needs a sub-tab strip).
2. Create the matching folder under `src/app/(app)/`.

The sidebar, the active-state highlighting and the tab strip all follow from step 1 — pages never declare their own tabs.

### Theming

All brand and clinical status colors live in one block in `src/app/globals.css`, marked `PMC Hospital brand tokens`. The current values are placeholders; recoloring the product is a change to that block only.

## Status

The app shell, navigation and routing are in place and every module is reachable. Module screens are being built out one at a time against reference designs; routes not yet designed render a short "what's coming" placeholder. Dashboard figures are currently hard-coded sample data — no data layer is wired up yet.

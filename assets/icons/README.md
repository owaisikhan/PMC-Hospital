# Tab icons

Drop SVG files here and they get wired into the tabs.

Name each file after the tab it belongs to:

| File                  | Where it appears                  |
| --------------------- | --------------------------------- |
| `expenses.svg`        | Expenses page → Expenses tab      |
| `salaries.svg`        | Expenses page → Salaries tab      |
| `admitted.svg`        | Patients page → Admitted now tab  |
| `all-patients.svg`    | Patients page → All patients tab  |

These files are the source, not what ships. They get inlined as React
components in `src/components/ui/sliding-tabs.tsx`, with every hard-coded
`fill` and `stroke` swapped for `currentColor` — that is what lets an icon turn
white on the selected pill and grey beside it. An `<img src="...svg">` cannot
do that; it would stay one fixed colour and look wrong on whichever tab is
selected.

So they want to be single-colour line or solid icons on a square canvas
(`viewBox="0 0 24 24"` is ideal). They render at 18px.

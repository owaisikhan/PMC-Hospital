"use client"

import { ThemeProvider as NextThemesProvider } from "next-themes"

/**
 * Wraps next-themes so the rest of the app never imports it directly.
 * attribute="class" toggles .dark on <html>, which is what globals.css's
 * dark tokens key off. System is the default rather than light: this is a
 * shared-device app, so whatever the device is already set to is a better
 * first guess than assuming light.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </NextThemesProvider>
  )
}

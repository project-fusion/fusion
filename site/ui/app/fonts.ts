import { Fira_Code, Funnel_Display, Geist } from 'next/font/google'

/**
 * Fusion brand fonts, the same three the previous repo used.
 *
 * Geist for interface text, Fira Code for anything monospaced, and Funnel
 * Display for the one place type is the design rather than the delivery.
 *
 * Declared at module top level because Next's font plugin transforms them at
 * compile time: it subsets the files and emits the preload tags, neither of
 * which it can do for a call made inside a component.
 *
 * The variables are mapped onto the Helix tokens in `site.css`, so the design
 * system picks them up without knowing anything about Next.
 */
export const fusionSans = Geist({
  display: 'swap',
  subsets: ['latin'],
  variable: '--fusion-font-sans',
})

export const fusionMono = Fira_Code({
  display: 'swap',
  subsets: ['latin'],
  variable: '--fusion-font-mono',
})

export const fusionDisplay = Funnel_Display({
  display: 'swap',
  subsets: ['latin'],
  variable: '--fusion-font-display',
})

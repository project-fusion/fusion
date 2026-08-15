import localFont from 'next/font/local'

/**
 * Fusion brand fonts, vendored rather than fetched.
 *
 * Geist for interface text, Fira Code for anything monospaced, and Funnel
 * Display for the one place type is the design rather than the delivery.
 *
 * **The files are in the repo.** They came from Google Fonts and are the latin
 * subset of each variable face, about eighty kilobytes for the three. Fetching
 * them at build time instead would put a company whose thesis is that no
 * product may create a dependency its user cannot exit behind someone else's
 * uptime for its own wordmark, and it would mean the site could not be built
 * without a network.
 *
 * It also gives the sandbox's preview frame something to point at. That frame
 * is a static document with an opaque origin, so it cannot reach back to the
 * site for anything, and `next/font` emits URLs only the site knows. The frame
 * inlines these same files, so the preview renders in the type the site does
 * rather than in the fallback stack.
 *
 * Declared at module top level because Next's font plugin transforms them at
 * compile time: it emits the preload tags, which it cannot do for a call made
 * inside a component.
 *
 * The variables are mapped onto the Helix tokens in `site.css`, so the design
 * system picks them up without knowing anything about Next.
 */
export const fusionSans = localFont({
  display: 'swap',
  src: './fonts/geist-latin.woff2',
  variable: '--fusion-font-sans',
  weight: '100 900',
})

export const fusionMono = localFont({
  display: 'swap',
  src: './fonts/fira-code-latin.woff2',
  variable: '--fusion-font-mono',
  weight: '300 700',
})

export const fusionDisplay = localFont({
  display: 'swap',
  src: './fonts/funnel-display-latin.woff2',
  variable: '--fusion-font-display',
  weight: '300 800',
})

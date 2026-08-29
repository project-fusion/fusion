import '@fusion.dev/helix/helix.css'
import '@fusion.dev/helix-gallery/gallery.css'
import './fonts.css'
import './site.css'
import type { Metadata } from 'next'
import Script from 'next/script'
import type { ReactNode } from 'react'
import { HelixElements } from '@/components/helix-elements/helix-elements'
import { COLOR_MODE_KEY } from '@/utils/color-mode/color-mode'
import { siteUrl } from '@/utils/metadata/metadata'
import { SITE } from '@/utils/site/site'

/** The faces `fonts.css` declares, in the order the page asks for them. */
const FACES = [
  '/fonts/geist-latin.woff2',
  '/fonts/fira-code-latin.woff2',
  '/fonts/funnel-display-latin.woff2',
]

const DESCRIPTION =
  'Intelligence and energy are collapsing in cost at the same moment. Fusion builds the stack that makes sovereignty practical.'

/**
 * The defaults every page inherits, and the base every relative URL resolves on.
 *
 * **`metadataBase` is the one that silently decided everything.** Without it
 * Next drops relative image URLs rather than guessing an origin, so a card
 * declared as `/opengraph-image` reached no crawler at all. Set here once, it is
 * what makes `pageMetadata` able to take a path instead of asking every page to
 * write the domain out.
 *
 * The `openGraph` and `twitter` blocks are defaults rather than the whole story:
 * a page that calls `pageMetadata` replaces them with its own, and a page that
 * forgets still unfurls as the site rather than as a bare domain. See (247).
 */
export const metadata: Metadata = {
  description: DESCRIPTION,
  metadataBase: siteUrl,
  openGraph: {
    description: DESCRIPTION,
    siteName: 'Fusion',
    title: 'Fusion Development Group',
    type: 'website',
    url: SITE,
  },
  title: {
    default: 'Fusion Development Group',
    template: '%s · Fusion',
  },
  twitter: {
    card: 'summary_large_image',
    description: DESCRIPTION,
    title: 'Fusion Development Group',
  },
}

/**
 * Carries the token layers, the brand faces, and element registration.
 *
 * No chrome. The site and its tools want different frames: pages want a header
 * and a centered column, and a tool wants the whole viewport. Putting either
 * here would force the other to undo it, which is what route groups are for.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    /* **`suppressHydrationWarning`, and only for this element.**
     *
     * The pre-paint script in `head` writes `data-color-mode` onto this element
     * before React hydrates, so React walks the tree and finds an attribute the
     * server never sent. That is a mismatch by its own definition and it says
     * so, on every load, for a difference that is the entire point of the
     * script: the attribute has to be there before the first paint, and
     * hydration happens after it.
     *
     * The flag is one level deep. It covers `html`'s own attributes and nothing
     * inside it, so a real mismatch anywhere in the page is still reported. It
     * is not a way of quieting hydration generally, and should not be copied to
     * an element that has no script writing to it before React arrives.
     */
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* **The preload `next/font` used to write, written by hand.**
            The faces moved to `public/fonts` so the sandbox frame can name the
            same URL the site does, which cost the automatic preload that came
            with `localFont`. Without these three the first paint is in the
            fallback stack and reflows when the faces land, which is the whole
            thing `font-display: swap` is arranging for and the reason to ask
            early. `crossOrigin` is required rather than decorative: a font is
            fetched in CORS mode, so a preload without it is a second, separate
            request rather than a warm cache entry. */}
        {FACES.map((href) => (
          <link
            as="font"
            crossOrigin="anonymous"
            href={href}
            key={href}
            rel="preload"
            type="font/woff2"
          />
        ))}

        {/* **The color mode, applied before the first pixel.**
         *
         * Restoring the stored choice in an effect is not early enough: an
         * effect runs after the document has painted, and until then the page
         * follows `prefers-color-scheme`, so a reader whose system is light and
         * whose choice is dark gets a frame of the light theme. Everything on
         * the page survives that; the aura does not. It reads
         * `--helix-color-background` once on mount to decide which half of its
         * palette to draw, catches the light value, and renders a full-viewport
         * field at light-mode brightness under chrome that is already dark.
         *
         * A blocking script in `head` is the only thing that runs early enough,
         * and `next/script` at `beforeInteractive` is how this framework writes
         * one: it is emitted into the server-rendered head rather than injected
         * by the client, so it executes before the document paints. A bare
         * `<script dangerouslySetInnerHTML>` does the same thing and is rightly
         * refused by `noDangerouslySetInnerHtml` while a supported form exists.
         *
         * The key is interpolated rather than written out, so this and the
         * preferences panel cannot drift onto different keys. It comes from a
         * plain module rather than from `preferences.tsx`: that file is
         * `'use client'`, and a server component importing a non-component value
         * from a client module gets a reference proxy, so the constant arrives
         * here as `undefined` and ships `getItem(undefined)`. Wrapped in
         * `try`, because storage throws rather than returning null in a
         * private window, and a theme is not worth a blank page. */}
        <Script id="site-color-mode" strategy="beforeInteractive">
          {`try{var m=localStorage.getItem(${JSON.stringify(COLOR_MODE_KEY)});if(m==='light'||m==='dark')document.documentElement.dataset.colorMode=m}catch(e){}`}
        </Script>
      </head>
      <body>
        <HelixElements />
        {children}
      </body>
    </html>
  )
}

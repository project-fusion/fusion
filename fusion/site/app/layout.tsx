import '@fusion.dev/helix/helix.css'
import '@fusion.dev/helix-gallery/gallery.css'
import './fonts.css'
import './site.css'
import type { Metadata } from 'next'
import Script from 'next/script'
import type { ReactNode } from 'react'
import { COLOR_MODE_KEY } from '@/utils/color-mode/color-mode'
import { siteUrl } from '@/utils/metadata/metadata'
import { SITE } from '@/utils/site/site'
import { OWNED, SITE_THEME_KEY, THEME_VERSION } from '@/utils/site-theme/site-theme'

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
 * forgets still unfurls as the site rather than as a bare domain.
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

        {/* **What the reader chose, applied before the first pixel.**
         *
         * Two things: the color mode, and the palette they derived on the
         * landing page. One script, because they are one concern — appearance
         * restored from storage — and because the second of two
         * `beforeInteractive` scripts is not emitted, measured: only the first
         * reached the document, so the palette silently never restored.
         *
         * Restoring either in an effect is not early enough: an effect runs
         * after the document has painted, and until then the page follows
         * `prefers-color-scheme` and the shipped palette. Everything on the
         * page survives a frame of that; the aura does not. It reads
         * `--helix-color-background` once on mount to decide which half of its
         * palette to draw, catches the wrong value, and renders a full-viewport
         * field at light-mode brightness under chrome that is already dark. The
         * palette has the same problem an order of magnitude wider: every color
         * on the page changing one frame in.
         *
         * A blocking script in `head` is the only thing that runs early enough,
         * and `next/script` at `beforeInteractive` is how this framework writes
         * one: it is emitted into the server-rendered head rather than injected
         * by the client, so it executes before the document paints. A bare
         * `<script dangerouslySetInnerHTML>` does the same thing and is rightly
         * refused by `noDangerouslySetInnerHtml` while a supported form exists.
         *
         * **The palette is restored, never derived.** The engine is wasm and
         * loading it is asynchronous, so a script that computed the palette
         * could not be the thing that runs first. What is stored is what the
         * engine already produced, so this is a list of custom properties being
         * written to the root: synchronous, and done in the same tick. The flag
         * goes on last, being what the token layer keys its own declarations
         * off; set first, the layer would resolve against properties that are
         * not there yet.
         *
         * The keys are interpolated rather than written out, so this and the
         * panels that write them cannot drift apart. Both come from plain
         * modules rather than from `preferences.tsx`: that file is
         * `'use client'`, and a server component importing a non-component value
         * from a client module gets a reference proxy, so the constant arrives
         * here as `undefined` and ships `getItem(undefined)`. Wrapped in `try`,
         * because storage throws rather than returning null in a private window,
         * and an appearance is not worth a blank page. The version is checked
         * for a narrower reason: a palette held from before a role was renamed
         * would restore a page with a hole in it that the reader cannot see and
         * cannot report. */}
        <Script id="site-appearance" strategy="beforeInteractive">
          {`try{var d=document.documentElement;var m=localStorage.getItem(${JSON.stringify(COLOR_MODE_KEY)});if(m==='light'||m==='dark')d.dataset.colorMode=m;var t=JSON.parse(localStorage.getItem(${JSON.stringify(SITE_THEME_KEY)})||'null');if(t&&t.version===${THEME_VERSION}&&t.tokens){var s=d.style,i;for(i=0;i<t.tokens.length;i++)s.setProperty(${JSON.stringify(OWNED)}+t.tokens[i].name,t.tokens[i].hex);for(i in t.seeds)s.setProperty(${JSON.stringify(OWNED)}+i,t.seeds[i]);d.dataset.helixTheme=''}}catch(e){}`}
        </Script>
      </head>
      <body>{children}</body>
    </html>
  )
}

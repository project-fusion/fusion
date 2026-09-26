import '@fusion.dev/helix-styles/helix.css'
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
  'Fusion Development Group builds Helix, a design system built from your brand color, and Cortex, a memory and provenance layer for AI systems. We also build products with them for clients.'

/**
 * The defaults every page inherits, and the base every relative URL resolves on.
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
        {/* **The preload written by hand, because `localFont` is not in use.**
            The faces live in `public/fonts` so the sandbox frame can name the
            same URL the site does, which costs the automatic preload. Without
            these the first paint is in the fallback stack and reflows when the
            faces land. `crossOrigin` is required rather than decorative: a font
            is fetched in CORS mode, so a preload without it is a second request
            rather than a warm cache entry. */}
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

        {/*
         * *What the reader chose, applied before the first pixel.**
         *
         * Two things: the color mode, and the palette they derived on the
         * landing page. One script, because they are one concern (appearance
         * restored from storage), and because the second of two
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
         */}
        <Script id="site-appearance" strategy="beforeInteractive">
          {`try{var d=document.documentElement;var m=localStorage.getItem(${JSON.stringify(COLOR_MODE_KEY)});if(m==='light'||m==='dark')d.dataset.colorMode=m;var t=JSON.parse(localStorage.getItem(${JSON.stringify(SITE_THEME_KEY)})||'null');if(t&&t.version===${THEME_VERSION}&&t.tokens){var s=d.style,i;for(i=0;i<t.tokens.length;i++)s.setProperty(${JSON.stringify(OWNED)}+t.tokens[i].name,t.tokens[i].hex);for(i in t.seeds)s.setProperty(${JSON.stringify(OWNED)}+i,t.seeds[i]);d.dataset.helixTheme=''}}catch(e){}`}
        </Script>
      </head>
      <body>{children}</body>
    </html>
  )
}

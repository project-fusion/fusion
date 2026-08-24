import '@helix-io/styles/primitives.css'
import '@helix-io/styles/tokens.css'
import '@helix-io/styles/base.css'
import '@helix-io/styled/elements.css'
import '@helix-io/gallery/gallery.css'
import './fonts.css'
import './site.css'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { HelixElements } from '@/components/helix-elements/helix-elements'

/** The faces `fonts.css` declares, in the order the page asks for them. */
const FACES = [
  '/fonts/geist-latin.woff2',
  '/fonts/fira-code-latin.woff2',
  '/fonts/funnel-display-latin.woff2',
]

export const metadata: Metadata = {
  description:
    'Intelligence and energy are collapsing in cost at the same moment. Fusion builds the stack that makes sovereignty practical.',
  title: {
    default: 'Fusion Development Group',
    template: '%s · Fusion',
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
    <html lang="en">
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
      </head>
      <body>
        <HelixElements />
        {children}
      </body>
    </html>
  )
}

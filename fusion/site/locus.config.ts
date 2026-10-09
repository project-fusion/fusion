/**
 * Fusion Locus's config for the site: five pages at 1440 and 390 light and
 * 1440 dark, each pictured whole, from `next start` over the production build.
 *
 * **The site had no visual check, and production showed why it needed one.**
 * On October 8, 2026 every code block on the site lost its syntax colors,
 * because two copies of `@lezer/highlight` were installed. The fault was in
 * the build, so a picture of any page with a code block would have changed.
 * `scripts/check-highlight.mjs` now fails the build on that one cause; this
 * suite fails on any cause that changes what a page draws.
 *
 * **One page of each kind.** The landing page, a component reference page,
 * the sandbox with its editor, the theme builder and the maps page. A page
 * of each kind reads the parts every other page of that kind reads.
 *
 * **Whole pages, decided by the owner on October 8, 2026**, so a fault below
 * the first screen shows too.
 *
 * **Requests stay on the site's own origin**, so the maps page draws without
 * the tiles another host would serve, and the sandbox without the compiler it
 * loads from a CDN for a TypeScript pane.
 */
import { defineConfig } from '@fusion.dev/locus'

export default defineConfig({
  /* The footer's Helix version, which every release changes on every page.
     Painted over, and held at one width while each picture is taken, because
     the tag's width follows its digits: 0.186.0 and 0.187.0 masked boxes
     differed by 72 pixels at their edge.

     The home page's chart of one button in five systems, because Helix's bar
     weighs a runtime that carries the version: the stamp from 0.186.1 to
     0.187.0 moved the bar's end by 2 pixels. The chart keeps one size, because
     the longest bar sets its scale. */
  mask: ['[data-site-footer] helix-tag', 'helix-bar-chart[for="proof-button"]'],
  retake:
    'Dispatch the `Visual baselines` workflow on your branch with the suite `site`, and review the pull request it opens.',
  /* Next.js writes `next-route-announcer` and never defines it, so only
     Helix's own elements are awaited, and each of them is required. */
  settle: { elements: 'helix-', readyProperty: 'whenSettled' },
  shots: [
    { name: 'wide', scheme: 'light', width: 1440 },
    { name: 'phone', scheme: 'light', width: 390 },
    { name: 'dark', scheme: 'dark', width: 1440 },
  ],
  sources: [
    {
      baselines: 'baselines',
      kind: 'server',
      name: 'site',
      routes: [
        { name: 'home', path: '/' },
        { name: 'button', path: '/helix/components/button' },
        { name: 'sandbox', path: '/helix/sandbox' },
        { name: 'theme', path: '/helix/theme' },
        { name: 'maps', path: '/helix/maps' },
      ],
      start: 'exec bunx next start --hostname 127.0.0.1 --port 3417',
      url: 'http://127.0.0.1:3417',
    },
  ],
  style: '[data-site-footer] helix-tag { inline-size: 7rem !important; }',
})

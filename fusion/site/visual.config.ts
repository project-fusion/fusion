/**
 * The visual tests' config for the site: five pages and three loading
 * stand-ins at 1440 and 390 light and 1440 dark, each pictured whole, from
 * `next start` over the production build.
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
 * **The loading stand-ins, from October 10, 2026.** The components gallery,
 * the insights index and a component's reference page each have a
 * `loading.tsx` that shows while the page renders, which is never long enough
 * to picture. `/stand-ins/[name]` renders each one on its own, and answers 404
 * unless the server was started with `SITE_STAND_INS=1`, which `start` below
 * sets. A stand-in that stops matching the page it precedes shows as a change
 * here.
 *
 * **Requests stay on the site's own origin**, so the maps page draws without
 * the tiles another host would serve, and the sandbox without the compiler it
 * loads from a CDN for a TypeScript pane.
 */
import { defineConfig } from '@fusion.dev/helix-cli/visual'

export default defineConfig({
  /* Each page's accessibility tree beside its pictures, so a lost label fails
     even when no pixel moved. */
  aria: true,
  /* The page check that needs no baseline: a code block the highlighter left
     in one color, which is the October 8 fault on any page, pictured or not.
     A highlighted block is a `helix-code-block` holding the highlighter's one
     `span`, and the sandbox's editor draws its lines in `.cm-content`. The home
     page's install block is two lines of plain text by design, so it holds no
     `span` and is not judged. */
  checks: {
    clipped: true,
    code: { selector: 'helix-code-block:has(> span), .cm-content' },
    /* Every ink on every page in light and dark, which nothing measured on
       the site before. `color-border` draws lines that separate, and answers
       to no target. */
    contrast: { rules: ['var(--helix-color-border)'] },
    overlap: true,
  },
  manifest: [
    '../../helix/headless/custom-elements.json',
    '../../helix/styled/custom-elements.json',
  ],
  /* The footer's Helix version, which every release changes on every page.
     Painted over, and held at one width while each picture is taken, because
     the tag's width follows its digits: 0.186.0 and 0.187.0 masked boxes
     differed by 72 pixels at their edge.

     **And the home page's typical component size**, a median of every
     family's compressed bytes rounded to a tenth of a kilobyte, which sits on
     a rounding edge: it read 3.3, 3.2, 3.4 and 3.3 kB across four runs on
     October 10, 2026, each time turning the site check red for a change that
     had nothing to do with the page. The metrics page and its own check own
     the number; this check owns how the page draws. Its box is a block, so
     the mask keeps its width whatever the figure says. */
  mask: ['[data-site-footer] helix-tag', '[data-site-measure]'],
  retake:
    'Comment `/retake` and the pages on the pull request, such as `/retake site/home`, or dispatch the `Visual baselines` workflow on your branch with the suite `site` to retake every one, and review the commit it makes on the branch.',
  /* Next.js writes `next-route-announcer` and never defines it, so only
     Helix's own elements are awaited, and each of them is required. */
  settle: { elements: 'helix-', readyProperty: 'whenSettled' },
  /* Dark before phone, so dark is taken on the wide page in place and only
     phone loads it again. */
  shots: [
    { name: 'wide', scheme: 'light', width: 1440 },
    { name: 'dark', scheme: 'dark', width: 1440 },
    { name: 'phone', scheme: 'light', width: 390 },
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
        { name: 'components-loading', path: '/stand-ins/components' },
        { name: 'insights-loading', path: '/stand-ins/insights' },
        { name: 'reference-loading', path: '/stand-ins/reference' },
      ],
      start: 'exec env SITE_STAND_INS=1 bunx next start --hostname 127.0.0.1 --port 3417',
      url: 'http://127.0.0.1:3417',
    },
  ],
  style: '[data-site-footer] helix-tag { inline-size: 7rem !important; }',
})

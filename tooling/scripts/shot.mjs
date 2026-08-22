#!/usr/bin/env node
/**
 * Screenshots a page, or one element on it, into `.local/shots`.
 *
 * **The editor's browser pane cannot do this, and the reason is worth writing
 * down rather than rediscovering.** Its document is `hidden`: the panel is not
 * displayed, so the renderer is backgrounded and rasterises no new tiles. What
 * was rastered at load captures correctly and nothing else does. Measured on the
 * home page: at `scrollY: 0` a perfect frame, and at `scrollY: 600` the masthead
 * drawn six hundred pixels below where it belongs with white above it, which is
 * the tiles from the top of the document composited against a new scroll offset.
 * Scrolling does not re-rasterise, and neither does dirtying layout at the new
 * offset, which was the obvious guess and was measured wrong.
 *
 * The same absence of frames stops `behavior: 'smooth'` ever arriving and stops
 * every CSS transition, so a carousel driven by its own arrows looks broken
 * there while being fine. Anything synchronous is trustworthy in that pane:
 * `getBoundingClientRect`, `getComputedStyle`, an instant scroll. Anything that
 * needs a frame is not.
 *
 * So the visual half moves here, to the browser `specs:browser` already drives.
 * It is a real, visible page: it scrolls, it animates, and it rasterises what it
 * is looking at.
 *
 * ```
 * bun run shot /                          the home page
 * bun run shot /helix/components/carousel --select helix-carousel
 * bun run shot / --select helix-carousel --pad 24 --scheme dark
 * bun run shot https://example.com --viewport 390x844
 * ```
 *
 * A bare path resolves against the dev server, which has to be running: this
 * takes a picture of a page and does not know how to serve one.
 *
 * **`--select` clips to the element rather than cropping the viewport**, which
 * is the thing worth having. Playwright scrolls it into view and shoots its box,
 * so a component is the whole frame instead of a tenth of one. `--pad` widens
 * the box, which is what a shadow or a focus ring needs to be in the picture at
 * all: the box stops at the border edge and both of those draw outside it.
 */
import { mkdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { chromium } from 'playwright'

const root = resolve(import.meta.dirname, '../..')
const out = join(root, '.local/shots')

const args = process.argv.slice(2)
const flag = (name, fallback) => {
  const at = args.indexOf(`--${name}`)
  return at === -1 ? fallback : args[at + 1]
}
const target = args[0]

if (target === undefined || target.startsWith('--')) {
  console.error(
    'shot: needs a URL or a path.\n\n' +
      '  bun run shot /helix/components/carousel --select helix-carousel\n\n' +
      '  --select <css>      clip to this element instead of the viewport\n' +
      '  --pad <px>          widen the clip, for a shadow or a focus ring (default 0)\n' +
      '  --viewport <w>x<h>  default 1280x900\n' +
      '  --scheme <light|dark>\n' +
      '  --full              the whole scrollable page\n' +
      '  --out <name.png>    default is built from the path\n' +
      '  --wait <ms>         extra settling time after load (default 400)\n',
  )
  process.exit(1)
}

const url = /^https?:\/\//.test(target) ? target : `http://localhost:3000${target}`
const [width, height] = (flag('viewport', '1280x900').match(/^(\d+)x(\d+)$/) ?? [])
  .slice(1)
  .map(Number)

if (!width || !height) {
  console.error('shot: --viewport wants <width>x<height>, like 1280x900.')
  process.exit(1)
}

const select = flag('select')
const pad = Number(flag('pad', '0'))
const name =
  flag('out') ??
  `${(target.replace(/^https?:\/\//, '').replace(/[^a-z0-9]+/gi, '-') || 'page').replace(/^-|-$/g, '')}.png`

await mkdir(out, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({
  colorScheme: flag('scheme', 'light'),
  /* Two, because a shot read at half size is a shot nobody can judge a hairline
     border or a one-pixel focus ring from. */
  deviceScaleFactor: 2,
  viewport: { height, width },
})

const problems = []
page.on('pageerror', (error) => problems.push(`page error: ${error.message}`))
page.on('console', (message) => {
  if (message.type() === 'error') {
    problems.push(`console: ${message.text()}`)
  }
})

try {
  const response = await page.goto(url, { waitUntil: 'networkidle' })
  if (response !== null && !response.ok()) {
    console.error(`shot: ${url} answered ${response.status()}.`)
    process.exitCode = 1
  }
  /* Fonts before pixels. A page shot mid-swap is a page with the fallback's
     metrics, which moves every line of text in it. */
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(Number(flag('wait', '400')))

  const file = join(out, name)
  if (select !== undefined) {
    const element = page.locator(select).first()
    try {
      await element.waitFor({ state: 'visible', timeout: 5000 })
    } catch {
      /* Named plainly rather than thrown as a Playwright stack, because the
         commonest cause is not a broken page. A component's own examples on the
         docs site are rendered in the sandbox iframe, so the reference page for
         Carousel has no `helix-carousel` in its own document at all. */
      console.error(
        `shot: no visible \`${select}\` on ${url}. If it is inside an iframe, ` +
          "shoot the frame's own URL instead.",
      )
      process.exit(1)
    }
    await element.scrollIntoViewIfNeeded()
    const box = await element.boundingBox()
    if (box === null) {
      console.error(`shot: \`${select}\` has no box to shoot.`)
      process.exit(1)
    }
    await page.screenshot({
      clip: {
        height: box.height + pad * 2,
        width: box.width + pad * 2,
        x: Math.max(0, box.x - pad),
        y: Math.max(0, box.y - pad),
      },
      path: file,
    })
  } else {
    await page.screenshot({ fullPage: args.includes('--full'), path: file })
  }

  console.log(`shot: ${file}`)
  for (const problem of problems) {
    console.log(`  ${problem}`)
  }
} finally {
  await browser.close()
}

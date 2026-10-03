/**
 * Draws the Graph page's first frame: the brain at the top, as three.js draws
 * it once it has loaded, in a light mode and a dark one, for the page to show
 * until its own graph is drawn.
 *
 * **Run by hand against a running site, on a machine with a GPU**, as
 * `build-models.mjs` is run when the brain changes, and its pictures checked
 * in beside the model. A headless browser without a GPU draws WebGL in
 * software, slowly and not always the same, so this is no build step.
 *
 * ```sh
 * bun fusion/site/scripts/capture-graph-posters.mjs http://localhost:3211
 * ```
 *
 * **One square picture fits every screen.** The three.js driver frames the
 * graph by the box's height where the box is wider than it is tall, and by its
 * width where it is narrower, so a square of the graph, drawn with
 * `object-fit: contain`, lies where the graph will be drawn in a box of any
 * shape.
 *
 * **Its opening pose**, with the reader's motion turned down, which keeps the
 * graph from turning by itself, and with nothing but the graph: no controls,
 * no signals, and no ground, so the picture lies on the page's own.
 */
import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import sharp from 'sharp'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'media', 'graph')
const base = process.argv[2] ?? 'http://localhost:3211'

await mkdir(OUT, { recursive: true })
const browser = await chromium.launch({
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'],
})
for (const mode of ['dark', 'light']) {
  /* Wide, so the box is wider than it is tall and the graph is framed by its height. */
  const page = await browser.newPage({
    colorScheme: mode,
    deviceScaleFactor: 2,
    reducedMotion: 'reduce',
    viewport: { height: 900, width: 1800 },
  })
  await page.goto(`${base}/helix/graph`, { waitUntil: 'load' })
  await page.waitForFunction(() => document.querySelector('helix-graph')?.ready === true, null, {
    timeout: 60_000,
  })
  /* A moment for the last frame and the group names over it. */
  await page.waitForTimeout(1500)
  const clip = await page.evaluate(() => {
    const frame = document.querySelector('helix-graph')
    const box = frame?.querySelector('div')
    const style = document.createElement('style')
    style.textContent = `
      html, body, main, [class*="graphHero"] { background: transparent !important; }
      helix-graph::part(controls) { visibility: hidden; }
      canvas[data-helix-graph-layer="signals"], [data-graph-poster] { visibility: hidden; }
    `
    document.head.append(style)
    frame?.style.setProperty('--graph-background-color', 'transparent')
    const at = box?.getBoundingClientRect()
    if (!at) {
      throw new Error('The Graph page has no drawing box to draw.')
    }
    const side = Math.min(at.width, at.height)
    return {
      height: side,
      width: side,
      x: at.left + (at.width - side) / 2,
      y: at.top + (at.height - side) / 2,
    }
  })
  await page.waitForTimeout(300)
  const picture = await page.screenshot({ clip, omitBackground: true })
  const file = join(OUT, `brain-${mode}.webp`)
  /* 1024 across, twice the box's height on most screens, which keeps it
     sharp on a dense one and light enough for the first paint. */
  await sharp(picture).resize(1024).webp({ alphaQuality: 80, quality: 72 }).toFile(file)
  console.log(`graph poster: wrote ${file}`)
  await page.close()
}
await browser.close()

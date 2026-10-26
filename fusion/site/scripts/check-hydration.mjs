#!/usr/bin/env bun
/**
 * Loads the production build's server-rendered pages in Chromium, makes each
 * page's first interaction one that only an `onhelix-*` handler answers, and
 * fails when React's handler did not run.
 *
 * **What this guards is Helix's React bridge, on the React the site installs.**
 * React attaches no custom element listener while hydrating
 * (facebook/react#35446), and neither half of it writes an object property, so
 * on a hydrated page every `onhelix-*` prop is dead and every array prop unset
 * until React commits that element again for some other reason.
 * `helix/core/src/helix-element/react-bridge.ts` repairs both by reading React's
 * private props bag. Every spec in the repository fakes that bag, and the
 * visual check compares pictures and never presses anything, so a React bump
 * that renamed it left every check green. This runs on every pull request, the
 * dependency bot's React bumps among them.
 *
 * **The first interaction, before anything has made React commit.** A commit
 * hands React the handler again and React binds it itself, which hides the
 * bug, and nothing here presses a control that commits first:
 *
 * - `/` at 1440: Down Arrow on the Helix product opens its megamenu. The link's
 *   `aria-expanded` is React state that `onhelix-before-open` sets.
 * - `/insights`: with focus off the search the page put it in, `/` is the
 *   shortcut `helix-kbd` sends as `helix-shortcut`, and `onhelix-shortcut`
 *   moves focus back to the search.
 * - `/helix/maps`: the walking route's `points` is an array, which the server
 *   cannot write and hydration never assigns. It arrives through the bridge.
 *
 * **Each page twice, the second time with the bridge blind.** An init script
 * hides React's `__reactProps$` keys from `Object.keys`, which the bridge reads
 * and React does not, so the second load is the page as React alone leaves it.
 * That run proves each assertion depends on the bridge, and is never a
 * failure: where it passes, React has delivered the handler itself, and the
 * report says this React no longer needs the bridge for that page.
 *
 * Run after `next build`: `bun run hydration`. It starts `next start` on its
 * own port, with the settings the visual check gives it.
 */
import { spawn } from 'node:child_process'
import { join } from 'node:path'
import { chromium } from 'playwright'

const site = join(import.meta.dirname, '..')
const PORT = 3418
const origin = `http://127.0.0.1:${PORT}`

/** The bridge, blinded: `Object.keys` leaves out React's props keys, which only the bridge reads. */
const BLIND = `{
  const keys = Object.keys
  Object.keys = (target) => keys(target).filter((key) => !key.startsWith('__reactProps$'))
}`

/**
 * Whether React has hydrated an element: it holds props for it. Read with
 * `getOwnPropertyNames`, which the blind run leaves alone.
 */
const hydrated = (selector) =>
  `(() => { const element = document.querySelector(${JSON.stringify(selector)}); return element !== null && Object.getOwnPropertyNames(element).some((key) => key.startsWith('__reactProps$')) })()`

/** Every page asked, its first interaction, and what React's handler leaves behind. */
const PAGES = [
  {
    name: 'megamenu opens on the first key',
    needs: ['helix-megamenu'],
    path: '/',
    run: async (page) => {
      const trigger = page.locator('helix-megamenu[label="Helix"] a[slot="trigger"]')
      await trigger.focus()
      await page.keyboard.press('ArrowDown')
      return page
        .waitForFunction(
          () =>
            document
              .querySelector('helix-megamenu[label="Helix"] a[slot="trigger"]')
              ?.getAttribute('aria-expanded') === 'true',
          undefined,
          { timeout: 2000 },
        )
        .then(() => true)
        .catch(() => false)
    },
    said: '`onhelix-before-open` set the open panel, so the Helix link says it is expanded',
    waitFor: 'helix-megamenu[label="Helix"]',
    width: 1440,
  },
  {
    name: '`/` moves focus to the search',
    needs: ['helix-kbd', 'helix-input'],
    path: '/insights',
    run: async (page) => {
      /* The page focuses its search on arrival, where `/` would only type a
         slash. A reader who has moved on from it presses `/` to come back. */
      await page.evaluate(() => document.activeElement?.blur())
      await page.keyboard.press('/')
      return page
        .waitForFunction(
          () => document.activeElement?.closest('helix-input[label="Search insights"]') !== null,
          undefined,
          { timeout: 2000 },
        )
        .then(() => true)
        .catch(() => false)
    },
    said: '`onhelix-shortcut` focused the search',
    waitFor: 'helix-kbd[keys="/"]',
    width: 1440,
  },
  {
    name: 'an array prop arrives',
    needs: ['helix-map-route'],
    path: '/helix/maps',
    run: (page) =>
      page
        .waitForFunction(
          () => {
            const points = document.querySelector('helix-map-route[label="Walking route"]')?.points
            return Array.isArray(points) && points.length > 2 && typeof points[0]?.lat === 'number'
          },
          undefined,
          { timeout: 2000 },
        )
        .then(() => true)
        .catch(() => false),
    said: 'the walking route holds the array React was given',
    waitFor: 'helix-map-route[label="Walking route"]',
    width: 1440,
  },
]

const server = spawn('bunx', ['next', 'start', '--hostname', '127.0.0.1', '--port', String(PORT)], {
  cwd: site,
  env: { ...process.env, SITE_OFFLINE_MAPS: '1' },
  stdio: ['ignore', 'ignore', 'inherit'],
})

const ready = async () => {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      if ((await fetch(origin)).ok) {
        return
      }
    } catch {
      // Not listening yet.
    }
    await new Promise((done) => setTimeout(done, 500))
  }
  throw new Error(`next start did not answer on ${origin} within a minute`)
}

const failures = []
const lines = []
let browser
try {
  await ready()
  browser = await chromium.launch()
  for (const one of PAGES) {
    const results = {}
    for (const blind of [false, true]) {
      const context = await browser.newContext({ viewport: { height: 900, width: one.width } })
      if (blind) {
        await context.addInitScript(BLIND)
      }
      const page = await context.newPage()
      const errors = []
      page.on('pageerror', (error) => errors.push(error.message))
      await page.goto(`${origin}${one.path}`, { waitUntil: 'load' })
      await page.waitForFunction(hydrated(one.waitFor), undefined, { timeout: 15000 })
      /* **And the elements the press needs are defined**, then two frames.
         `elements.css` hides a tag until its definition loads, and a hidden
         link takes no focus, so a key pressed sooner reaches the page: on
         October 25, 2026 the megamenu was defined 348 to 366 ms into a cold
         load, after the whole library, and a press at 300 ms did nothing.
         `HelixElements` now loads the bar's families first. Nothing here
         commits React. */
      await page.evaluate(async (tags) => {
        await Promise.all(tags.map((tag) => customElements.whenDefined(tag)))
        await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))
      }, one.needs)
      results[blind ? 'blind' : 'bridged'] = await one.run(page)
      if (!blind && errors.length > 0) {
        failures.push(`${one.path}: threw ${errors.join(' / ')}`)
      }
      await context.close()
    }
    if (!results.bridged) {
      failures.push(`${one.path}: ${one.name} failed. Expected: ${one.said}.`)
    }
    if (results.blind && process.env.GITHUB_ACTIONS) {
      console.log(
        `::notice::${one.path}: ${one.name} without the bridge. This React may no longer need it; see helix/core/src/helix-element/react-bridge.ts.`,
      )
    }
    lines.push(
      `  ${results.bridged ? 'ok  ' : 'FAIL'} ${one.path}: ${one.name}` +
        (results.blind
          ? '. Without the bridge it works too: this React no longer needs it here.'
          : '. Without the bridge it does not, so the bridge is what made it work.'),
    )
  }
} finally {
  await browser?.close()
  server.kill()
}

console.log(`hydration: the production build, on Chromium\n${lines.join('\n')}`)
if (failures.length > 0) {
  console.error(`\nhydration: ${failures.length} failed\n  ${failures.join('\n  ')}`)
  process.exitCode = 1
}

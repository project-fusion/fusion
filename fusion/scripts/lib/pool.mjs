/**
 * Running a browser check's families side by side, on pages the pool opens.
 *
 * Shared by the checks that drive a browser through the whole corpus, because
 * each carried the same loop, one page walked through every family in turn, and
 * the first of them to be pooled (`run-browser-specs.mjs`) learned what the
 * others would otherwise learn again. `check-contrast.mjs` still walks one
 * page, and says why: a check can join only once its result is a function of
 * each family alone, which is the property this is built on.
 *
 * **A fresh page for every item, unless a check asks for one per worker.** A
 * family is an independent bundle, and a page that has run one family carries
 * its history into the next: the specs found Select passing only because
 * Combobox had defined the option element before Filter Input could. So by
 * default `run` is handed a page nothing has touched, and closing it is the
 * pool's job.
 *
 * **`page: 'worker'` is one page per worker, handed every item that worker
 * takes**, for a check that leaves nothing on the page for the next family to
 * inherit. Parity, hydration and visual navigate for every picture, so the
 * registry is empty for each of them anyway, and smoke's frame defines every
 * family from one bundle before the first. What a fresh page still kept apart
 * was what the page heard, its errors and its warnings, and a check that clears
 * what it records before each example keeps them apart as well. **What a
 * fresh page does cost, a runner pays in full**: `ubuntu-latest` has two cores
 * and gets one worker, and measured there on 15 Sep 2026 a page per family took
 * smoke from 140 seconds on one shared page to 172, and visual from 229 to 283.
 *
 * **`open(page)` runs once on every page the pool opens**, per item or per
 * worker, for what belongs to the page rather than to an item: listeners, a CPU
 * throttle, a frame loaded once. `run` is handed what it returns, or the page
 * when there is no `open`, so a check on a page per worker attaches its
 * listeners once rather than once per family.
 *
 * **Worker `k` takes items `k`, `k + n`, and so on, rather than the next free
 * one off a queue.** A queue balances better when families differ in size, and
 * it makes which families shared a browser context a matter of timing. Pages in
 * one context share its storage and its cache, and a page per worker shares
 * everything, so a finding that depends on what ran before it could then not be
 * reproduced by running again. A stripe makes it a function of the worker count,
 * and `--workers 1` is the serial run exactly.
 *
 * **Results come back in the order the items were given**, whichever worker ran
 * them, so a check prints its findings in the order it always did and two runs
 * on different worker counts read the same.
 *
 * **One core is left for the browser process and the script, and four at most.**
 * Measured 14 Sep 2026 on twelve cores, the specs took 44 seconds on one worker,
 * 24 on two and 17 on four. **A GitHub runner is two cores, and gets one**: on
 * the first CI run of the specs pooled, two workers there timed out four Chat
 * specs at the harness's two-second bound. `--workers n` overrides the default,
 * which is how to reproduce a runner on a desk or take the serial run to compare
 * against.
 */
import { availableParallelism } from 'node:os'
import { argument } from './argv.mjs'

/** How many workers a check runs on: `--workers n`, or every core but one, and four at most. */
export const workers = () => {
  const asked = argument('workers')
  if (asked === undefined) {
    return Math.max(1, Math.min(4, availableParallelism() - 1))
  }
  const count = Number(asked)
  /* Refused rather than read as the default, because a run somebody asked to
     take serially and that silently ran on four is the comparison they wanted
     turned into the one they already had. */
  if (!Number.isInteger(count) || count < 1) {
    throw new Error(`--workers takes a whole number of at least 1, and was given \`${asked}\``)
  }
  return count
}

/**
 * Runs `run(opened, item, index)` for every item, on `count` workers, each
 * worker in a browser context of its own.
 *
 * `context` is what `browser.newContext` is given, so a viewport, a device scale
 * or reduced motion is set once and holds for every page. `prepare(context)` runs
 * once per worker before its first item, for what belongs to the context rather
 * than to a page, such as a route. `page` is `'item'`, a fresh page for every
 * item and the default, or `'worker'`, one page for every item a worker takes.
 * `open(page)` runs on each page as it is opened, and `opened` is what it
 * returned, or the page itself when there is no `open`. Returns what `run`
 * returned, in item order.
 */
export const pool = async (
  items,
  { browser, context = {}, count = workers(), open, page = 'item', prepare, run },
) => {
  if (page !== 'item' && page !== 'worker') {
    throw new Error(`pool: \`page\` is 'item' or 'worker', and was given \`${page}\``)
  }
  const results = new Array(items.length)
  const lanes = Math.min(count, items.length)
  await Promise.all(
    Array.from({ length: lanes }, async (_, k) => {
      const made = await browser.newContext(context)
      await prepare?.(made)
      const fresh = async () => {
        const tab = await made.newPage()
        return { opened: open === undefined ? tab : await open(tab), tab }
      }
      const kept = page === 'worker' ? await fresh() : undefined
      for (let at = k; at < items.length; at += lanes) {
        const one = kept ?? (await fresh())
        try {
          results[at] = await run(one.opened, items[at], at)
        } finally {
          if (kept === undefined) {
            await one.tab.close().catch(() => {})
          }
        }
      }
      await made.close()
    }),
  )
  return results
}

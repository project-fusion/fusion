import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, test } from 'bun:test'
import { setTimers, timers } from '@fusion.dev/helix-core/capabilities/timers'
import { fakeTimers } from '@fusion.dev/helix-core/capabilities/timers/fake'
import { keyOf, SCENARIOS, type Step } from '@fusion.dev/helix-testing/conformance'
import { run } from '@fusion.dev/helix-testing/conformance/web'
import { hasLayout, registerDom } from '@fusion.dev/helix-testing/dom'

/* The web half of Loader's conformance scenarios, which React Native runs
   too, and the comparison holds the two records to each other.
   `helix/testing/src/conformance` has the format. Each scenario moves a
   fake clock, set as the timers capability before the loader is drawn, so
   its `delay` runs on it. */

/** What this element did in this page in each Loader scenario that has run, by its key. */
export const conformance: { [scenario: string]: readonly Step[] } = {}

const original = timers()

afterEach(() => {
  setTimers(original)
})

/* Where there is layout, as the other halves run: a page without it reads
   no custom state, so it could not say whether the loader waits. */
if (hasLayout()) {
  describe('loader conformance', () => {
    beforeAll(async () => {
      registerDom()
      await import('../index.js')
    })

    for (const scenario of SCENARIOS.loader) {
      test(scenario.name, async () => {
        const clock = fakeTimers()
        setTimers(clock)
        conformance[keyOf(scenario)] = await run(scenario, clock)
      })
    }
  })
}

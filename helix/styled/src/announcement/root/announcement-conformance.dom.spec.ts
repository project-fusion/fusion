import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, test } from 'bun:test'
import { setTimers, timers } from '@fusion.dev/helix-core/capabilities/timers'
import { fakeTimers } from '@fusion.dev/helix-core/capabilities/timers/fake'
import { keyOf, SCENARIOS, type Step, usesClock } from '@fusion.dev/helix-testing/conformance'
import { run } from '@fusion.dev/helix-testing/conformance/web'
import { hasLayout, registerDom } from '@fusion.dev/helix-testing/dom'

/* The web half of Announcement's conformance scenarios, which React Native
   runs too, and the comparison holds the two records to each other.
   `helix/testing/src/conformance` has the format. A press lands where a
   finger lands, so this half runs where there is layout. A scenario that
   moves the clock sets a fake as the timers capability before the element
   is drawn, so its countdown runs on it. */

/** What this element did in this page in each Announcement scenario that has run, by its key. */
export const conformance: { [scenario: string]: readonly Step[] } = {}

const original = timers()

afterEach(() => {
  setTimers(original)
})

if (hasLayout()) {
  describe('announcement conformance', () => {
    beforeAll(async () => {
      registerDom()
      await import('../index.js')
    })

    for (const scenario of SCENARIOS.announcement) {
      test(scenario.name, async () => {
        const clock = fakeTimers()
        setTimers(clock)
        conformance[keyOf(scenario)] = await run(scenario, usesClock(scenario) ? clock : undefined)
      })
    }
  })
}

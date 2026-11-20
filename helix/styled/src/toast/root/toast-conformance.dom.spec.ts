import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, test } from 'bun:test'
import { setTimers, timers } from '@fusion.dev/helix-core/capabilities/timers'
import { fakeTimers } from '@fusion.dev/helix-core/capabilities/timers/fake'
import { keyOf, SCENARIOS, type Step, usesClock } from '@fusion.dev/helix-testing/conformance'
import { run } from '@fusion.dev/helix-testing/conformance/web'
import { hasLayout, registerDom } from '@fusion.dev/helix-testing/dom'

/* The web half of Toast's conformance scenarios, which the comparison holds
   to the React Native half. `helix/testing/src/conformance` has the format.
   A press lands where a finger lands, and the stack stands in the top
   layer, so this half runs where there is a browser. A scenario that moves
   the clock sets a fake as the timers capability before the stack is
   drawn, so each message's countdown runs on it. */

/** What these elements did in this page in each Toast scenario that has run, by its key. */
export const conformance: { [scenario: string]: readonly Step[] } = {}

const original = timers()

afterEach(() => {
  setTimers(original)
})

if (hasLayout()) {
  describe('toast conformance', () => {
    beforeAll(async () => {
      registerDom()
      await import('../index.js')
    })

    for (const scenario of SCENARIOS.toast) {
      test(scenario.name, async () => {
        const clock = fakeTimers()
        setTimers(clock)
        conformance[keyOf(scenario)] = await run(scenario, usesClock(scenario) ? clock : undefined)
      })
    }
  })
}

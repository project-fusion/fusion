import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, test } from 'bun:test'
import { setTimers, timers } from '@fusion.dev/helix-core/capabilities/timers'
import { fakeTimers } from '@fusion.dev/helix-core/capabilities/timers/fake'
import { keyOf, SCENARIOS, type Step, usesClock } from '@fusion.dev/helix-testing/conformance'
import { run } from '@fusion.dev/helix-testing/conformance/web'
import { hasLayout, registerDom } from '@fusion.dev/helix-testing/dom'

/* The web half of Number Input's conformance scenarios, which React Native
   runs too, and the comparison holds the two records to each other.
   `helix/testing/src/conformance` has the format. A test fails only where
   the harness could not run the scenario. A scenario that holds a stepper
   moves a fake clock, set as the timers capability before the input is
   drawn, so its repeat runs on it. A press lands where a finger lands, so
   this half runs where there is layout. */

/** What this element did in this page in each Number Input scenario that has run, by its key. */
export const conformance: { [scenario: string]: readonly Step[] } = {}

const original = timers()

afterEach(() => {
  setTimers(original)
})

if (hasLayout()) {
  describe('number input conformance', () => {
    beforeAll(async () => {
      registerDom()
      await import('../index.js')
    })

    for (const scenario of SCENARIOS['number-input']) {
      test(scenario.name, async () => {
        const clock = usesClock(scenario) ? fakeTimers() : undefined
        if (clock !== undefined) {
          setTimers(clock)
        }
        conformance[keyOf(scenario)] = await run(scenario, clock)
      })
    }
  })
}

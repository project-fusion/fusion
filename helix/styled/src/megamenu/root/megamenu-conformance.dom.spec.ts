import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, test } from 'bun:test'
import { keyOf, SCENARIOS, type Step } from '@fusion.dev/helix-testing/conformance'
import { run } from '@fusion.dev/helix-testing/conformance/web'
import { hasLayout, registerDom } from '@fusion.dev/helix-testing/dom'

/* The web half of Megamenu's conformance scenarios, which the comparison
   holds to the React Native half. `helix/testing/src/conformance` has the
   format. A test fails only where the harness could not run the scenario.
   Focus moves into each item's shadow root, so this half runs where there
   is a browser. */

/** What these elements did in this page in each Megamenu scenario that has run, by its key. */
export const conformance: { [scenario: string]: readonly Step[] } = {}

if (hasLayout()) {
  describe('megamenu conformance', () => {
    beforeAll(async () => {
      registerDom()
      await import('../index.js')
    })

    for (const scenario of SCENARIOS.megamenu) {
      test(scenario.name, async () => {
        conformance[keyOf(scenario)] = await run(scenario)
      })
    }
  })
}

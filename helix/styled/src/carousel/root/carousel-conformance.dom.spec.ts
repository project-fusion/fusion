import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, test } from 'bun:test'
import { keyOf, SCENARIOS, type Step } from '@fusion.dev/helix-testing/conformance'
import { run } from '@fusion.dev/helix-testing/conformance/web'
import { hasLayout, registerDom } from '@fusion.dev/helix-testing/dom'

/* The web half of Carousel's conformance scenarios, which React Native runs too,
   and the comparison holds the two records to each other.
   `helix/testing/src/conformance` has the format. A test fails only where the
   harness could not run the scenario. The track scrolls by the lengths it
   measures, so this half runs where there is layout. */

/** What this element did in this page in each Carousel scenario that has run, by its key. */
export const conformance: { [scenario: string]: readonly Step[] } = {}

if (hasLayout()) {
  describe('carousel conformance', () => {
    beforeAll(async () => {
      registerDom()
      await import('../index.js')
      await import('../../card/index.js')
    })

    for (const scenario of SCENARIOS.carousel) {
      test(scenario.name, async () => {
        conformance[keyOf(scenario)] = await run(scenario)
      })
    }
  })
}

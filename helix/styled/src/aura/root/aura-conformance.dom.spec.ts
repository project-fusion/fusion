import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, test } from 'bun:test'
import { keyOf, SCENARIOS, type Step } from '@fusion.dev/helix-testing/conformance'
import { drawInSoftware, run } from '@fusion.dev/helix-testing/conformance/web'
import { hasLayout, registerDom } from '@fusion.dev/helix-testing/dom'

/* The web half of Aura's conformance scenarios, which React Native runs too,
   and the comparison holds the two records to each other.
   `helix/testing/src/conformance` has the format. The field is out of a
   screen reader's reach on both platforms, so the record holds the pause
   control and what it says, and every browser runs it on the gradient, as
   `drawInSoftware` says why. */

/** What this element did in this page in each Aura scenario that has run, by its key. */
export const conformance: { [scenario: string]: readonly Step[] } = {}

/* Where there is layout, as the other halves run: a page without it reads no
   custom state. */
if (hasLayout()) {
  describe('aura conformance', () => {
    beforeAll(async () => {
      registerDom()
      await import('../index.js')
    })

    for (const scenario of SCENARIOS.aura) {
      test(scenario.name, async () => {
        const undo = drawInSoftware()
        try {
          conformance[keyOf(scenario)] = await run(scenario)
        } finally {
          undo()
        }
      })
    }
  })
}

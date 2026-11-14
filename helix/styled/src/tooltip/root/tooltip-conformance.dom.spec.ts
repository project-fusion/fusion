import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, test } from 'bun:test'
import { keyOf, SCENARIOS, type Step } from '@fusion.dev/helix-testing/conformance'
import { run } from '@fusion.dev/helix-testing/conformance/web'
import { hasLayout, registerDom } from '@fusion.dev/helix-testing/dom'

/* The web half of Tooltip's conformance scenarios, which the comparison
   holds to the React Native half. `helix/testing/src/conformance` has the
   format. A test fails only where the harness could not run the scenario. A
   tooltip is placed against its trigger by where each is drawn, so this half
   runs where there is layout. */

/** What this element did in this page in each Tooltip scenario that has run, by its key. */
export const conformance: { [scenario: string]: readonly Step[] } = {}

if (hasLayout()) {
  describe('tooltip conformance', () => {
    beforeAll(async () => {
      registerDom()
      await import('../index.js')
      await import('../../button/index.js')
    })

    for (const scenario of SCENARIOS.tooltip) {
      test(scenario.name, async () => {
        /* A bubble another spec left up is a deeper layer that would take
           the first Escape, as the page's dismissal gives it to one layer. */
        for (const left of document.querySelectorAll<Element & { hide?: () => void }>(
          'helix-tooltip, helix-headless-tooltip',
        )) {
          left.hide?.()
        }
        conformance[keyOf(scenario)] = await run(scenario)
      })
    }
  })
}

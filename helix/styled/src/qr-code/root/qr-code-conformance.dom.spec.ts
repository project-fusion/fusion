import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, test } from 'bun:test'
import { keyOf, SCENARIOS, type Step } from '@fusion.dev/helix-testing/conformance'
import { run } from '@fusion.dev/helix-testing/conformance/web'
import { hasLayout, registerDom } from '@fusion.dev/helix-testing/dom'

/* The web half of QR Code's conformance scenarios, which React Native runs
   too, and the comparison holds the two records to each other.
   `helix/testing/src/conformance` has the format. */

/** What this element did in this page in each QR Code scenario that has run, by its key. */
export const conformance: { [scenario: string]: readonly Step[] } = {}

/* Where there is layout, as the other halves run: happy-dom calls an
   element's own `dispatchEvent` again for each phase of an `error`, so the
   record would hear one `error` three times. */
if (hasLayout()) {
  describe('qr code conformance', () => {
    beforeAll(async () => {
      registerDom()
      await import('../index.js')
    })

    for (const scenario of SCENARIOS['qr-code']) {
      test(scenario.name, async () => {
        conformance[keyOf(scenario)] = await run(scenario)
      })
    }
  })
}

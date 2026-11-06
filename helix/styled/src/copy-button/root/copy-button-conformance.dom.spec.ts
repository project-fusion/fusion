import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, test } from 'bun:test'
import { clipboard, setClipboard } from '@fusion.dev/helix-core/capabilities/clipboard'
import { fakeClipboard } from '@fusion.dev/helix-core/capabilities/clipboard/fake'
import { setTimers, timers } from '@fusion.dev/helix-core/capabilities/timers'
import { fakeTimers } from '@fusion.dev/helix-core/capabilities/timers/fake'
import { keyOf, SCENARIOS, type Step, usesClock } from '@fusion.dev/helix-testing/conformance'
import { run } from '@fusion.dev/helix-testing/conformance/web'
import { hasLayout, registerDom } from '@fusion.dev/helix-testing/dom'

/* The web half of Copy Button's conformance scenarios, which the comparison
   holds to the React Native half. `helix/testing/src/conformance` has the
   format. Each scenario copies into a fake clipboard, set as the clipboard
   capability before the button is drawn, and one that moves the clock moves
   a fake one, so the result ends as a phone's does. The button draws its
   tooltip in the top layer, so this half runs where there is layout. */

/** What this element did in this page in each Copy Button scenario that has run, by its key. */
export const conformance: { [scenario: string]: readonly Step[] } = {}

const original = { clipboard: clipboard(), timers: timers() }

afterEach(() => {
  setClipboard(original.clipboard)
  setTimers(original.timers)
})

if (hasLayout()) {
  describe('copy button conformance', () => {
    beforeAll(async () => {
      registerDom()
      await import('../index.js')
    })

    for (const scenario of SCENARIOS['copy-button']) {
      test(scenario.name, async () => {
        setClipboard(fakeClipboard())
        const clock = usesClock(scenario) ? fakeTimers() : undefined
        if (clock !== undefined) {
          setTimers(clock)
        }
        conformance[keyOf(scenario)] = await run(scenario, clock)
      })
    }
  })
}

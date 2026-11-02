import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, logged, part, registerDom } from '@fusion.dev/helix-testing/dom'
import events from '../.examples/events.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../flex/index.js')
  await import('../../list/index.js')
})

/* Browser only: happy-dom does not run a script inserted by script. */
const run = hasLayout() ? test : (): void => {}

const type = (control: HTMLInputElement | HTMLTextAreaElement, text: string): void => {
  control.value = text
  control.dispatchEvent(
    new InputEvent('input', { bubbles: true, composed: true, inputType: 'insertText' }),
  )
}

describe('the events example', () => {
  /* **The first color picker this page paints, inside this test's time.** The
     direction specs before it mount pickers and read their layout, and never
     wait for a frame. In WebKit on x86 with no GPU the page's first paint of
     the picker took 1.3 to 2.4 seconds, measured in the Playwright image
     under emulation on October 22, 2026, about half of it the Slider thumbs'
     blurred shadows; every frame after it took about 40ms. On CI's two-core
     runners it ran past the 2000ms default: 3 of the 6 WebKit spec failures
     in the 80 runs before this change were this test. So the test waits on
     the picker's update, not on frames: the three events arrive while the
     input and change dispatch, and the log writes its rows as they do. The
     longer limit covers a first mount that still paints slowly. */
  run(
    'moving across the square proposes the color, announces it and commits it',
    async () => {
      await example(events)
      const swatch = document.getElementById('swatch') as HTMLElement & {
        updateComplete: Promise<unknown>
        value: string
      }
      const before = swatch.value
      const saturation = part(swatch, 'grid-saturation') as HTMLInputElement
      type(saturation, String(Number(saturation.value || 50) - 20))
      saturation.dispatchEvent(new Event('change', { bubbles: true }))
      await swatch.updateComplete
      expect(logged()).toEqual(['helix-before-change', 'input', 'change'])
      expect(swatch.value).not.toBe(before)
    },
    5000,
  )
})

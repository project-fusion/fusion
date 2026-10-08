import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, logged, part, registerDom } from '@fusion.dev/helix-testing/dom'
import events from '../.examples/events.html' with { type: 'text' }
import placed from '../.examples/placement.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../flex/index.js')
  await import('../../list/index.js')
  await import('../../icon/index.js')
})

/* Browser only: happy-dom does not run a script inserted by script. */
const run = hasLayout() ? test : (): void => {}

describe('the events example', () => {
  run('the trigger opens the dial, and an action selects and closes it', async () => {
    await example(events)
    ;(part(document.getElementById('dial') as HTMLElement, 'trigger') as HTMLElement).click()
    await idle()
    expect(logged()).toEqual(['helix-before-open', 'toggle'])
    const upload = document.querySelector('helix-speed-dial-item[value="upload"]') as HTMLElement
    ;(upload.shadowRoot?.querySelector('button') as HTMLElement | null)?.click()
    await idle()
    expect(logged()).toEqual([
      'helix-before-open',
      'toggle',
      'helix-select',
      'helix-before-close',
      'toggle',
    ])
  })
})

/**
 * Which side the mark sits on, asserted in a browser because only a browser can
 * answer it.
 *
 * **The rule that used to decide this was `:host-context()`, which is
 * Chromium-only.** An action is slotted into the dial's panel, so its own sheet
 * can reach the side the panel landed on through nothing else, and `Steps`
 * records the same finding and hands its arrangement down as custom properties
 * instead. In Firefox and Safari the rule matched nothing, so a dial fanning to
 * the start kept `row-reverse` and drew every mark on the far side of its name,
 * away from the trigger the column hangs under: valid CSS, no error, and only on
 * two engines.
 *
 * What holds it now is a property the panel sets and the action reads, which
 * inherits through the flat tree everywhere. Asserted on the computed value
 * rather than on the rule, so it is the question a reader has rather than the
 * mechanism that answers it.
 */
describe('which side an action is drawn from', () => {
  const rowOf = (dial: HTMLElement): string => {
    const action = dial.querySelector('helix-speed-dial-item') as HTMLElement
    const control = action.shadowRoot?.querySelector('[part="item"]') as HTMLElement
    return getComputedStyle(control).flexDirection
  }

  run('the marks line up under the trigger, on the end the panel opened to', async () => {
    await example(placed)
    const dial = document.querySelector('helix-speed-dial') as HTMLElement
    ;(part(dial, 'trigger') as HTMLElement).click()
    await idle()
    // `top-start`, so the names run outward from the marks rather than into them.
    expect(rowOf(dial)).toBe('row')
  })

  run('and the resting end is the other one', async () => {
    await example(events)
    const dial = document.getElementById('dial') as HTMLElement
    ;(part(dial, 'trigger') as HTMLElement).click()
    await idle()
    expect(rowOf(dial)).toBe('row-reverse')
  })
})

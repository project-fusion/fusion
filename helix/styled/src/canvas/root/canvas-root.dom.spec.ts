import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, registerDom, type Updatable } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* Browser only: the pad's buttons are found by where they sit, and happy-dom
   lays nothing out. */
const run = hasLayout() ? test : (): void => {}

/** The control that holds the pad's one tab stop, by its part. */
const holder = (host: Element): string | null | undefined =>
  [...(host.shadowRoot?.querySelector('[part="controls"]')?.children ?? [])]
    .find(
      (control) =>
        control.getAttribute('tabindex') === '0' ||
        (control as Element & { focusable?: boolean }).focusable === true,
    )
    ?.getAttribute('part')

const press = (host: Element, name: string, key: string): KeyboardEvent => {
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    composed: true,
    key,
  })
  host.shadowRoot?.querySelector(`[part="${name}"]`)?.dispatchEvent(event)
  return event
}

describe('the styled canvas’s pan and zoom pad', () => {
  run('moves between its buttons by where they sit, and pans nothing on the way', async () => {
    const host = (await mount(
      '<helix-canvas label="A board" controls="pan zoom fullscreen"></helix-canvas>',
    )) as Updatable & HTMLElement
    await host.updateComplete
    await new Promise((resolve) => requestAnimationFrame(resolve))
    const panned: Event[] = []
    host.addEventListener('helix-canvas-pan', (event) => panned.push(event))
    expect(host.shadowRoot?.querySelector('[part="controls"]')?.getAttribute('role')).toBe(
      'toolbar',
    )
    expect(holder(host)).toBe('pan-up')
    press(host, 'pan-up', 'ArrowRight')
    expect(holder(host)).toBe('zoom-in')
    press(host, 'zoom-in', 'ArrowDown')
    expect(holder(host)).toBe('zoom-out')
    press(host, 'zoom-out', 'ArrowLeft')
    expect(holder(host)).toBe('pan-end')
    press(host, 'pan-end', 'ArrowLeft')
    expect(holder(host)).toBe('pan-start')
    press(host, 'pan-start', 'ArrowDown')
    expect(holder(host)).toBe('pan-down')
    expect(press(host, 'pan-down', 'ArrowDown').defaultPrevented).toBe(true)
    expect(holder(host)).toBe('pan-down')
    expect(panned).toHaveLength(0)
  })
})

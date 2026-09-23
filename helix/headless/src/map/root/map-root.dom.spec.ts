import { beforeAll, describe, expect, test } from 'bun:test'
import { hasState, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Map = HTMLElement & {
  idleDelay: number
  label: string
  panStep: number
  updateComplete: Promise<boolean>
}

const map = async (extra = ''): Promise<Map> =>
  (await mount(
    `<helix-headless-map label="Edinburgh" ${extra}>
      <canvas></canvas>
      <span slot="attribution">© OpenStreetMap contributors</span>
    </helix-headless-map>`,
  )) as Map

/** A part inside the frame, by its exact name in the `part` list. */
const control = (host: Map, name: string): HTMLElement | null =>
  (host.shadowRoot?.querySelector(`[part~="${name}"]`) as HTMLElement) ?? null

describe('map frame', () => {
  test('the region carries the name, which is the whole argument for the family', async () => {
    /* Measured before this was written: a canvas slotted the ordinary way has no
       node at all in the accessibility tree. A named region is the difference
       between a map a screen reader never meets and one it announces. */
    const host = await map()
    expect(part(host, 'region')?.getAttribute('aria-label')).toBe('Edinburgh')
    expect(part(host, 'region')?.getAttribute('role')).toBe('group')
  })

  test('the controls are buttons, so every screen reader can find them', async () => {
    // Not arrow keys alone: what a screen reader does with arrows is not ours to
    // decide, and a button needs no bargain about reading mode.
    const host = await map()
    for (const name of ['pan-up', 'pan-down', 'pan-start', 'pan-end', 'zoom-in', 'zoom-out']) {
      const button = control(host, name)
      expect(button?.tagName.toLowerCase()).toBe('button')
      expect(button?.getAttribute('aria-label')).toBeTruthy()
    }
  })

  test('a press asks rather than moves, and says which way and how far', async () => {
    const host = await map()
    const asked: Array<{ by: number; to: string }> = []
    host.addEventListener('helix-map-pan', (event) => {
      asked.push((event as CustomEvent<{ by: number; to: string }>).detail)
    })
    control(host, 'pan-up')?.click()
    control(host, 'pan-end')?.click()
    expect(asked).toEqual([
      { by: 0.25, to: 'up' },
      { by: 0.25, to: 'end' },
    ])
  })

  test('zoom is a direction rather than a level', async () => {
    /* A scale is the consumer's: Leaflet, MapLibre and a static tile server do
       not agree on what zoom 14 is, so a frame naming one would be asserting a
       numbering it cannot know. */
    const host = await map()
    const asked: number[] = []
    host.addEventListener('helix-map-zoom', (event) => {
      asked.push((event as CustomEvent<{ by: number }>).detail.by)
    })
    control(host, 'zoom-in')?.click()
    control(host, 'zoom-out')?.click()
    expect(asked).toEqual([1, -1])
  })

  test('the step is a fraction of the viewport, and a consumer can change it', async () => {
    const host = await map('pan-step="0.5"')
    const asked: number[] = []
    host.addEventListener('helix-map-pan', (event) => {
      asked.push((event as CustomEvent<{ by: number }>).detail.by)
    })
    control(host, 'pan-down')?.click()
    expect(asked).toEqual([0.5])
  })

  test('the arrow keys ask for the same thing the buttons do', async () => {
    const host = await map()
    const asked: string[] = []
    host.addEventListener('helix-map-pan', (event) => {
      asked.push((event as CustomEvent<{ to: string }>).detail.to)
    })
    const region = part(host, 'region') as HTMLElement
    for (const key of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) {
      region.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key }))
    }
    expect(asked).toEqual(['up', 'down', 'start', 'end'])
  })

  test('the chrome may hide, and the controls never do', async () => {
    /* A reader who has gone still has not stopped needing the only controls this
       frame offers. */
    const host = await map('idle-delay="10"')
    await new Promise((resolve) => setTimeout(resolve, 30))
    await host.updateComplete
    expect(hasState(host, 'idle')).toBe(true)
    expect(control(host, 'zoom-in')).not.toBeNull()
  })

  test('the wait is off by default, because the controls are how it is operated', async () => {
    const host = await map()
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(hasState(host, 'idle')).toBe(false)
  })

  test('the attribution is slotted and nothing takes it away', async () => {
    // Most tile licenses require the credit to be visible.
    const host = await map()
    expect(host.querySelector('[slot="attribution"]')?.textContent).toContain('OpenStreetMap')
    expect(host.shadowRoot?.querySelector('slot[name="attribution"]')).not.toBeNull()
  })
})

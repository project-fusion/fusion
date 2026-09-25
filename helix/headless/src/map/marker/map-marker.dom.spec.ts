import { beforeAll, describe, expect, test } from 'bun:test'
import { hasState, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Marker = HTMLElement & { current: boolean; updateComplete: Promise<boolean> }
type Frame = HTMLElement & { updateComplete: Promise<boolean> }

/** A frame with three places, written in the order a reader should walk them. */
const frame = async (): Promise<Frame> => {
  const host = (await mount(
    `<helix-headless-map label="Deliveries">
      <canvas></canvas>
      <helix-headless-map-marker label="Depot" lat="37.77" lng="-122.41"></helix-headless-map-marker>
      <helix-headless-map-marker label="Ferry Building" name="ferry" lat="37.79" lng="-122.39"></helix-headless-map-marker>
      <helix-headless-map-marker label="Mission Dolores" lat="37.76" lng="-122.43"></helix-headless-map-marker>
    </helix-headless-map>`,
  )) as Frame
  await host.updateComplete
  for (const one of markers(host)) {
    await one.updateComplete
  }
  return host
}

const markers = (host: Frame): Marker[] =>
  [...host.querySelectorAll('helix-headless-map-marker')] as Marker[]

const press = (marker: Marker, key: string): KeyboardEvent => {
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    composed: true,
    key,
  })
  part(marker, 'marker')?.dispatchEvent(event)
  return event
}

/** Which markers hold the tab stop, by label. */
const stops = (host: Frame): string[] =>
  markers(host)
    .filter((one) => part(one, 'marker')?.getAttribute('tabindex') === '0')
    .map((one) => one.getAttribute('label') ?? '')

describe('map marker', () => {
  test('a marker is a button named by its place, and its point is hidden', async () => {
    const host = await frame()
    const [depot] = markers(host)
    const button = part(depot as Marker, 'marker')
    expect(button?.getAttribute('role')).toBe('button')
    expect(button?.textContent?.trim()).toBe('Depot')
    expect(part(depot as Marker, 'point')?.getAttribute('aria-hidden')).toBe('true')
  })

  test('the map has one tab stop among its markers, on the first until a reader moves it', async () => {
    const host = await frame()
    expect(stops(host)).toEqual(['Depot'])
    expect(hasState(markers(host)[0] as Marker, 'current')).toBe(true)
  })

  test('the arrow keys walk the markers in the order they are written, and wrap', async () => {
    const host = await frame()
    const [depot, ferry, mission] = markers(host) as [Marker, Marker, Marker]
    depot.focus()
    press(depot, 'ArrowRight')
    await host.updateComplete
    expect(stops(host)).toEqual(['Ferry Building'])
    press(ferry, 'End')
    await host.updateComplete
    expect(stops(host)).toEqual(['Mission Dolores'])
    press(mission, 'ArrowRight')
    await host.updateComplete
    expect(stops(host)).toEqual(['Depot'])
  })

  test('pressing a marker says which place, by its name or its label', async () => {
    const host = await frame()
    const said: string[] = []
    host.addEventListener('helix-activate', (event) =>
      said.push((event as CustomEvent<{ value: string }>).detail.value),
    )
    const [depot, ferry] = markers(host) as [Marker, Marker]
    part(depot, 'marker')?.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
    press(ferry, 'Enter')
    press(ferry, ' ')
    expect(said).toEqual(['Depot', 'ferry', 'ferry'])
  })

  test('an arrow on a marker walks and does not pan the map', async () => {
    const host = await frame()
    const pans: Event[] = []
    host.addEventListener('helix-map-pan', (event) => pans.push(event))
    press(markers(host)[0] as Marker, 'ArrowDown')
    expect(pans).toHaveLength(0)
  })

  test('a name turned to the start says so, so the styled tier can put it there', async () => {
    const host = await frame()
    const [depot] = markers(host) as [Marker & { side: 'end' | 'start' }]
    expect(hasState(depot, 'start')).toBe(false)
    depot.side = 'start'
    await depot.updateComplete
    expect(hasState(depot, 'start')).toBe(true)
    // What the connector measures with: the button, which is laid out even while its name is faded.
    expect(typeof (depot as unknown as { extent(): number }).extent()).toBe('number')
  })
})

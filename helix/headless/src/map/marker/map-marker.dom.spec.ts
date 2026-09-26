import { beforeAll, describe, expect, test } from 'bun:test'
import { hasState, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Marker = HTMLElement & {
  current: boolean
  gathered: string[]
  gatheredBy: Marker | undefined
  updateComplete: Promise<boolean>
}
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

const press = (marker: Marker, key: string, type = 'keydown', repeat = false): KeyboardEvent => {
  const event = new KeyboardEvent(type, {
    bubbles: true,
    cancelable: true,
    composed: true,
    key,
    repeat,
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
    press(ferry, ' ', 'keyup')
    expect(said).toEqual(['Depot', 'ferry', 'ferry'])
  })

  test('a key held down presses once, and Space presses on its release as a button does', async () => {
    const host = await frame()
    const said: string[] = []
    host.addEventListener('helix-activate', (event) =>
      said.push((event as CustomEvent<{ value: string }>).detail.value),
    )
    const [depot] = markers(host) as [Marker]
    press(depot, 'Enter')
    press(depot, 'Enter', 'keydown', true)
    press(depot, 'Enter', 'keydown', true)
    const space = press(depot, ' ')
    expect(space.defaultPrevented).toBe(true)
    expect(said).toEqual(['Depot'])
    press(depot, ' ', 'keyup')
    expect(said).toEqual(['Depot', 'Depot'])
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

  test('a point holding an icon says so, so the styled tier can make room for it', async () => {
    const host = (await mount(
      `<helix-headless-map label="Walk">
        <helix-headless-map-marker label="UT Tower" lat="1" lng="1"><span slot="icon">A</span></helix-headless-map-marker>
        <helix-headless-map-marker label="Texas Capitol" lat="1" lng="2"></helix-headless-map-marker>
      </helix-headless-map>`,
    )) as Frame
    await host.updateComplete
    const [lettered, bare] = markers(host) as [Marker, Marker]
    await lettered.updateComplete
    await bare.updateComplete
    expect([hasState(lettered, 'icon'), hasState(bare, 'icon')]).toEqual([true, false])
    // Seen and not read: the name is still the place's.
    expect(part(lettered, 'marker')?.textContent?.replace(/\s+/g, ' ').trim()).toBe('UT Tower')
  })

  test('a marker standing for others is their count and their names, and a press opens it rather than one place', async () => {
    const host = (await mount(
      `<helix-headless-map label="Walk" lang="en">
        <helix-headless-map-marker label="Depot" lat="1" lng="1"></helix-headless-map-marker>
        <helix-headless-map-marker label="Ferry Building" lat="1" lng="1"></helix-headless-map-marker>
        <helix-headless-map-marker label="Mission Dolores" lat="1" lng="1"></helix-headless-map-marker>
      </helix-headless-map>`,
    )) as Frame
    await host.updateComplete
    const [depot, ferry, mission] = markers(host) as [Marker, Marker, Marker]
    depot.gathered = ['Depot', 'Ferry Building', 'Mission Dolores']
    ferry.gatheredBy = depot
    mission.gatheredBy = depot
    for (const one of [depot, ferry, mission]) {
      await one.updateComplete
    }
    await host.updateComplete
    expect(hasState(depot, 'cluster')).toBe(true)
    expect(part(depot, 'point')?.textContent?.trim()).toBe('3')
    expect(part(depot, 'label')?.textContent).toBe('Depot, Ferry Building, and Mission Dolores')
    expect([hasState(ferry, 'clustered'), part(ferry, 'marker')?.hasAttribute('hidden')]).toEqual([
      true,
      true,
    ])

    const opened: string[][] = []
    const activated: string[] = []
    host.addEventListener('helix-map-cluster', (event) => opened.push(event.detail.labels))
    host.addEventListener('helix-activate', (event) => activated.push(event.detail.value))
    part(depot, 'marker')?.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
    expect(opened).toEqual([['Depot', 'Ferry Building', 'Mission Dolores']])
    expect(activated).toEqual([])
  })

  test('the tab stop on a gathered marker goes to the one standing for it, and the walk skips it', async () => {
    const host = await frame()
    const [depot, ferry, mission] = markers(host) as [Marker, Marker, Marker]
    depot.gathered = ['Depot', 'Ferry Building']
    ferry.gatheredBy = depot
    await ferry.updateComplete
    await depot.updateComplete
    await host.updateComplete
    expect(stops(host)).toEqual(['Depot'])
    depot.focus()
    press(depot, 'ArrowRight')
    await host.updateComplete
    expect(stops(host)).toEqual(['Mission Dolores'])
    expect(mission.current).toBe(true)
  })

  test('a place passed says so after its name, and in a state the styled tier mutes', async () => {
    const host = await frame()
    const [depot] = markers(host) as [Marker & { passed: boolean; passedLabel: string }]
    depot.passed = true
    await depot.updateComplete
    expect(hasState(depot, 'passed')).toBe(true)
    expect(part(depot, 'marker')?.textContent?.trim()).toBe('Depot, passed')
    depot.passedLabel = 'visited'
    await depot.updateComplete
    expect(part(depot, 'label')?.textContent).toBe('Depot, visited')
    depot.passed = false
    await depot.updateComplete
    expect([hasState(depot, 'passed'), part(depot, 'label')?.textContent]).toEqual([false, 'Depot'])
  })
})

import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'
import type { MapPoint } from './map-route.js'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Layer = HTMLElement & {
  description?: string
  label?: string
  points: MapPoint[]
  updateComplete: Promise<boolean>
}
type Frame = HTMLElement & { updateComplete: Promise<boolean> }

const frame = async (inside: string): Promise<Frame> => {
  const host = (await mount(
    `<helix-headless-map label="Deliveries">${inside}</helix-headless-map>`,
  )) as Frame
  await host.updateComplete
  return host
}

/** What the frame's list says, one entry a line. */
const listed = (host: Frame): string[] =>
  [...(host.shadowRoot?.querySelectorAll('[part="layer"]') ?? [])].map((one) =>
    (one.textContent ?? '').replace(/\s+/g, ' ').trim(),
  )

describe('map route and area', () => {
  test('points are lat,lng pairs as a marker reads them, and a pair that is not one is dropped', async () => {
    const host = await frame(
      '<helix-headless-map-route label="Round" points="37.77,-122.41 nope 37.79,-122.39 1,2,3 30.1, ,-97.7"></helix-headless-map-route>',
    )
    const route = host.querySelector('helix-headless-map-route') as Layer
    expect(route.points).toEqual([
      { lat: 37.77, lng: -122.41 },
      { lat: 37.79, lng: -122.39 },
    ])
  })

  test('points set as a property say so rather than being reflected into the markup', async () => {
    const host = await frame('<helix-headless-map-area label="Zone"></helix-headless-map-area>')
    const area = host.querySelector('helix-headless-map-area') as Layer
    const said: string[] = []
    host.addEventListener('helix-map-part-change', (event) => said.push(event.detail.kind))
    area.points = [
      { lat: 1, lng: 2 },
      { lat: 3, lng: 4 },
      { lat: 5, lng: 2 },
    ]
    await area.updateComplete
    expect(said).toEqual(['layer'])
    expect(area.hasAttribute('points')).toBe(false)
  })

  test('the frame names every route and area in a list, in the order they are written', async () => {
    const host = await frame(
      `<canvas></canvas>
       <helix-headless-map-route label="Depot to Mission" description="4.2 km" points="1,1 2,2"></helix-headless-map-route>
       <helix-headless-map-marker label="Depot" lat="1" lng="1"></helix-headless-map-marker>
       <helix-headless-map-area label="Delivery zone" points="1,1 2,2 1,3"></helix-headless-map-area>`,
    )
    const list = part(host, 'layers')
    expect(list?.tagName).toBe('UL')
    expect(list?.getAttribute('aria-label')).toBe('Map layers')
    expect(listed(host)).toEqual(['Depot to Mission, 4.2 km', 'Delivery zone'])
  })

  test('renaming one says the new name, and a map with none has no list', async () => {
    const host = await frame(
      '<helix-headless-map-route label="Old" points="1,1 2,2"></helix-headless-map-route>',
    )
    const route = host.querySelector('helix-headless-map-route') as Layer
    route.label = 'New'
    await route.updateComplete
    await new Promise((done) => setTimeout(done, 0))
    await host.updateComplete
    expect(listed(host)).toEqual(['New'])

    const bare = await frame('<canvas></canvas>')
    expect(part(bare, 'layers')).toBeNull()
  })
})

/** A picture that is data, so a spec run in a page asks the network for nothing. */
const PICTURE = 'data:image/gif;base64,R0lGODlhAQABAAAAACw='

describe('map layers menu', () => {
  const menuFrame = async (): Promise<Frame> => {
    const host = (await mount(
      `<helix-headless-map controls="pan zoom layers" label="Deliveries">
        <helix-headless-map-route label="Depot to Mission" points="1,1 2,2"></helix-headless-map-route>
        <helix-headless-map-area hidden label="Delivery zone" points="1,1 2,2 1,3"></helix-headless-map-area>
      </helix-headless-map>`,
    )) as Frame
    await host.updateComplete
    await new Promise((done) => setTimeout(done, 0))
    await host.updateComplete
    return host
  }
  const settle = async (host: Frame): Promise<void> => {
    await new Promise((done) => setTimeout(done, 0))
    await host.updateComplete
  }

  test('the menu is drawn only where controls name it, and opens from its button', async () => {
    const plain = await frame(
      '<helix-headless-map-route label="Round" points="1,1 2,2"></helix-headless-map-route>',
    )
    expect(part(plain, 'layers-toggle')).toBeNull()

    const host = await menuFrame()
    const toggle = part(host, 'layers-toggle') as HTMLButtonElement
    const menu = part(host, 'layers-menu') as HTMLElement
    expect(toggle.getAttribute('aria-label')).toBe('Map layers')
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(menu.hidden).toBe(true)
    const scope = toggle.getRootNode() as ShadowRoot
    expect(scope.getElementById(toggle.getAttribute('aria-controls') ?? '')).toBe(menu)

    toggle.click()
    await host.updateComplete
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    expect(menu.hidden).toBe(false)
    const choices = [...menu.querySelectorAll('[part="layer-choice"]')].map((one) => [
      one.tagName,
      (one.textContent ?? '').trim(),
      one.getAttribute('aria-pressed'),
      one.querySelector('[part="layer-icon"]')?.getAttribute('aria-hidden'),
    ])
    expect(choices).toEqual([
      ['BUTTON', 'Depot to Mission', 'true', 'true'],
      ['BUTTON', 'Delivery zone', 'false', 'true'],
    ])

    menu.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }))
    await host.updateComplete
    expect(menu.hidden).toBe(true)
  })

  test('a tile hides or shows its layer, the list names only what is shown, and a page hiding one is followed', async () => {
    const host = await menuFrame()
    expect(listed(host)).toEqual(['Depot to Mission'])
    const tiles = (): HTMLButtonElement[] =>
      [
        ...(part(host, 'layers-menu')?.querySelectorAll('[part="layer-choice"]') ?? []),
      ] as HTMLButtonElement[]
    const [route, area] = [...host.children] as HTMLElement[]

    tiles()[0]?.click()
    await settle(host)
    tiles()[1]?.click()
    await settle(host)
    expect(route?.hidden).toBe(true)
    expect(area?.hidden).toBe(false)
    expect(listed(host)).toEqual(['Delivery zone'])

    route?.removeAttribute('hidden')
    await settle(host)
    expect(tiles()[0]?.getAttribute('aria-pressed')).toBe('true')
    expect(listed(host)).toEqual(['Depot to Mission', 'Delivery zone'])
  })

  /* A tile wrote `hidden` onto the page's own element and sent nothing, so a
     page could neither store the choice nor keep its own state in step. */
  test('a tile asks first, from the layer, and refusing keeps the layer as it is', async () => {
    const host = await menuFrame()
    const [route] = [...host.children] as HTMLElement[]
    const asked: Array<{ checked: boolean; from: EventTarget | null }> = []
    host.addEventListener('helix-before-toggle', (event) => {
      asked.push({
        checked: (event as CustomEvent<{ checked: boolean }>).detail.checked,
        from: event.target,
      })
      event.preventDefault()
    })
    const tile = part(host, 'layers-menu')?.querySelector(
      '[part="layer-choice"]',
    ) as HTMLButtonElement
    tile.click()
    await settle(host)
    expect(asked).toEqual([{ checked: false, from: route }])
    expect(route?.hidden).toBe(false)
  })

  test('choosing a map type asks first and says so once it holds', async () => {
    const host = (await mount(
      `<helix-headless-map controls="layers" label="Ground">
        <helix-headless-map-raster ground label="Imagery"></helix-headless-map-raster>
      </helix-headless-map>`,
    )) as Frame & { mapType?: string }
    await settle(host)
    const heard: string[] = []
    host.addEventListener('helix-before-change', (event) => {
      heard.push(`before:${(event as CustomEvent<{ value: string }>).detail.value}`)
    })
    host.addEventListener('change', () => heard.push(`change:${host.mapType}`))
    const radios = [
      ...(part(host, 'layers-menu')?.querySelectorAll('input[type="radio"]') ?? []),
    ] as HTMLInputElement[]
    const satellite = radios[2] as HTMLInputElement
    satellite.checked = true
    satellite.dispatchEvent(new Event('change', { bubbles: true }))
    await settle(host)
    expect(heard).toEqual(['before:satellite', 'change:satellite'])
  })

  test('keys in the menu do not reach the map, and a press outside closes it', async () => {
    const host = await menuFrame()
    const panned: string[] = []
    host.addEventListener('helix-map-pan', () => panned.push('pan'))
    ;(part(host, 'layers-toggle') as HTMLButtonElement).click()
    await host.updateComplete
    const tile = part(host, 'layers-menu')?.querySelector('[part="layer-choice"]') as HTMLElement
    tile.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, composed: true, key: 'ArrowUp' }),
    )
    expect(panned).toEqual([])

    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }))
    await host.updateComplete
    expect((part(host, 'layers-menu') as HTMLElement).hidden).toBe(true)
  })

  test('layers in one group are one tile, named by the first, that shows or hides them all', async () => {
    const host = (await mount(
      `<helix-headless-map controls="layers" label="Walk">
        <helix-headless-map-route group="walk" label="Walking route" points="1,1 2,2"></helix-headless-map-route>
        <helix-headless-map-buildings></helix-headless-map-buildings>
        <helix-headless-map-route group="walk" label="Walk to the route" points="1,1 0,0"></helix-headless-map-route>
      </helix-headless-map>`,
    )) as Frame
    await settle(host)
    const choices = [
      ...(part(host, 'layers-menu')?.querySelectorAll('[part="layer-choice"]') ?? []),
    ]
    expect(choices.map((one) => (one.textContent ?? '').trim())).toEqual([
      'Walking route',
      '3D buildings',
    ])
    ;(choices[0] as HTMLButtonElement | undefined)?.click()
    await settle(host)
    const [route, buildings, leg] = [...host.children] as HTMLElement[]
    expect([route?.hidden, buildings?.hidden, leg?.hidden]).toEqual([true, false, true])
  })

  /* Shown and hidden by the map type through the frame's list and the
     connector, which ask it, and never by `hidden` written onto the layer:
     that was an attribute on the consumer's own markup nobody asked for. */
  test('imagery makes map-type cards, not a tile, and the chosen type shows or hides it', async () => {
    const host = (await mount(
      `<helix-headless-map controls="layers" label="Downtown">
        <helix-headless-map-raster ground label="Satellite imagery" src="photo/{z}/{y}/{x}"></helix-headless-map-raster>
        <helix-headless-map-buildings></helix-headless-map-buildings>
      </helix-headless-map>`,
    )) as Frame & { mapPreviews: Record<string, string>; mapType?: string }
    await settle(host)
    const imagery = host.querySelector('helix-headless-map-raster') as HTMLElement
    const listed = (): boolean =>
      (part(host, 'layers')?.textContent ?? '').includes('Satellite imagery')
    expect(imagery.hidden).toBe(false)
    expect(listed()).toBe(false)
    const kinds: string[] = []
    host.addEventListener('helix-map-part-change', (event) => kinds.push(event.detail.kind))
    ;(part(host, 'layers-toggle') as HTMLButtonElement).click()
    await settle(host)
    expect(kinds).toContain('menu')

    const cards = [...(part(host, 'map-types')?.querySelectorAll('[part="map-type"]') ?? [])]
    expect(part(host, 'map-types')?.getAttribute('role')).toBe('radiogroup')
    expect(cards.map((one) => (one.textContent ?? '').trim())).toEqual([
      'Standard',
      'Hybrid',
      'Satellite',
    ])
    const radio = (at: number): HTMLInputElement =>
      cards[at]?.querySelector('input') as HTMLInputElement
    expect(radio(0).checked).toBe(true)
    const tiles = [
      ...(part(host, 'layer-choices')?.querySelectorAll('[part="layer-choice"]') ?? []),
    ]
    expect(tiles.map((one) => (one.textContent ?? '').trim())).toEqual(['3D buildings'])

    radio(1).click()
    await settle(host)
    expect(host.mapType).toBe('hybrid')
    expect(host.getAttribute('map-type')).toBe('hybrid')
    expect(listed()).toBe(true)

    host.mapPreviews = { satellite: PICTURE }
    await settle(host)
    expect(cards[2]?.querySelector('img')?.getAttribute('src')).toBe(PICTURE)
    radio(0).click()
    await settle(host)
    expect(host.hasAttribute('map-type')).toBe(false)
    expect(listed()).toBe(false)
    expect(imagery.hidden).toBe(false)
  })

  test('a map with no imagery has no map-type cards', async () => {
    const host = await menuFrame()
    expect(part(host, 'map-types')).toBeNull()
  })
})

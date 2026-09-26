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
    expect(list?.getAttribute('aria-label')).toBe('Routes and areas')
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

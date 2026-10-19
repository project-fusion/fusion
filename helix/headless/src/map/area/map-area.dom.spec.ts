import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import type {
  clearWords as ClearWords,
  registerWords as RegisterWords,
} from '@fusion.dev/helix-core'
import { polygon } from '@fusion.dev/helix-icons'
import { mount, part, registerDom, settle, type Updatable } from '@fusion.dev/helix-testing/dom'
import type { MapPoint } from '../route/map-route.js'

/* Imported once the DOM is registered: core reads the globals it finds as
   it is evaluated, and a static import breaks the DOM when this file runs
   first. */
let clearWords: typeof ClearWords
let registerWords: typeof RegisterWords

beforeAll(async () => {
  registerDom()
  ;({ clearWords, registerWords } = await import('@fusion.dev/helix-core'))
  await import('../index.js')
})

afterEach(() => {
  clearWords()
})

type Area = Updatable & {
  caption?: string
  captionPlacement: 'inside' | 'outside'
  description?: string
  isMapLayer: boolean
  label: string
  layerKind: string
  points?: MapPoint[]
}

const frame = async (inside: string, attributes = ''): Promise<Updatable> => {
  const host = (await mount(
    `<helix-headless-map label="Deliveries" ${attributes}>${inside}</helix-headless-map>`,
  )) as Updatable
  await settle(host)
  return host
}

/** What the frame's list says, one entry a line. */
const listed = (host: Updatable): string[] =>
  [...(host.shadowRoot?.querySelectorAll('[part="layer"]') ?? [])].map((one) =>
    (one.textContent ?? '').replace(/\s+/g, ' ').trim(),
  )

/** The names on the layers menu's tiles. */
const tiles = (host: Updatable): string[] =>
  [...(part(host, 'layers-menu')?.querySelectorAll('[part="layer-name"]') ?? [])].map((one) =>
    (one.textContent ?? '').trim(),
  )

describe('map area', () => {
  test('it reads its attributes, and is named Area until it has a label', async () => {
    const host = await frame(
      '<helix-headless-map-area caption="A" caption-placement="outside" points="1,1 2,2 1,3"></helix-headless-map-area>',
    )
    const area = host.querySelector('helix-headless-map-area') as Area
    expect([area.caption, area.captionPlacement, area.label]).toEqual(['A', 'outside', 'Area'])
    expect(area.points).toEqual([
      { lat: 1, lng: 1 },
      { lat: 2, lng: 2 },
      { lat: 1, lng: 3 },
    ])
    expect(listed(host)).toEqual(['Area'])

    const bare = await frame('<helix-headless-map-area></helix-headless-map-area>')
    expect((bare.querySelector('helix-headless-map-area') as Area).captionPlacement).toBe('inside')
  })

  test('it tells the frame it is a layer, which lists it by name and gives its tile the shape picture', async () => {
    const host = await frame(
      '<helix-headless-map-area label="Delivery zone" description="Same day" points="1,1 2,2 1,3"></helix-headless-map-area>',
      'controls="layers"',
    )
    const area = host.querySelector('helix-headless-map-area') as Area
    expect([area.isMapLayer, area.layerKind]).toEqual([true, 'area'])
    expect(listed(host)).toEqual(['Delivery zone, Same day'])
    expect(tiles(host)).toEqual(['Delivery zone'])
    expect(part(host, 'layer-icon')?.innerHTML).toContain(polygon.content.slice(0, 40))
  })

  test('a caption, its placement, a name, or a description changed says so, and the frame lists the new words', async () => {
    const host = await frame(
      '<helix-headless-map-area label="Zone" points="1,1 2,2 1,3"></helix-headless-map-area>',
    )
    const area = host.querySelector('helix-headless-map-area') as Area
    const said: string[] = []
    host.addEventListener('helix-map-part-change', (event) => said.push(event.detail.kind))
    area.caption = 'B'
    await area.updateComplete
    area.captionPlacement = 'outside'
    await area.updateComplete
    area.label = 'Sector B'
    await area.updateComplete
    area.description = 'Searched'
    await area.updateComplete
    expect(said).toEqual(['layer', 'layer', 'layer', 'layer'])
    await settle(host)
    expect(listed(host)).toEqual(['Sector B, Searched'])
  })

  test('an attribute changed later is read, and a value a script sets writes no attribute', async () => {
    const host = await frame('<helix-headless-map-area></helix-headless-map-area>')
    const area = host.querySelector('helix-headless-map-area') as Area
    area.setAttribute('caption-placement', 'outside')
    area.setAttribute('points', '1,1 2,2 1,3')
    area.setAttribute('label', 'Zone')
    await area.updateComplete
    expect([area.captionPlacement, area.points?.length, area.label]).toEqual(['outside', 3, 'Zone'])

    const scripted = await frame('<helix-headless-map-area></helix-headless-map-area>')
    const other = scripted.querySelector('helix-headless-map-area') as Area
    other.caption = 'C'
    other.captionPlacement = 'outside'
    other.label = 'Zone'
    other.points = [
      { lat: 1, lng: 1 },
      { lat: 2, lng: 2 },
      { lat: 1, lng: 3 },
    ]
    await other.updateComplete
    expect(other.getAttributeNames()).toEqual([])
    await settle(scripted)
    expect(listed(scripted)).toEqual(['Zone'])
  })

  test('taken away, it leaves the list and the menu, and its changes no longer reach the frame', async () => {
    const host = await frame(
      `<helix-headless-map-route label="Depot to Mission" points="1,1 2,2"></helix-headless-map-route>
       <helix-headless-map-area label="Delivery zone" points="1,1 2,2 1,3"></helix-headless-map-area>`,
      'controls="layers"',
    )
    const area = host.querySelector('helix-headless-map-area') as Area
    expect(tiles(host)).toEqual(['Depot to Mission', 'Delivery zone'])
    area.remove()
    await settle(host)
    expect(listed(host)).toEqual(['Depot to Mission'])
    expect(tiles(host)).toEqual(['Depot to Mission'])

    const said: string[] = []
    host.addEventListener('helix-map-part-change', (event) => said.push(event.detail.kind))
    area.label = 'Gone'
    await area.updateComplete
    expect(said).toEqual([])

    host.querySelector('helix-headless-map-route')?.remove()
    await settle(host)
    expect([part(host, 'layers'), part(host, 'layers-toggle')]).toEqual([null, null])
  })

  test('on a page in another language, it is named by the word registered for it, and a label still wins', async () => {
    registerWords('de', { 'helix-map-area': { label: 'Gebiet' } })
    document.body.innerHTML = `<div lang="de"><helix-headless-map label="Lieferungen">
      <helix-headless-map-area points="1,1 2,2 1,3"></helix-headless-map-area>
      <helix-headless-map-area label="Zone A" points="1,1 2,2 1,3"></helix-headless-map-area>
    </helix-headless-map></div>`
    const host = document.querySelector('helix-headless-map') as Updatable
    await settle(host)
    expect(listed(host)).toEqual(['Gebiet', 'Zone A'])
  })
})

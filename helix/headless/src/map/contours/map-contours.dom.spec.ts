import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { clearWords, registerWords } from '@fusion.dev/helix-core'
import { target } from '@fusion.dev/helix-icons'
import { mount, part, registerDom, settle, type Updatable } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

afterEach(() => {
  clearWords()
})

type Contours = Updatable & {
  attribution?: string
  encoding: 'mapbox' | 'terrarium'
  isMapLayer: boolean
  label: string
  layerKind: string
  maxZoom?: number
  src?: string
  unit: 'feet' | 'meters'
}

const frame = async (inside: string, attributes = ''): Promise<Updatable> => {
  const host = (await mount(
    `<helix-headless-map label="Valley" ${attributes}>${inside}</helix-headless-map>`,
  )) as Updatable
  await settle(host)
  return host
}

/** What the frame's list says, one entry a line. */
const listed = (host: Updatable): string[] =>
  [...(host.shadowRoot?.querySelectorAll('[part="layer"]') ?? [])].map((one) =>
    (one.textContent ?? '').replace(/\s+/g, ' ').trim(),
  )

describe('map contours', () => {
  test('heights are terrarium tiles labeled in meters, until its attributes say otherwise', async () => {
    const host = await frame(
      `<helix-headless-map-contours src="dem/{z}/{x}/{y}.png"></helix-headless-map-contours>
       <helix-headless-map-contours encoding="mapbox" unit="feet" max-zoom="12" attribution="Elevation by Example"></helix-headless-map-contours>`,
    )
    const [plain, set] = [...host.querySelectorAll('helix-headless-map-contours')] as Contours[]
    expect([plain?.encoding, plain?.unit, plain?.maxZoom, plain?.src]).toEqual([
      'terrarium',
      'meters',
      undefined,
      'dem/{z}/{x}/{y}.png',
    ])
    expect([set?.encoding, set?.unit, set?.maxZoom, set?.attribution]).toEqual([
      'mapbox',
      'feet',
      12,
      'Elevation by Example',
    ])
  })

  test('it tells the frame it is a layer, which lists it as Contour lines and gives its tile the rings picture', async () => {
    const host = await frame(
      '<helix-headless-map-contours src="dem/{z}/{x}/{y}.png"></helix-headless-map-contours>',
      'controls="layers"',
    )
    const layer = host.querySelector('helix-headless-map-contours') as Contours
    expect([layer.isMapLayer, layer.layerKind]).toEqual([true, 'contours'])
    expect(listed(host)).toEqual(['Contour lines'])
    expect(part(host, 'layer-icon')?.innerHTML).toContain(target.content.slice(0, 40))
  })

  test('new tiles, a new unit, or a new name says so, which is how the connector redraws the lines', async () => {
    const host = await frame(
      '<helix-headless-map-contours src="dem/{z}/{x}/{y}.png"></helix-headless-map-contours>',
    )
    const layer = host.querySelector('helix-headless-map-contours') as Contours
    const said: string[] = []
    host.addEventListener('helix-map-part-change', (event) => said.push(event.detail.kind))
    layer.unit = 'feet'
    await layer.updateComplete
    layer.src = 'other/{z}/{x}/{y}.png'
    layer.encoding = 'mapbox'
    await layer.updateComplete
    layer.label = 'Contours, feet'
    await layer.updateComplete
    expect(said).toEqual(['layer', 'layer', 'layer'])
    await settle(host)
    expect(listed(host)).toEqual(['Contours, feet'])
  })

  test('an attribute changed later is read, and a value a script sets writes no attribute', async () => {
    const host = await frame('<helix-headless-map-contours></helix-headless-map-contours>')
    const layer = host.querySelector('helix-headless-map-contours') as Contours
    layer.setAttribute('unit', 'feet')
    layer.setAttribute('max-zoom', '14')
    await layer.updateComplete
    expect([layer.unit, layer.maxZoom]).toEqual(['feet', 14])

    const scripted = await frame('<helix-headless-map-contours></helix-headless-map-contours>')
    const other = scripted.querySelector('helix-headless-map-contours') as Contours
    other.encoding = 'mapbox'
    other.maxZoom = 14
    other.src = 'dem/{z}/{x}/{y}.png'
    other.unit = 'feet'
    await other.updateComplete
    expect(other.getAttributeNames()).toEqual([])
  })

  test('taken away, it leaves the list, and a frame with no layers has none', async () => {
    const host = await frame(
      '<helix-headless-map-contours src="dem/{z}/{x}/{y}.png"></helix-headless-map-contours>',
    )
    expect(listed(host)).toEqual(['Contour lines'])
    host.querySelector('helix-headless-map-contours')?.remove()
    await settle(host)
    expect(part(host, 'layers')).toBeNull()
  })

  test('on a page in another language, it is named by the word registered for it', async () => {
    registerWords('de', { 'helix-map-contours': { label: 'Höhenlinien' } })
    document.body.innerHTML = `<div lang="de"><helix-headless-map label="Tal">
      <helix-headless-map-contours></helix-headless-map-contours>
    </helix-headless-map></div>`
    const host = document.querySelector('helix-headless-map') as Updatable
    await settle(host)
    expect(listed(host)).toEqual(['Höhenlinien'])
  })
})

import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { clearWords, registerWords } from '@fusion.dev/helix-core'
import { buildings as picture } from '@fusion.dev/helix-icons'
import { mount, part, registerDom, settle, type Updatable } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

afterEach(() => {
  clearWords()
})

type Buildings = Updatable & {
  description?: string
  group?: string
  isMapLayer: boolean
  label: string
  layerKind: string
}

const frame = async (inside: string, attributes = ''): Promise<Updatable> => {
  const host = (await mount(
    `<helix-headless-map label="Downtown" ${attributes}>${inside}</helix-headless-map>`,
  )) as Updatable
  await settle(host)
  return host
}

/** What the frame's list says, one entry a line. */
const listed = (host: Updatable): string[] =>
  [...(host.shadowRoot?.querySelectorAll('[part="layer"]') ?? [])].map((one) =>
    (one.textContent ?? '').replace(/\s+/g, ' ').trim(),
  )

/** Each tile in the layers menu, by its name and whether it is pressed. */
const tiles = (host: Updatable): string[][] =>
  [...(part(host, 'layers-menu')?.querySelectorAll('[part="layer-choice"]') ?? [])].map((one) => [
    (one.textContent ?? '').trim(),
    one.getAttribute('aria-pressed') ?? '',
  ])

describe('map buildings', () => {
  test('it tells the frame it is a layer, which lists it as 3D buildings and gives its tile the buildings picture', async () => {
    const host = await frame(
      '<helix-headless-map-buildings group="city"></helix-headless-map-buildings>',
      'controls="layers"',
    )
    const layer = host.querySelector('helix-headless-map-buildings') as Buildings
    expect([layer.isMapLayer, layer.layerKind, layer.group]).toEqual([true, 'buildings', 'city'])
    expect(listed(host)).toEqual(['3D buildings'])
    expect(tiles(host)).toEqual([['3D buildings', 'true']])
    expect(part(host, 'layer-icon')?.innerHTML).toContain(picture.content.slice(0, 40))
  })

  test('a name or a description changed says so, and the frame lists the new words', async () => {
    const host = await frame('<helix-headless-map-buildings></helix-headless-map-buildings>')
    const layer = host.querySelector('helix-headless-map-buildings') as Buildings
    const said: string[] = []
    host.addEventListener('helix-map-part-change', (event) => said.push(event.detail.kind))
    layer.label = 'Buildings'
    await layer.updateComplete
    layer.description = 'From zoom 13'
    await layer.updateComplete
    expect(said).toEqual(['layer', 'layer'])
    await settle(host)
    expect(listed(host)).toEqual(['Buildings, From zoom 13'])
  })

  test('an attribute changed later is read, and a value a script sets writes no attribute', async () => {
    const host = await frame('<helix-headless-map-buildings></helix-headless-map-buildings>')
    const layer = host.querySelector('helix-headless-map-buildings') as Buildings
    layer.setAttribute('label', 'Towers')
    layer.setAttribute('description', 'Raised')
    await settle(host)
    expect([layer.label, layer.description]).toEqual(['Towers', 'Raised'])
    expect(listed(host)).toEqual(['Towers, Raised'])

    const scripted = await frame('<helix-headless-map-buildings></helix-headless-map-buildings>')
    const other = scripted.querySelector('helix-headless-map-buildings') as Buildings
    other.label = 'Towers'
    other.group = 'city'
    await other.updateComplete
    expect(other.getAttributeNames()).toEqual([])
  })

  test('hidden by the page, it leaves the list and its tile is not pressed, and shown again it returns', async () => {
    const host = await frame(
      '<helix-headless-map-buildings></helix-headless-map-buildings>',
      'controls="layers"',
    )
    const layer = host.querySelector('helix-headless-map-buildings') as Buildings
    layer.hidden = true
    await settle(host)
    expect([listed(host), tiles(host)]).toEqual([[], [['3D buildings', 'false']]])
    layer.hidden = false
    await settle(host)
    expect([listed(host), tiles(host)]).toEqual([['3D buildings'], [['3D buildings', 'true']]])
  })

  test('taken away, it leaves the list and the menu with it', async () => {
    const host = await frame(
      '<helix-headless-map-buildings></helix-headless-map-buildings>',
      'controls="layers"',
    )
    host.querySelector('helix-headless-map-buildings')?.remove()
    await settle(host)
    expect([part(host, 'layers'), part(host, 'layers-toggle')]).toEqual([null, null])
  })

  test('on a page in another language, it is named by the word registered for it', async () => {
    registerWords('de', { 'helix-map-buildings': { label: '3D-Gebäude' } })
    document.body.innerHTML = `<div lang="de"><helix-headless-map label="Innenstadt">
      <helix-headless-map-buildings></helix-headless-map-buildings>
    </helix-headless-map></div>`
    const host = document.querySelector('helix-headless-map') as Updatable
    await settle(host)
    expect(listed(host)).toEqual(['3D-Gebäude'])
  })
})

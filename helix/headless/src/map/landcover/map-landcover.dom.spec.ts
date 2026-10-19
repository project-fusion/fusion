import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import type {
  clearWords as ClearWords,
  registerWords as RegisterWords,
} from '@fusion.dev/helix-core'
import { leaf } from '@fusion.dev/helix-icons'
import { mount, part, registerDom, settle, type Updatable } from '@fusion.dev/helix-testing/dom'

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

type Landcover = Updatable & {
  description?: string
  group?: string
  isMapLayer: boolean
  label: string
  layerKind: string
}

const frame = async (inside: string, attributes = ''): Promise<Updatable> => {
  const host = (await mount(
    `<helix-headless-map label="Hill Country" ${attributes}>${inside}</helix-headless-map>`,
  )) as Updatable
  await settle(host)
  return host
}

/** What the frame's list says, one entry a line. */
const listed = (host: Updatable): string[] =>
  [...(host.shadowRoot?.querySelectorAll('[part="layer"]') ?? [])].map((one) =>
    (one.textContent ?? '').replace(/\s+/g, ' ').trim(),
  )

describe('map landcover', () => {
  test('it tells the frame it is a layer, which lists it as Land cover and gives its tile the leaf picture', async () => {
    const host = await frame(
      '<helix-headless-map-landcover></helix-headless-map-landcover>',
      'controls="layers"',
    )
    const layer = host.querySelector('helix-headless-map-landcover') as Landcover
    expect([layer.isMapLayer, layer.layerKind]).toEqual([true, 'landcover'])
    expect(listed(host)).toEqual(['Land cover'])
    expect(part(host, 'layer-icon')?.innerHTML).toContain(leaf.content.slice(0, 40))
  })

  test('a name or a description changed says so, and the frame lists the new words', async () => {
    const host = await frame('<helix-headless-map-landcover></helix-headless-map-landcover>')
    const layer = host.querySelector('helix-headless-map-landcover') as Landcover
    const said: string[] = []
    host.addEventListener('helix-map-part-change', (event) => said.push(event.detail.kind))
    layer.label = 'Ground cover'
    await layer.updateComplete
    layer.description = 'Forest, grass, and farmland'
    await layer.updateComplete
    expect(said).toEqual(['layer', 'layer'])
    await settle(host)
    expect(listed(host)).toEqual(['Ground cover, Forest, grass, and farmland'])
  })

  test('an attribute changed later is read, and a value a script sets writes no attribute', async () => {
    const host = await frame('<helix-headless-map-landcover></helix-headless-map-landcover>')
    const layer = host.querySelector('helix-headless-map-landcover') as Landcover
    layer.setAttribute('label', 'Vegetation')
    layer.setAttribute('group', 'ground')
    await settle(host)
    expect([layer.label, layer.group]).toEqual(['Vegetation', 'ground'])
    expect(listed(host)).toEqual(['Vegetation'])
    layer.removeAttribute('label')
    await settle(host)
    expect(layer.label).toBe('Land cover')

    const scripted = await frame('<helix-headless-map-landcover></helix-headless-map-landcover>')
    const other = scripted.querySelector('helix-headless-map-landcover') as Landcover
    other.description = 'Forest'
    other.label = 'Vegetation'
    await other.updateComplete
    expect(other.getAttributeNames()).toEqual([])
  })

  test('taken away, it leaves the list, and the layers it shared the list with stay', async () => {
    const host = await frame(
      `<helix-headless-map-landcover></helix-headless-map-landcover>
       <helix-headless-map-buildings></helix-headless-map-buildings>`,
    )
    expect(listed(host)).toEqual(['Land cover', '3D buildings'])
    host.querySelector('helix-headless-map-landcover')?.remove()
    await settle(host)
    expect(listed(host)).toEqual(['3D buildings'])
  })

  test('on a page in another language, it is named by the word registered for it', async () => {
    registerWords('de', { 'helix-map-landcover': { label: 'Bodenbedeckung' } })
    document.body.innerHTML = `<div lang="de"><helix-headless-map label="Hügelland">
      <helix-headless-map-landcover></helix-headless-map-landcover>
    </helix-headless-map></div>`
    const host = document.querySelector('helix-headless-map') as Updatable
    await settle(host)
    expect(listed(host)).toEqual(['Bodenbedeckung'])
  })
})

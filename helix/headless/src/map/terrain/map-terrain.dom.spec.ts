import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Terrain = HTMLElement & {
  encoding: string
  exaggeration: number
  label: string
  maxZoom?: number
  raised: boolean
  updateComplete: Promise<boolean>
}

type Frame = HTMLElement & { updateComplete: Promise<boolean> }

const frame = async (inside: string): Promise<Frame> => {
  const host = (await mount(
    `<helix-headless-map label="Valley">${inside}</helix-headless-map>`,
  )) as Frame
  await new Promise((done) => setTimeout(done, 0))
  await host.updateComplete
  return host
}

describe('map terrain', () => {
  test('it reads its attributes, is named Terrain in the list, and says when it changes', async () => {
    const host = (await mount(
      `<helix-headless-map label="Valley">
        <helix-headless-map-terrain src="dem/{z}/{x}/{y}.png"></helix-headless-map-terrain>
      </helix-headless-map>`,
    )) as HTMLElement & { updateComplete: Promise<boolean> }
    await new Promise((done) => setTimeout(done, 0))
    await host.updateComplete
    const terrain = host.querySelector('helix-headless-map-terrain') as Terrain
    expect([terrain.encoding, terrain.exaggeration, terrain.raised]).toEqual([
      'terrarium',
      1,
      false,
    ])
    expect((part(host, 'layer')?.textContent ?? '').trim()).toBe('Terrain')

    const said: string[] = []
    host.addEventListener('helix-map-part-change', (event) => said.push(event.detail.kind))
    terrain.raised = true
    await terrain.updateComplete
    expect(said).toEqual(['layer'])
  })

  test('an attribute changed later is read, and a value a script sets writes no attribute', async () => {
    const host = await frame('<helix-headless-map-terrain></helix-headless-map-terrain>')
    const terrain = host.querySelector('helix-headless-map-terrain') as Terrain
    terrain.setAttribute('encoding', 'mapbox')
    terrain.setAttribute('exaggeration', '1.5')
    terrain.setAttribute('max-zoom', '12')
    terrain.setAttribute('raised', '')
    await terrain.updateComplete
    expect([terrain.encoding, terrain.exaggeration, terrain.maxZoom, terrain.raised]).toEqual([
      'mapbox',
      1.5,
      12,
      true,
    ])

    const scripted = await frame('<helix-headless-map-terrain></helix-headless-map-terrain>')
    const other = scripted.querySelector('helix-headless-map-terrain') as Terrain
    other.encoding = 'mapbox'
    other.exaggeration = 2
    other.raised = true
    await other.updateComplete
    expect(other.getAttributeNames()).toEqual([])
  })

  test('taken away, it leaves the list', async () => {
    const host = await frame(
      `<helix-headless-map-terrain src="dem/{z}/{x}/{y}.png"></helix-headless-map-terrain>
       <helix-headless-map-buildings></helix-headless-map-buildings>`,
    )
    host.querySelector('helix-headless-map-terrain')?.remove()
    await new Promise((done) => setTimeout(done, 0))
    await host.updateComplete
    expect(
      [...(host.shadowRoot?.querySelectorAll('[part="layer"]') ?? [])].map((one) =>
        one.textContent?.trim(),
      ),
    ).toEqual(['3D buildings'])
  })
})

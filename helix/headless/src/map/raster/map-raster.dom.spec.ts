import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Raster = HTMLElement & {
  frame?: number
  frames?: string[]
  playing: boolean
  updateComplete: Promise<boolean>
}
type Frame = HTMLElement & { updateComplete: Promise<boolean> }

const original = globalThis.matchMedia

afterEach(() => {
  globalThis.matchMedia = original
})

const frame = async (inside: string): Promise<Frame> => {
  const host = (await mount(
    `<helix-headless-map label="Weather">${inside}</helix-headless-map>`,
  )) as Frame
  await host.updateComplete
  return host
}

const wait = (ms: number): Promise<void> => new Promise((done) => setTimeout(done, ms))

describe('map raster', () => {
  test('frames are tile URLs separated by spaces', async () => {
    const host = await frame(
      '<helix-headless-map-raster label="Radar" frames="a/{z}/{x}/{y}.png  b/{z}/{x}/{y}.png"></helix-headless-map-raster>',
    )
    const raster = host.querySelector('helix-headless-map-raster') as Raster
    expect(raster.frames).toEqual(['a/{z}/{x}/{y}.png', 'b/{z}/{x}/{y}.png'])
  })

  test('playing moves through the frames in order and starts again from the first', async () => {
    const host = await frame(
      '<helix-headless-map-raster label="Radar" frames="a b c" interval="100"></helix-headless-map-raster>',
    )
    const raster = host.querySelector('helix-headless-map-raster') as Raster
    raster.playing = true
    await raster.updateComplete
    await wait(130)
    expect(raster.frame).toBe(0)
    await wait(100)
    expect(raster.frame).toBe(1)
    raster.playing = false
    await raster.updateComplete
    await wait(150)
    expect(raster.frame).toBe(1)
  })

  test('under reduced motion it does not play, and shows its last frame', async () => {
    globalThis.matchMedia = ((query: string) => ({
      matches: query.includes('reduce'),
    })) as unknown as typeof globalThis.matchMedia
    const host = await frame(
      '<helix-headless-map-raster label="Radar" frames="a b c" interval="100" playing></helix-headless-map-raster>',
    )
    const raster = host.querySelector('helix-headless-map-raster') as Raster
    await wait(250)
    expect(raster.frame).toBeUndefined()
  })

  test('the frame lists it with the buildings, the buildings by their default name', async () => {
    const host = await frame(
      `<helix-headless-map-buildings></helix-headless-map-buildings>
       <helix-headless-map-raster label="Weather radar" description="Last 50 minutes" src="a"></helix-headless-map-raster>`,
    )
    const names = [...(part(host, 'layers')?.querySelectorAll('[part="layer"]') ?? [])].map((one) =>
      (one.textContent ?? '').replace(/\s+/g, ' ').trim(),
    )
    expect(names).toEqual(['3D buildings', 'Weather radar, Last 50 minutes'])
  })
})

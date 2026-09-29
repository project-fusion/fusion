import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom, settle } from '@fusion.dev/helix-testing/dom'

/**
 * A map says what a reader's key or button did, once the map has done it.
 *
 * **Only once told the view moved.** The frame's keys and buttons ask and
 * `connectMap` answers, calling `moved()`; a page that never answers hears
 * nothing, since a sentence about a move that never happened is worse than
 * none.
 */
beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Frame = HTMLElement & {
  bearing: number
  faceNorth: () => void
  moved: () => void
  pan: (to: 'up' | 'down' | 'start' | 'end') => void
  pitch: number
  rotate: (by: number) => void
  tilt: (by: number) => void
  updateComplete: Promise<unknown>
  zoom: (by: number) => void
  zoomLevel?: number
}

const frame = async (): Promise<Frame> =>
  (await mount('<helix-headless-map label="City map"></helix-headless-map>')) as Frame

const said = (host: Frame): string =>
  host.shadowRoot?.querySelector('[part="live"]')?.textContent?.trim() ?? ''

/** Longer than the frame waits for the view to settle. */
const settled = async (host: Frame): Promise<void> => {
  await new Promise((done) => setTimeout(done, 500))
  await settle(host)
}

describe('a map saying what moved it', () => {
  test('says nothing for a request nobody answered', async () => {
    const host = await frame()
    host.zoom(1)
    await settled(host)
    expect(said(host)).toBe('')
  })

  test('says the zoom level once the map has zoomed', async () => {
    const host = await frame()
    host.zoom(1)
    host.zoomLevel = 13
    host.moved()
    await settled(host)
    expect(said(host)).toBe('Zoom level 13')
  })

  test('says which way the map faces, and north by name', async () => {
    const host = await frame()
    host.rotate(15)
    host.bearing = 15
    host.moved()
    await settled(host)
    expect(said(host)).toBe('Facing 15 degrees')
    host.faceNorth()
    host.bearing = 0
    host.moved()
    await settled(host)
    expect(said(host)).toBe('Facing north')
  })

  test('says the tilt, and flat by name', async () => {
    const host = await frame()
    host.tilt(10)
    host.pitch = 10
    host.moved()
    await settled(host)
    expect(said(host)).toBe('Tilted 10 degrees')
    host.tilt(-10)
    host.pitch = 0
    host.moved()
    await settled(host)
    expect(said(host)).toBe('Looking straight down')
  })

  test('says which way a pan moved it, and says it again for a second pan', async () => {
    const host = await frame()
    host.pan('start')
    host.moved()
    await settled(host)
    expect(said(host)).toBe('Moved left')
    host.pan('start')
    host.moved()
    await settled(host)
    expect(said(host)).toBe('Moved left')
    const region = host.shadowRoot?.querySelector('[part="live"]')?.textContent ?? ''
    expect(region).not.toBe('Moved left')
  })
})

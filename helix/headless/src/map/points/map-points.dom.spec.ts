import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Frame = HTMLElement & { updateComplete: Promise<boolean> }
type Points = HTMLElement & { data?: unknown; updateComplete: Promise<boolean> }

describe('map points', () => {
  test('points set as data say so, and are named in the frame’s list as a route is', async () => {
    const host = (await mount(
      `<helix-headless-map label="Austin">
        <helix-headless-map-points label="Food and drink" description="3,252 places"></helix-headless-map-points>
      </helix-headless-map>`,
    )) as Frame
    await host.updateComplete
    const points = host.querySelector('helix-headless-map-points') as Points
    const said: string[] = []
    host.addEventListener('helix-map-part-change', (event) => said.push(event.detail.kind))
    points.data = [{ label: 'Cafe', lat: 1, lng: 2 }]
    await points.updateComplete
    expect(said).toEqual(['layer'])
    expect(part(host, 'layer')?.textContent).toBe('Food and drink, 3,252 places')
  })
})

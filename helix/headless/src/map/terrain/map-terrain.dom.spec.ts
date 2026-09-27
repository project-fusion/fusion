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
  raised: boolean
  updateComplete: Promise<boolean>
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
})

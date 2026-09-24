import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Edge = HTMLElement & { from: string; to: string; updateComplete: Promise<boolean> }

const edge = async (extra = ''): Promise<Edge> =>
  (await mount(
    `<helix-headless-canvas-edge id="e1" from="a" to="b" ${extra}></helix-headless-canvas-edge>`,
  )) as Edge

describe('canvas edge', () => {
  test('it draws nothing, the line between two cards being the board’s to draw', async () => {
    const host = await edge()
    expect(host.shadowRoot?.children).toHaveLength(0)
  })

  test('it carries which cards it joins, which is what it exists to say', async () => {
    const host = await edge()
    expect(host.from).toBe('a')
    expect(host.to).toBe('b')
  })

  test('the sides and the ends are read from the attributes the format names', async () => {
    const host = (await edge(
      'from-side="right" to-side="left" from-end="arrow" to-end="none"',
    )) as Edge & {
      fromSide?: string
      toSide?: string
      fromEnd?: string
      toEnd?: string
    }
    expect(host.fromSide).toBe('right')
    expect(host.toSide).toBe('left')
    expect(host.fromEnd).toBe('arrow')
    expect(host.toEnd).toBe('none')
  })

  test('nothing is written onto the host that the consumer did not write', async () => {
    const host = await edge()
    expect([...host.attributes].map((one) => one.name).sort()).toEqual(['from', 'id', 'to'])
  })
})

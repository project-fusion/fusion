import { beforeAll, describe, expect, test } from 'bun:test'
import { hasState, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Node = HTMLElement & { current: boolean; updateComplete: Promise<boolean> }

const node = async (extra = '', inner = 'A card'): Promise<Node> =>
  (await mount(
    `<helix-headless-canvas-node name="one" x="10" y="20" width="150" height="90" ${extra}>${inner}</helix-headless-canvas-node>`,
  )) as Node

describe('canvas node', () => {
  test('it holds what the consumer put in it rather than a string it parsed', async () => {
    /* The reason this is an element and not an entry in an array: a card can be
       a picture, a chart, anything with a tag. */
    const host = await node('', '<img alt="A plan" src="plan.png">')
    expect(host.querySelector('img')).not.toBeNull()
  })

  test('a card is an article and a group is a group', async () => {
    expect((part(await node(), 'node') as HTMLElement).getAttribute('role')).toBe('article')
    const group = await node('group label="A group"')
    expect((part(group, 'node') as HTMLElement).getAttribute('role')).toBe('group')
    expect((part(group, 'node') as HTMLElement).getAttribute('aria-label')).toBe('A group')
  })

  test('nothing is written onto the host that the consumer did not write', async () => {
    /* A card with no type is a card of text, and a default that reflected would
       put `type="text"` onto markup a server never sent. */
    const host = await node()
    expect(host.hasAttribute('type')).toBe(false)
  })

  test('being the current card is a state rather than an attribute', async () => {
    // The board writes it, so it does not belong in a consumer's markup.
    const host = await node()
    host.current = true
    await host.updateComplete
    expect(hasState(host, 'current')).toBe(true)
    expect(host.hasAttribute('current')).toBe(false)
  })

  test('a link is the consumer\u2019s to put inside, and the card draws none of its own', async () => {
    /* The card types are gone: what a card holds is theirs. */
    const host = await node('', '<a href="https://fusion.dev">Fusion</a>')
    expect(host.shadowRoot?.querySelector('a')).toBeNull()
    expect(host.querySelector('a')?.getAttribute('href')).toBe('https://fusion.dev')
  })
})

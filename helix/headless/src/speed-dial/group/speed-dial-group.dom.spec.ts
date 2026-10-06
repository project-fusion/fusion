import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Group = HTMLElement & { label: string; updateComplete: Promise<boolean> }

const group = async (markup: string): Promise<Group> => {
  const host = (await mount(markup)) as Group
  await host.updateComplete
  return host
}

/**
 * One group, and the contract that is the group's rather than the dial's: the
 * dial proves the arrows walk through it.
 */
describe('a speed dial group', () => {
  test('is a group named by its label, drawn above its actions', async () => {
    const host = await group(
      '<helix-headless-speed-dial-group label="Share"><helix-headless-speed-dial-item>Mail</helix-headless-speed-dial-item></helix-headless-speed-dial-group>',
    )
    const inner = part(host, 'group') as HTMLElement
    expect(inner.getAttribute('role')).toBe('group')
    expect(host.shadowRoot?.getElementById(inner.getAttribute('aria-labelledby') ?? '')).toBe(
      part(host, 'label'),
    )
    expect((part(host, 'label') as HTMLElement).hidden).toBe(false)
  })

  test('without a name draws no label and names nothing', async () => {
    const host = await group('<helix-headless-speed-dial-group></helix-headless-speed-dial-group>')
    expect((part(host, 'label') as HTMLElement).hidden).toBe(true)
    expect(part(host, 'group')?.hasAttribute('aria-labelledby')).toBe(false)
  })

  test('takes a richer name from its label slot', async () => {
    const host = await group(
      '<helix-headless-speed-dial-group><b slot="label">Share</b></helix-headless-speed-dial-group>',
    )
    await new Promise((resolve) => setTimeout(resolve))
    await host.updateComplete
    expect((part(host, 'label') as HTMLElement).hidden).toBe(false)
    expect(part(host, 'group')?.getAttribute('aria-labelledby')).toBe('label')
  })
})

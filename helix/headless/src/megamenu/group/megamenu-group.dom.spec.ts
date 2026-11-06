import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

describe('a megamenu group', () => {
  test('is a group named by its heading, a heading of level 3', async () => {
    const group = await mount(
      '<helix-headless-megamenu-group label="Work"><helix-headless-megamenu-item href="#a">A</helix-headless-megamenu-item></helix-headless-megamenu-group>',
    )
    const box = part(group as HTMLElement, 'group') as HTMLElement
    const heading = part(group as HTMLElement, 'label') as HTMLElement
    expect(box.getAttribute('role')).toBe('group')
    const scope = box.getRootNode() as ShadowRoot
    expect(scope.getElementById(box.getAttribute('aria-labelledby') ?? '')).toBe(heading)
    expect(heading.getAttribute('role')).toBe('heading')
    expect(heading.getAttribute('aria-level')).toBe('3')
    expect(heading.hidden).toBe(false)
  })

  test('draws no heading and names nothing with no label', async () => {
    const group = await mount(
      '<helix-headless-megamenu-group><helix-headless-megamenu-item href="#a">A</helix-headless-megamenu-item></helix-headless-megamenu-group>',
    )
    const box = part(group as HTMLElement, 'group') as HTMLElement
    expect(box.hasAttribute('aria-labelledby')).toBe(false)
    expect((part(group as HTMLElement, 'label') as HTMLElement).hidden).toBe(true)
  })
})

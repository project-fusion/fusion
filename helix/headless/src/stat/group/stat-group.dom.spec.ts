import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom, role } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

describe('stat group', () => {
  test('is a group rather than a list, because the order carries nothing', async () => {
    // A list would announce "1 of 4" for a set where position is not
    // information.
    const group = await mount(
      '<helix-headless-stat-group label="Scale"><helix-headless-stat><span>1</span></helix-headless-stat></helix-headless-stat-group>',
    )
    expect(role(group)).toBe('group')
    expect(group.hasAttribute('role')).toBe(false)
  })

  /* A group with no name adds "group" to what a reader says and nothing else,
     so the role waits for a name, as an unnamed Card's does. */
  test('an unnamed group has no role, and takes one once it is named', async () => {
    const group = (await mount(
      '<helix-headless-stat-group><helix-headless-stat><span>1</span></helix-headless-stat></helix-headless-stat-group>',
    )) as HTMLElement & { updateComplete: Promise<boolean> }
    expect(role(group)).toBeNull()
    group.setAttribute('aria-label', 'Usage')
    await group.updateComplete
    expect(role(group)).toBe('group')
    group.removeAttribute('aria-label')
    await group.updateComplete
    expect(role(group)).toBeNull()
  })
})

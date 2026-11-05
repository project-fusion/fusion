import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { hasState, mount, registerDom, role } from '@fusion.dev/helix-testing/dom'

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

  /* Each stat stepped on its own width, so one row in 120 pixel columns read
     42, 32 and 24. In columns the group sets them all at the largest step. */
  test('in columns, every stat takes the largest step any of them needs', async () => {
    type Stepping = HTMLElement & { showStep(step: number): void; stepNeeded: number }
    type Sharing = HTMLElement & { stepFor(stat: Element): number }
    const group = (await mount(
      '<helix-headless-stat-group columns="3"><helix-headless-stat>1</helix-headless-stat><helix-headless-stat>2</helix-headless-stat><helix-headless-stat>3</helix-headless-stat></helix-headless-stat-group>',
    )) as Sharing
    const [first, second, third] = [...group.children] as [Stepping, Stepping, Stepping]
    second.stepNeeded = 2
    expect(group.stepFor(first)).toBe(2)
    expect(hasState(third, 'stepped-twice')).toBe(true)
    group.removeAttribute('columns')
    expect(group.stepFor(first)).toBe(0)
  })
})

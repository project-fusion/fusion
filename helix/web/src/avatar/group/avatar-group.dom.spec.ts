import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Group = HTMLElement & {
  avatars: HTMLElement[]
  internals?: ElementInternals
  max: number
  overflow: number
  updateComplete: Promise<boolean>
}

const names = ['Ada Lovelace', 'Grace Hopper', 'Alan Turing', 'Katherine Johnson', 'Barbara Liskov']

const group = async (max: number, count = names.length): Promise<Group> => {
  const inside = names
    .slice(0, count)
    .map((name) => `<helix-avatar name="${name}"></helix-avatar>`)
    .join('')
  const host = (await mount(
    `<helix-avatar-group label="Reviewers" max="${max}">${inside}</helix-avatar-group>`,
  )) as Group
  await host.updateComplete
  return host
}

describe('avatar group', () => {
  test('is a named group, said through internals rather than as an attribute', async () => {
    const host = await group(3)
    expect(host.hasAttribute('role')).toBe(false)
    expect(host.internals?.role).toBe('group')
    expect(host.internals?.ariaLabel).toBe('Reviewers')
  })

  test('counts what it is not showing', async () => {
    expect((await group(3)).overflow).toBe(2)
  })

  test('the ones past the limit are marked, not removed', async () => {
    /* Removing them would mean re-rendering the consumer's own children on
       every change of `max`, and would leave nothing to count. */
    const host = await group(3)
    expect(host.avatars).toHaveLength(5)
    expect(host.avatars.filter((a) => a.hasAttribute('data-overflow'))).toHaveLength(2)
  })

  test('no limit shows everyone and counts nothing', async () => {
    const host = await group(0)
    expect(host.overflow).toBe(0)
    expect(host.avatars.some((a) => a.hasAttribute('data-overflow'))).toBe(false)
  })

  test('a limit past the count is not a negative overflow', async () => {
    expect((await group(9)).overflow).toBe(0)
  })

  test('the count is hidden from assistive technology, which hears the group', async () => {
    /* "+2" read aloud says nothing useful: the number is a fact about how much
       room there was. The group's own name is what carries the meaning. */
    const host = await group(3)
    expect((part(host, 'overflow') as HTMLElement).getAttribute('aria-hidden')).toBe('true')
  })

  test('the limit follows a change to it', async () => {
    const host = await group(3)
    host.max = 4
    await host.updateComplete
    expect(host.overflow).toBe(1)
    expect(host.avatars.filter((a) => a.hasAttribute('data-overflow'))).toHaveLength(1)
  })
})

if (hasLayout()) {
  describe('avatar group geometry', () => {
    test('the avatars overlap, and the first is the one on top', async () => {
      const host = await group(0, 3)
      const [first, second] = host.avatars
      if (!first || !second) {
        throw new Error('the fixture no longer holds two avatars')
      }
      const a = first.getBoundingClientRect()
      const b = second.getBoundingClientRect()

      expect(a.width).toBeGreaterThan(0)
      // Reads from the start, and overlapping rather than merely adjacent.
      expect(b.left).toBeGreaterThan(a.left)
      expect(b.left).toBeLessThan(a.right)
    })
  })
}

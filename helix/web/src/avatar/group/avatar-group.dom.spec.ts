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

  test('the ones past the limit are kept, not removed', async () => {
    /* Removing them would mean re-rendering the consumer's own children on
       every change of `max`, and would leave nothing to count. Which of them
       are *shown* is the stylesheet's answer now, so it is asserted where there
       is layout to read rather than here. */
    const host = await group(3)
    expect(host.avatars).toHaveLength(5)
  })

  test('no limit shows everyone and counts nothing', async () => {
    expect((await group(0)).overflow).toBe(0)
  })

  test('a limit past what the fold is written for counts nothing', async () => {
    /* Twelve is where the stylesheet runs out of selectors. Counting past it
       would put a "+N" beside N avatars that are still on screen, so the count
       and the sheet agree by refusing together. */
    expect((await group(13, 5)).overflow).toBe(0)
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

    /* The fold, asserted as boxes rather than as an attribute.
     *
     * It used to be `data-overflow`, written from `updated`, and a spec reading
     * that attribute passed while the avatars were on screen for a frame: state
     * can be right and paint wrong, which is the whole reason to ask for a box.
     * `display` here rather than a rect, because `none` is the question. */
    const shown = (host: Group): string[] =>
      host.avatars.filter((a) => getComputedStyle(a).display !== 'none').map((a) => a.title || '')

    test('shows `max` of them and no more', async () => {
      const host = await group(3)
      expect(shown(host)).toHaveLength(3)
    })

    /* The one the JavaScript could not do. Lit updates on a microtask, so an
       avatar appended past the limit was laid out and painted before anything
       ran to hide it. Measured in Chrome before this changed: five `flex` read
       synchronously, folding to three only on the next update. */
    test('folds an avatar appended past the limit before it can be seen', async () => {
      const host = await group(3, 3)
      for (const name of ['Radia Perlman', 'Karen Sparck Jones']) {
        const avatar = document.createElement('helix-avatar')
        avatar.setAttribute('name', name)
        host.append(avatar)
      }
      // No `updateComplete`: the point is that none is needed.
      expect(shown(host)).toHaveLength(3)
    })

    test('a limit past what the fold is written for shows everyone', async () => {
      const host = await group(13, 5)
      expect(shown(host)).toHaveLength(5)
    })
  })
}

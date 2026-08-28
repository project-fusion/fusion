import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

/** Read inside `beforeAll`, so it is a `let` rather than an import. */
let FOLDS_UP_TO = 0

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  /* Imported here rather than at module scope, which is the same rule the
     element import follows and for a worse reason than registration: a static
     import of a library module runs before `registerDom`, and happy-dom then
     throws out of its own HTML parser on the first `innerHTML`,
     `undefined is not an object (evaluating 'attributes.getNamedItem')`, which
     names neither the import nor the spec. */
  ;({ FOLDS_UP_TO } = await import('@fusion.dev/helix-headless/avatar'))
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

/**
 * The one coupling in this family that no check holds and a reader cannot see.
 *
 * `An+B` takes a literal, so the fold is one selector per value of `max` and
 * the range stops at `FOLDS_UP_TO`. The component counts against that constant
 * and the stylesheet enumerates it, in two files, in two packages, with a
 * comment in each saying the two have to agree.
 *
 * **The failure is silent and a reader sees it.** A missing rule for one value
 * of `max` shows every avatar with a "+3" beside them: the count is right, the
 * fold is not, and the layout looks deliberate. Only a `max` past the range
 * warns, which is the case that already cannot go wrong.
 *
 * Asserted against the stylesheet's own text rather than against layout,
 * because happy-dom has none and the claim is that the rule exists rather than
 * that it applies.
 */
describe('the fold and the count agree about how far they go', () => {
  const sheet = (): string => {
    const held = (
      customElements.get('helix-avatar-group') as unknown as {
        styles: Array<{ cssText: string }> | { cssText: string }
      }
    ).styles
    return (Array.isArray(held) ? held : [held]).map((one) => one.cssText).join('\n')
  }

  test('there is a rule for every value the component will count against', () => {
    const text = sheet()
    const missing: number[] = []
    for (let max = 1; max <= FOLDS_UP_TO; max += 1) {
      if (!text.includes(`[max="${max}"]`) || !text.includes(`nth-child(n + ${max + 1})`)) {
        missing.push(max)
      }
    }
    expect(missing).toEqual([])
  })

  /**
   * And nothing past it, which is the other direction: a stylesheet that folds
   * at a value the component refuses to count is a fold with no "+N" beside it,
   * which reads as avatars that simply went missing.
   */
  test('and none past it', () => {
    expect(sheet()).not.toContain(`[max="${FOLDS_UP_TO + 1}"]`)
  })
})

/**
 * The fold is a stylesheet rule keyed on the attribute, so `max` has to reach it.
 *
 * **This is the shape of bug a spec suite cannot see by accident.** Every
 * example writes `max` in markup, where the author put the attribute there
 * themselves, so the fold worked everywhere anybody looked. Set as a property,
 * which is what a script does and what React does for a matching prop name,
 * `max` reached the element and never reached the host: no attribute, no rule,
 * no fold, and every avatar drawn beside a count claiming some were hidden.
 * Found by rendering the React twin of `avatar/group` beside the markup one.
 */
describe('max reaches the host, because the fold is a rule and not code', () => {
  test('a property write reflects, which is the only way the stylesheet hears it', async () => {
    const group = (await mount(
      `<helix-avatar-group label="Reviewers">
         <helix-avatar name="Ada Lovelace"></helix-avatar>
         <helix-avatar name="Grace Hopper"></helix-avatar>
         <helix-avatar name="Alan Turing"></helix-avatar>
       </helix-avatar-group>`,
    )) as Group
    group.max = 2
    await (group as unknown as { updateComplete: Promise<unknown> }).updateComplete

    expect(group.getAttribute('max')).toBe('2')
    expect(group.overflow).toBe(1)
    group.remove()
  })

  /* The other half of the rule this property answers to: a reflected property
     takes no default, or every group that never asked for a limit ships with
     `max="0"` on it, on the server as well as in the browser. */
  test('and an unset max writes nothing at all', async () => {
    const group = (await mount(
      `<helix-avatar-group label="Reviewers">
         <helix-avatar name="Ada Lovelace"></helix-avatar>
       </helix-avatar-group>`,
    )) as Group
    expect(group.hasAttribute('max')).toBe(false)
    expect(group.overflow).toBe(0)
    group.remove()
  })
})

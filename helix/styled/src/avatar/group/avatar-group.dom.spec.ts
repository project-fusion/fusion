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

  /* Twelve is where the stylesheet runs out of selectors, and the group
     stopped counting there. It hides with `hidden` at any `max` now, so past
     twelve it folds and counts as it does below. */
  test('a limit past what the stylesheet rules is folded by the group, and counted', async () => {
    const inside = Array.from(
      { length: 15 },
      (_, at) => `<helix-avatar name="Person ${at + 1}"></helix-avatar>`,
    ).join('')
    const host = (await mount(
      `<helix-avatar-group label="Reviewers" max="13">${inside}</helix-avatar-group>`,
    )) as Group
    await host.updateComplete
    expect(host.overflow).toBe(2)
    expect(host.avatars.filter((one) => one.hidden)).toHaveLength(2)
    expect(part(host, 'overflow')?.getAttribute('aria-label')).toBe('2 more: Person 14, Person 15')
  })

  test('a limit past the count is not a negative overflow', async () => {
    expect((await group(9)).overflow).toBe(0)
  })

  /* The count was hidden, and the people past `max` are out of the tree, so a
     screen reader heard the group and nothing said there were more people in
     it. "+2" read aloud says nothing useful, so the count has a name. */
  test('the count is read out by its label, so the people past the limit are heard of', async () => {
    const host = await group(3)
    const count = part(host, 'overflow') as HTMLElement
    expect(count.getAttribute('aria-hidden')).toBeNull()
    expect(count.getAttribute('role')).toBe('img')
    expect(count.getAttribute('aria-label')).toBe('2 more: Katherine Johnson, Barbara Liskov')
  })

  /* The fold was a styled rule alone, so on the headless tier every avatar was
     drawn beside the "+3". `hidden` is the platform's own, and both tiers have
     it. */
  test('hides the ones past the limit with the platform `hidden`, on either tier', async () => {
    const styled = await group(3)
    expect(styled.avatars.map((one) => one.hidden)).toEqual([false, false, false, true, true])
    const inside = names
      .map((name) => `<helix-headless-avatar name="${name}"></helix-headless-avatar>`)
      .join('')
    const headless = (await mount(
      `<helix-headless-avatar-group max="2">${inside}</helix-headless-avatar-group>`,
    )) as Group
    await headless.updateComplete
    expect(headless.avatars.map((one) => one.hidden)).toEqual([false, false, true, true, true])
    headless.max = 4
    await headless.updateComplete
    expect(headless.avatars.map((one) => one.hidden)).toEqual([false, false, false, false, true])
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
      // Reads from the start.
      expect(b.left).toBeGreaterThan(a.left)

      /* **Overlapping rather than merely adjacent, asked of the margin as well
         as of the boxes.** The overlap is the sheet's
         `calc(-1 * var(--avatar-group-overlap, var(--helix-space-sm)))`, and a
         token that does not resolve makes that calculation invalid, which
         leaves the margin at its initial `0`. The second avatar then starts
         exactly where the first ends, and `b.left < a.right` on its own fails
         as one number not being less than the same number, which names neither
         the token nor the stylesheet. Measured 14 Sep 2026 in a clone whose
         frame went into the page without the token layer: three runs of three,
         and nothing about the component.

         **Zero is refused, deliberately.** Two avatars that touch are a row and
         this component is a stack, so no overlap is a failure rather than a
         subpixel: equal edges are what none looks like, not what rounding does
         to a small one. A consumer who wants them adjacent sets
         `--avatar-group-overlap: 0`, and is not this fixture. So the margin is
         read, held to negative, and the boxes are held to it: 12 against a
         32-pixel avatar in this checkout, and whatever the tokens say
         elsewhere. */
      const overlap = Number.parseFloat(getComputedStyle(second).marginInlineStart)
      expect(overlap).toBeLessThan(0)
      expect(a.right - b.left).toBeCloseTo(-overlap, 1)
    })

    /* The fold, asserted as boxes rather than as an attribute: state can be
     * right and paint wrong, so a spec reading a mirrored attribute passes
     * while the avatars are on screen. `display` rather than a rect, because
     * `none` is the question. */
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
 * themselves, so the fold works everywhere anybody looks. Set as a property,
 * which is what a script does and what React does for a matching prop name, an
 * unreflected `max` reaches the element and never the host: no attribute, no
 * rule, no fold, and every avatar drawn beside a count claiming some were
 * hidden.
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

/* Every visual decision is a hook named after the family, defaulting to what
   was drawn before the hook existed. */
describe("the count past `max`'s hooks", () => {
  test('are read by the sheet, each with the old value as its fallback', () => {
    const declared = (customElements.get('helix-avatar-group') as unknown as { styles: unknown })
      .styles
    const text = (Array.isArray(declared) ? declared : [declared])
      .flat(Number.POSITIVE_INFINITY)
      .map((one) => {
        const sheet = one as { cssRules?: ArrayLike<{ cssText: string }>; cssText?: string }
        return sheet.cssText ?? Array.from(sheet.cssRules ?? [], (rule) => rule.cssText).join('\n')
      })
      .join('\n')
    for (const hook of [
      '--avatar-group-overflow-background-color',
      '--avatar-group-overflow-color',
      '--avatar-group-overflow-font-size',
    ]) {
      expect(text).toContain(`var(${hook},`)
    }
  })
})

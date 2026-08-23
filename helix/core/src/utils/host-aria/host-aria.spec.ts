import { describe, expect, test } from 'bun:test'
import { hostAria } from './host-aria.js'

/**
 * Semantics written through `ElementInternals` rather than onto the host.
 *
 * **An attribute would be a hydration mismatch.** Setting `role` on the host is
 * an attribute the element gives itself after it upgrades, which a React
 * consumer's server markup never had, and React reports it and does not patch it
 * up. Internals set the implicit role instead, which an author's own `role`
 * attribute still overrides, and write no attribute at all.
 *
 * A stub rather than a real element, because what is under test is which
 * properties get written and what an empty value means, and both are decided
 * here rather than by the platform.
 */
const internals = () =>
  ({
    ariaDescribedByElements: undefined,
    ariaLabel: undefined,
    ariaLabelledByElements: undefined,
    role: undefined,
  }) as unknown as ElementInternals

describe('what it writes', () => {
  test('sets the ones it is given', () => {
    const it = internals()
    hostAria(it, { label: 'Save', role: 'button' })
    expect([it.role, it.ariaLabel]).toEqual(['button', 'Save'])
  })

  /* Absent and empty are different answers. Undefined means the caller is not
     speaking about that property, so a component setting only a label does not
     silently clear a role something else established. */
  test('and leaves alone the ones it is not', () => {
    const it = internals()
    it.role = 'group'
    hostAria(it, { label: 'Save' })
    expect(it.role).toBe('group')
  })

  /* Empty is the caller saying there is nothing, and `null` is how internals
     spell that: the empty string would be an accessible name of "". */
  test('an empty string clears rather than naming something empty', () => {
    const it = internals()
    hostAria(it, { label: '', role: '' })
    expect([it.role, it.ariaLabel]).toEqual([null, null])
  })
})

describe('references to other elements', () => {
  const elements = [{ tagName: 'H2' }, { tagName: 'P' }] as unknown as Element[]

  /* Element references rather than IDREFs, which is the only form that works
     from a shadow root: an id inside one can never resolve to a light-DOM
     element, and `aria-labelledby` is computed from the flat tree. */
  test('are passed through as elements', () => {
    const it = internals()
    hostAria(it, { describedBy: elements, labelledBy: elements })
    expect(it.ariaLabelledByElements).toEqual(elements)
    expect(it.ariaDescribedByElements).toEqual(elements)
  })

  test('and an empty list clears them, rather than setting an empty list', () => {
    const it = internals()
    hostAria(it, { describedBy: [], labelledBy: [] })
    expect(it.ariaLabelledByElements).toBeNull()
    expect(it.ariaDescribedByElements).toBeNull()
  })

  /* Not every engine has them yet, so the write is guarded by presence. A
     browser without the property gets no semantics rather than a throw. */
  test('are skipped where the engine has no such property', () => {
    const bare = { ariaLabel: undefined, role: undefined } as unknown as ElementInternals
    expect(() => hostAria(bare, { describedBy: [], labelledBy: [] })).not.toThrow()
    expect('ariaLabelledByElements' in bare).toBe(false)
  })
})

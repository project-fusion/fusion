import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@helix-io/testing/dom'
import { customElement } from './custom-element.js'

/**
 * Registering the same tag twice, which is what Next.js does.
 *
 * A module imported by both a server component and a client component runs its
 * registration twice against one registry, and `customElements.define` throws
 * hard enough to take down the whole prerender. It appears only once an app
 * mixes the two, which is exactly what a real app does, so the failure is
 * invisible until it is expensive.
 */
beforeAll(() => {
  registerDom()
})

const element = (): CustomElementConstructor => class extends HTMLElement {}

describe('a tag nobody has registered', () => {
  test('is registered', () => {
    const made = element()
    customElement('probe-once')(made)
    expect(customElements.get('probe-once')).toBe(made)
  })
})

describe('a tag that is already registered', () => {
  test('does not throw, which is the whole reason this is not Lit’s decorator', () => {
    customElement('probe-twice')(element())
    expect(() => {
      customElement('probe-twice')(element())
    }).not.toThrow()
  })

  /* The first definition wins rather than the last, which is the safe half: the
     elements already upgraded against it keep working. A registry cannot
     replace a definition anyway, so declining is the only thing available, and
     what matters is that it declines silently rather than loudly. */
  test('and the definition already in the registry is the one that stays', () => {
    const first = element()
    customElement('probe-kept')(first)
    customElement('probe-kept')(element())
    expect(customElements.get('probe-kept')).toBe(first)
  })
})

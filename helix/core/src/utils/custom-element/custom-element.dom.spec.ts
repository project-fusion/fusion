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

/**
 * Runs `body` with `console.warn` captured, and puts it back.
 *
 * One process runs every DOM spec, so a shadowed global answers stale to every
 * file after this one. The `finally` is what the restore has to be inside.
 */
const warnings = (body: () => void): string[] => {
  const said: string[] = []
  const original = console.warn
  console.warn = (...args: unknown[]) => {
    said.push(args.join(' '))
  }
  try {
    body()
  } finally {
    console.warn = original
  }
  return said
}

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
     replace a definition anyway, so declining is the only thing available. */
  test('and the definition already in the registry is the one that stays', () => {
    const first = element()
    customElement('probe-kept')(first)
    customElement('probe-kept')(element())
    expect(customElements.get('probe-kept')).toBe(first)
  })
})

/**
 * Declining is right and declining in silence is not.
 *
 * The registry keeps the first constructor, so every element of that name is
 * built from it whatever the second copy exports: `instanceof` against the
 * second is false, and the version a consumer believes they are on is not the
 * one in the DOM. Nothing throws and nothing renders wrong, which is why this
 * needs a line to search for.
 */
describe('a second, different class asking for a taken tag', () => {
  test('says so, naming the tag and what it means', () => {
    customElement('probe-skew')(element())
    const said = warnings(() => {
      customElement('probe-skew')(element())
    })
    expect(said).toHaveLength(1)
    expect(said[0]).toContain('probe-skew')
    expect(said[0]).toContain('two copies')
  })

  /* Once per tag. A page holding duplicates holds them for every family at
     once, and a line per module that tried is a wall rather than a diagnostic. */
  test('and says it once, however many copies arrive', () => {
    customElement('probe-skew-repeat')(element())
    const said = warnings(() => {
      customElement('probe-skew-repeat')(element())
      customElement('probe-skew-repeat')(element())
      customElement('probe-skew-repeat')(element())
    })
    expect(said).toHaveLength(1)
  })

  /* The same class arriving through two import specifiers is not a duplicate
     and has nothing to report. This is the shape the guard was written for. */
  test('and the same class arriving twice says nothing at all', () => {
    const one = element()
    customElement('probe-same')(one)
    const said = warnings(() => {
      customElement('probe-same')(one)
    })
    expect(said).toHaveLength(0)
  })
})

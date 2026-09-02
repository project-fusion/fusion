import { describe, expect, test } from 'bun:test'
import { resolve } from './bump.mjs'

/* What releases is a policy nothing asserted, and it drifted: `docs` was absent
   from the level table while `@fusion.dev/helix-docs` published its `content`
   directory, so a corrected page reached the registry only when unrelated code
   changed. The table is small and the cost of it being wrong is a package that
   describes a version it is not. */

describe('which types release', () => {
  test('a consumer-felt change releases a patch', () => {
    for (const type of ['fix', 'perf', 'refactor', 'revert', 'docs', 'style', 'chore', 'build']) {
      expect(resolve([`${type}(helix): x`])).toEqual([{ domain: 'helix', level: 'patch' }])
    }
  })

  test('a feature releases a minor', () => {
    expect(resolve(['feat(helix): x'])).toEqual([{ domain: 'helix', level: 'minor' }])
  })

  /* The only two, and the reason is that nothing they touch is packed: specs
     are excluded from `dist` and workflows are not in `files`. */
  test('a change nothing packs releases nothing', () => {
    for (const type of ['test', 'ci']) {
      expect(resolve([`${type}(helix): x`])).toEqual([])
    }
  })
})

describe('which scopes release', () => {
  test('both domains, and the first segment names them', () => {
    expect(resolve(['fix(helix/cli): x'])).toEqual([{ domain: 'helix', level: 'patch' }])
    expect(resolve(['fix(cortex/docs): x'])).toEqual([{ domain: 'cortex', level: 'patch' }])
  })

  test('a scope outside them, or none at all, releases nothing', () => {
    expect(resolve(['feat(fusion/site): x'])).toEqual([])
    expect(resolve(['feat(turbo): x'])).toEqual([])
    expect(resolve(['feat: x'])).toEqual([])
  })
})

describe('breaking outranks the type', () => {
  /* The one route by which a non-releasing type reaches the registry, and it
     goes straight to major rather than to patch. */
  test('a bang on any type is a major', () => {
    expect(resolve(['docs(helix)!: x'])).toEqual([{ domain: 'helix', level: 'major' }])
    expect(resolve(['test(helix)!: x'])).toEqual([{ domain: 'helix', level: 'major' }])
  })

  test('a trailer in the body is read as well as the subject', () => {
    expect(resolve(['docs(helix): x\n\nBREAKING CHANGE: y'])).toEqual([
      { domain: 'helix', level: 'major' },
    ])
  })
})

describe('across a range', () => {
  test('the highest bump each domain asks for wins', () => {
    const found = resolve(['fix(helix): a', 'feat(helix): b', 'docs(cortex): c'])
    expect(found).toContainEqual({ domain: 'helix', level: 'minor' })
    expect(found).toContainEqual({ domain: 'cortex', level: 'patch' })
  })

  test('a subject that does not parse is skipped rather than failing', () => {
    expect(resolve(['not a conventional subject', 'fix(helix): a'])).toEqual([
      { domain: 'helix', level: 'patch' },
    ])
  })
})

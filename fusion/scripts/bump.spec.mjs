import { describe, expect, test } from 'bun:test'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolve } from './bump.mjs'

/* From this file rather than the working directory: `turbo run test` runs each
   package in its own, and the repository root is what this reads from. */
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

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
  test('every domain, and the first segment names them', () => {
    expect(resolve(['fix(helix/cli): x'])).toEqual([{ domain: 'helix', level: 'patch' }])
    expect(resolve(['fix(cortex/docs): x'])).toEqual([{ domain: 'cortex', level: 'patch' }])
    expect(resolve(['feat(helix/visual): x'])).toEqual([{ domain: 'helix', level: 'minor' }])
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

describe("the release's own commit", () => {
  /* `release.yml` writes a commit after publishing, and that commit lands
     inside the window the next run reads from the tag. Spelled `chore(helix)`
     it releases, so every release becomes the cause of the next one: release,
     stamp, release, forever, whatever the merge contained. It was spelled that
     way for one merge and both domains re-released on the following push.

     Read out of the workflow rather than copied here, so re-scoping the commit
     fails this rather than starting the loop again. */
  test('the stamp commit releases nothing', () => {
    /* The stamp moved out of `release.yml` into this script and the assertion
       stayed pointed at the workflow, where it matched nothing and read
       `undefined`. Nothing ran it either: this package had no `test` script, so
       `turbo run test` never reached the file. Both are fixed here. */
    const script = readFileSync(join(ROOT, '.github/scripts/stamp-manifests.sh'), 'utf8')
    const [, subject] = script.match(/git commit -q -m "([^"]+)"/) ?? []
    expect(subject).toBeDefined()
    const written = subject.replaceAll('$DOMAIN', 'helix').replaceAll('$VERSION', '1.2.3')
    expect(resolve([written])).toEqual([])
  })
})

describe('a domain in its 0 phase', () => {
  const breaking = 'feat(helix/button)!: a width floor is a hook, not an axis'

  test('raises the minor for a breaking change', () => {
    expect(resolve([breaking], new Set(['helix']))).toEqual([{ domain: 'helix', level: 'minor' }])
  })

  test('is named, and does not answer for another domain', () => {
    expect(resolve([breaking], new Set(['cortex']))).toEqual([{ domain: 'helix', level: 'major' }])
  })

  test('leaves the major alone once the domain has one', () => {
    expect(resolve([breaking])).toEqual([{ domain: 'helix', level: 'major' }])
  })

  test('does not lift anything that was below a major', () => {
    const patch = 'fix(helix/orb): read the color the engine gives'
    expect(resolve([patch], new Set(['helix']))).toEqual([{ domain: 'helix', level: 'patch' }])
  })
})

describe('a held domain', () => {
  /* `held` in `fusion.json` keeps a domain that is not on the registry out of
     the release: its subjects ask for a bump and the matrix gets no leg, so a
     merge publishes nothing of it and spends no number. */
  test('gets no release leg, whatever its subjects ask', () => {
    const messages = ['feat(cortex): x', 'fix(cortex/core)!: y', 'fix(helix): z']
    expect(resolve(messages, new Set(), new Set(['cortex']))).toEqual([
      { domain: 'helix', level: 'patch' },
    ])
  })

  test('and is held from the command line the scripts call', () => {
    const run = (...flags) =>
      JSON.parse(
        execFileSync(
          process.execPath,
          [join(ROOT, 'fusion/scripts/bump.mjs'), '--stdin', ...flags],
          {
            encoding: 'utf8',
            input: 'feat(helix): x\0fix(cortex): y\0',
          },
        ),
      )
    expect(run()).toEqual([
      { domain: 'helix', level: 'minor' },
      { domain: 'cortex', level: 'patch' },
    ])
    expect(run('--held', 'helix')).toEqual([{ domain: 'cortex', level: 'patch' }])
    expect(run('--held', 'helix', '--zero', 'cortex')).toEqual([
      { domain: 'cortex', level: 'patch' },
    ])
  })

  /* Read out of the scripts, so a caller that stops passing the switch fails
     here rather than publishing a domain the registry has never seen. */
  test('is read from `fusion.json` by every script that resolves a release', () => {
    for (const script of ['resolve-intent.sh', 'report-intent.sh', 'stamp-experimental.sh']) {
      const source = readFileSync(join(ROOT, '.github/scripts', script), 'utf8')
      expect(source).toContain('.held // {} | keys | join(",")')
      expect(source).toMatch(/bump\.mjs[^\n]*--held/)
    }
  })

  test('names domains that exist', () => {
    const settings = JSON.parse(readFileSync(join(ROOT, 'fusion.json'), 'utf8'))
    for (const domain of Object.keys(settings.held ?? {})) {
      expect(settings.domains).toContain(domain)
    }
  })
})

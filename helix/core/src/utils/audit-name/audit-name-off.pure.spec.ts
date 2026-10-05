import { describe, expect, test } from 'bun:test'
import { fileURLToPath } from 'node:url'
import pkg from '../../../package.json'
import { auditName } from './audit-name-off.js'

/**
 * Which module `#audit-name` is in each build.
 *
 * The repository's specs run with the audit: core's `test` script passes
 * `bun test --conditions helix-source --conditions helix-development`, and
 * `helix-development` takes the same module `development` does without also
 * switching Lit to its development build. These ask what each build gets.
 */
const core = fileURLToPath(new URL('../../..', import.meta.url))

/** The file `#audit-name` resolves to from core's source, under these conditions. */
const resolved = (...conditions: string[]): string => {
  const run = Bun.spawnSync(
    [
      process.execPath,
      ...conditions.flatMap((one) => ['--conditions', one]),
      '-e',
      'console.log(import.meta.resolve("#audit-name"))',
    ],
    { cwd: core },
  )
  return run.stdout.toString().trim().split('/helix/core/')[1] ?? run.stderr.toString()
}

describe('the missing-name audit by build', () => {
  test('a development build takes the audit, and any other build the module that does nothing', () => {
    expect(resolved('helix-source', 'development')).toBe('src/utils/audit-name/audit-name.ts')
    expect(resolved('helix-source', 'helix-development')).toBe('src/utils/audit-name/audit-name.ts')
    expect(resolved('helix-source')).toBe('src/utils/audit-name/audit-name-off.ts')
  })

  test('the published files mirror the source ones, so a build from dist chooses the same way', () => {
    const map = pkg.imports['#audit-name']
    const published = (path: string): string =>
      path.replace('./src/', './dist/').replace(/\.ts$/, '.js')
    expect(map.development).toBe(published(map['helix-source'].development))
    expect(map['helix-development']).toBe(map.development)
    expect(map['helix-source']['helix-development']).toBe(map['helix-source'].development)
    expect(map.default).toBe(published(map['helix-source'].default))
    expect(map.types).toBe(map.development.replace(/\.js$/, '.d.ts'))
    /* Order is how a resolver chooses: the source first, which only this
       repository asks for, and the published default last. */
    expect(Object.keys(map)).toEqual([
      'helix-source',
      'types',
      'development',
      'helix-development',
      'default',
    ])
  })

  test('the production audit does nothing', () => {
    const host = { isConnected: true, localName: 'helix-input' } as HTMLElement
    expect(auditName(host, () => null, 'Name it.')).toBeUndefined()
  })
})

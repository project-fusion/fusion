import { describe, expect, test } from 'bun:test'
import { fileURLToPath } from 'node:url'
import pkg from '../../../package.json'
import { auditSource } from './audit-source-off.js'

/**
 * Which module `#audit-source` is in each build.
 *
 * The same three ways as `#audit-name`, which `audit-name-off.pure.spec.ts`
 * describes. These ask what each build gets.
 */
const core = fileURLToPath(new URL('../../..', import.meta.url))

/** The file `#audit-source` resolves to from core's source, under these conditions. */
const resolved = (...conditions: string[]): string => {
  const run = Bun.spawnSync(
    [
      process.execPath,
      ...conditions.flatMap((one) => ['--conditions', one]),
      '-e',
      'console.log(import.meta.resolve("#audit-source"))',
    ],
    { cwd: core },
  )
  return run.stdout.toString().trim().split('/helix/core/')[1] ?? run.stderr.toString()
}

describe('the missing-table audit by build', () => {
  test('a development build takes the audit, and any other build the module that does nothing', () => {
    expect(resolved('helix-source', 'development')).toBe('src/utils/audit-source/audit-source.ts')
    expect(resolved('helix-source', 'helix-development')).toBe(
      'src/utils/audit-source/audit-source.ts',
    )
    expect(resolved('helix-source')).toBe('src/utils/audit-source/audit-source-off.ts')
  })

  test('the published files mirror the source ones, so a build from dist chooses the same way', () => {
    const map = pkg.imports['#audit-source']
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
    const host = { for: 'nowhere', isConnected: true, localName: 'helix-bar-chart' }
    expect(auditSource(host as HTMLElement & { for: string }, () => null)).toBeUndefined()
  })
})

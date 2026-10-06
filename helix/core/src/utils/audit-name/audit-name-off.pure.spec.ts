import { describe, expect, test } from 'bun:test'
import { fileURLToPath } from 'node:url'
import { auditName } from './audit-name-off.js'

/**
 * Which module `#audit-name` is in each build.
 *
 * The repository's specs run with the audit: core's `test` script passes
 * `bun test src --conditions helix-development`, and `helix-development` takes
 * the same module `development` does without also switching Lit to its
 * development build. These ask what each build gets.
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
    expect(resolved('development')).toBe('src/utils/audit-name/audit-name.ts')
    expect(resolved('helix-development')).toBe('src/utils/audit-name/audit-name.ts')
    expect(resolved()).toBe('src/utils/audit-name/audit-name-off.ts')
  })

  /* What the published files resolve is `development-imports.pure.spec.ts`'s:
     they import the audit by the package's own name, through `exports`. */

  test('the production audit does nothing', () => {
    const host = { isConnected: true, localName: 'helix-input' } as HTMLElement
    expect(auditName(host, () => null, 'Name it.')).toBeUndefined()
  })
})

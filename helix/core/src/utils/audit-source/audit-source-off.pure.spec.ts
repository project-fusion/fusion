import { describe, expect, test } from 'bun:test'
import { fileURLToPath } from 'node:url'
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
    expect(resolved('development')).toBe('src/utils/audit-source/audit-source.ts')
    expect(resolved('helix-development')).toBe('src/utils/audit-source/audit-source.ts')
    expect(resolved()).toBe('src/utils/audit-source/audit-source-off.ts')
  })

  /* What the published files resolve is `development-imports.pure.spec.ts`'s:
     they import the audit by the package's own name, through `exports`. */

  test('the production audit does nothing', () => {
    const host = { for: 'nowhere', isConnected: true, localName: 'helix-bar-chart' }
    expect(auditSource(host as HTMLElement & { for: string }, () => null)).toBeUndefined()
  })
})

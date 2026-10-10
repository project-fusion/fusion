import { describe, expect, test } from 'bun:test'
import { fileURLToPath } from 'node:url'
import { auditNumber, auditTime } from './audit-number-off.js'

/**
 * Which module `#audit-number` is in each build.
 *
 * The same three ways as `#audit-name`, which `audit-name-off.pure.spec.ts`
 * describes. These ask what each build gets.
 */
const core = fileURLToPath(new URL('../../..', import.meta.url))

/** The file `#audit-number` resolves to from core's source, under these conditions. */
const resolved = (...conditions: string[]): string => {
  const run = Bun.spawnSync(
    [
      process.execPath,
      ...conditions.flatMap((one) => ['--conditions', one]),
      '-e',
      'console.log(import.meta.resolve("#audit-number"))',
    ],
    { cwd: core },
  )
  return run.stdout.toString().trim().split('/helix/core/')[1] ?? run.stderr.toString()
}

describe('the not-a-number audit by build', () => {
  test('a development build takes the audit, and any other build the module that does nothing', () => {
    expect(resolved('development')).toBe('src/utils/audit-number/audit-number.ts')
    expect(resolved('helix-development')).toBe('src/utils/audit-number/audit-number.ts')
    expect(resolved()).toBe('src/utils/audit-number/audit-number-off.ts')
  })

  /* What the published files resolve is `development-imports.pure.spec.ts`'s:
     they import the audit by the package's own name, through `exports`. */

  test('the production audit does nothing', () => {
    expect(auditNumber('page-size', '1O', 10)).toBeUndefined()
    expect(auditTime('delay', 'soon', 400)).toBeUndefined()
  })
})

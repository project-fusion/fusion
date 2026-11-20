import { describe, expect, test } from 'bun:test'
import { fileURLToPath } from 'node:url'
import { auditDescription } from './audit-description-off.js'

/**
 * Which module `#audit-description` is in each build.
 *
 * The same three ways as `#audit-name`, which `audit-name-off.pure.spec.ts`
 * describes. These ask what each build gets.
 */
const core = fileURLToPath(new URL('../../..', import.meta.url))

/** The file `#audit-description` resolves to from core's source, under these conditions. */
const resolved = (...conditions: string[]): string => {
  const run = Bun.spawnSync(
    [
      process.execPath,
      ...conditions.flatMap((one) => ['--conditions', one]),
      '-e',
      'console.log(import.meta.resolve("#audit-description"))',
    ],
    { cwd: core },
  )
  return run.stdout.toString().trim().split('/helix/core/')[1] ?? run.stderr.toString()
}

describe('the static-description audit by build', () => {
  test('a development build takes the audit, and any other build the module that does nothing', () => {
    expect(resolved('development')).toBe('src/utils/audit-description/audit-description.ts')
    expect(resolved('helix-development')).toBe('src/utils/audit-description/audit-description.ts')
    expect(resolved()).toBe('src/utils/audit-description/audit-description-off.ts')
  })

  test('the production audit does nothing', () => {
    const host = { localName: 'helix-list' }
    expect(auditDescription(host as unknown as HTMLElement, false)).toBeUndefined()
  })
})

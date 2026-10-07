import { describe, expect, test } from 'bun:test'
import { fileURLToPath } from 'node:url'
import { auditServed } from './audit-served-off.js'

/**
 * Which module `#audit-served` is in each build.
 *
 * The same three ways as `#audit-name`, which `audit-name-off.pure.spec.ts`
 * describes. These ask what each build gets.
 */
const core = fileURLToPath(new URL('../../..', import.meta.url))

/** The file `#audit-served` resolves to from core's source, under these conditions. */
const resolved = (...conditions: string[]): string => {
  const run = Bun.spawnSync(
    [
      process.execPath,
      ...conditions.flatMap((one) => ['--conditions', one]),
      '-e',
      'console.log(import.meta.resolve("#audit-served"))',
    ],
    { cwd: core },
  )
  return run.stdout.toString().trim().split('/helix/core/')[1] ?? run.stderr.toString()
}

describe('the served-rows check by build', () => {
  test('a development build takes the check, and any other build the module that does nothing', () => {
    expect(resolved('development')).toBe('src/utils/audit-served/audit-served.ts')
    expect(resolved('helix-development')).toBe('src/utils/audit-served/audit-served.ts')
    expect(resolved()).toBe('src/utils/audit-served/audit-served-off.ts')
  })

  test('the production check does nothing', () => {
    const host = { getAttribute: () => null, localName: 'helix-data-table' }
    expect(auditServed(host as unknown as HTMLElement, [], [], 0)).toBeUndefined()
  })
})

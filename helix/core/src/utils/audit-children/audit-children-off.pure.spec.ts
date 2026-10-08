import { describe, expect, test } from 'bun:test'
import { fileURLToPath } from 'node:url'
import { auditChildren } from './audit-children-off.js'

/**
 * Which module `#audit-children` is in each build.
 *
 * The same three ways as `#audit-name`, which `audit-name-off.pure.spec.ts`
 * describes. These ask what each build gets.
 */
const core = fileURLToPath(new URL('../../..', import.meta.url))

/** The file `#audit-children` resolves to from core's source, under these conditions. */
const resolved = (...conditions: string[]): string => {
  const run = Bun.spawnSync(
    [
      process.execPath,
      ...conditions.flatMap((one) => ['--conditions', one]),
      '-e',
      'console.log(import.meta.resolve("#audit-children"))',
    ],
    { cwd: core },
  )
  return run.stdout.toString().trim().split('/helix/core/')[1] ?? run.stderr.toString()
}

describe('the unregistered-child audit by build', () => {
  test('a development build takes the audit, and any other build the module that does nothing', () => {
    expect(resolved('development')).toBe('src/utils/audit-children/audit-children.ts')
    expect(resolved('helix-development')).toBe('src/utils/audit-children/audit-children.ts')
    expect(resolved()).toBe('src/utils/audit-children/audit-children-off.ts')
  })

  test('the production audit does nothing', () => {
    const host = { localName: 'helix-select' }
    expect(
      auditChildren(host as unknown as HTMLElement, 'option', 'option', 'it lists nothing'),
    ).toBeUndefined()
  })
})

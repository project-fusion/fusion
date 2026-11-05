import { describe, expect, test } from 'bun:test'
import { fileURLToPath } from 'node:url'
import { auditNesting, auditWrapped } from './audit-nesting-off.js'

/**
 * Which module `#audit-nesting` is in each build.
 *
 * The same three ways as `#audit-name`, which `audit-name-off.pure.spec.ts`
 * describes. These ask what each build gets.
 */
const core = fileURLToPath(new URL('../../..', import.meta.url))

/** The file `#audit-nesting` resolves to from core's source, under these conditions. */
const resolved = (...conditions: string[]): string => {
  const run = Bun.spawnSync(
    [
      process.execPath,
      ...conditions.flatMap((one) => ['--conditions', one]),
      '-e',
      'console.log(import.meta.resolve("#audit-nesting"))',
    ],
    { cwd: core },
  )
  return run.stdout.toString().trim().split('/helix/core/')[1] ?? run.stderr.toString()
}

describe('the unslotted-item audit by build', () => {
  test('a development build takes the audit, and any other build the module that does nothing', () => {
    expect(resolved('development')).toBe('src/utils/audit-nesting/audit-nesting.ts')
    expect(resolved('helix-development')).toBe('src/utils/audit-nesting/audit-nesting.ts')
    expect(resolved()).toBe('src/utils/audit-nesting/audit-nesting-off.ts')
  })

  test('the production audit does nothing', () => {
    const host = { children: [], localName: 'helix-tree-item' }
    expect(auditNesting(host as unknown as HTMLElement, 'children')).toBeUndefined()
  })

  test('the production wrapped-row audit never asks for the rows', () => {
    const host = { children: [], localName: 'helix-menu' }
    let asked = false
    const reached = (): Element[] => {
      asked = true
      return []
    }
    expect(
      auditWrapped(host as unknown as HTMLElement, 'helix-menu-item', reached, () => '', ''),
    ).toBeUndefined()
    expect(asked).toBe(false)
  })
})

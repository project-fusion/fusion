import { describe, expect, test } from 'bun:test'
import { fileURLToPath } from 'node:url'
import { auditReactProps } from './react-audit-off.js'

/**
 * Which module `#react-audit` is in each build, and what a production bundle of
 * the bridge still carries.
 *
 * The same three ways as `#audit-name`, which `audit-name-off.pure.spec.ts`
 * describes. The audit is a warning; binding the handlers and assigning the
 * properties React dropped is what makes React work, and stays in every build.
 * What the published files resolve is `development-imports.pure.spec.ts`'s.
 */
const core = fileURLToPath(new URL('../..', import.meta.url))

/** The file `#react-audit` resolves to from core's source, under these conditions. */
const resolved = (...conditions: string[]): string => {
  const run = Bun.spawnSync(
    [
      process.execPath,
      ...conditions.flatMap((one) => ['--conditions', one]),
      '-e',
      'console.log(import.meta.resolve("#react-audit"))',
    ],
    { cwd: core },
  )
  return run.stdout.toString().trim().split('/helix/core/')[1] ?? run.stderr.toString()
}

/** The bridge, bundled for a browser under these conditions. */
const bundled = async (...conditions: string[]): Promise<string> => {
  const built = await Bun.build({
    conditions,
    entrypoints: [fileURLToPath(new URL('./react-bridge.ts', import.meta.url))],
    external: ['lit'],
    format: 'esm',
    target: 'browser',
  })
  return (await built.outputs[0]?.text()) ?? ''
}

describe('the React prop audit by build', () => {
  test('a development build takes the audit, and any other build the module that does nothing', () => {
    expect(resolved('development')).toBe('src/helix-element/react-audit.ts')
    expect(resolved('helix-development')).toBe('src/helix-element/react-audit.ts')
    expect(resolved()).toBe('src/helix-element/react-audit-off.ts')
  })

  test('the production audit does nothing', () => {
    const host = { localName: 'helix-button' } as unknown as EventTarget
    expect(auditReactProps(host, { 'onhelix-opne': () => {} })).toBeUndefined()
  })

  test('a production bundle of the bridge binds handlers and carries no warning', async () => {
    const code = await bundled()
    // What makes React work: the props bag, React's casing, the property pass.
    expect(code).toContain('__reactProps$')
    expect(code).toContain('onTimeUpdate')
    expect(code).toContain('elementProperties')
    // What only tells the person writing the page.
    expect(code).not.toContain("Solid's syntax")
    expect(code).not.toContain('nothing dispatches')
    expect(code).not.toContain('onCheckedChange')
    expect(code).not.toContain('canvas-zoom')
  })

  test('a development bundle of the bridge carries the warnings too', async () => {
    const code = await bundled('development')
    expect(code).toContain('__reactProps$')
    expect(code).toContain("Solid's syntax")
    expect(code).toContain('nothing dispatches')
  })
})

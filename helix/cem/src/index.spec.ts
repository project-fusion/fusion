import { describe, expect, test } from 'bun:test'
import { join } from 'node:path'
import { afterManifest, dependenciesOf } from './index.js'
import type { Plugin } from './types.js'

describe('afterManifest', () => {
  const names = (steps: Plugin[]): string[] => steps.map((one) => one.name)

  test('writes no typings unless asked to', () => {
    expect(names(afterManifest({ tier: 'core' }))).toEqual([])
  })

  test('writes the typings in the order each one needs the last', () => {
    const steps = names(
      afterManifest({ frameworkTypes: true, packageName: '@x/y', tier: 'styled' }),
    )
    // Svelte's reuses the finished JSX tag map, so it follows every pass over it.
    expect(steps.indexOf('helix-svelte-types')).toBeGreaterThan(
      steps.indexOf('helix-jsx-declared-events'),
    )
    // Last of the generators, because it rewrites what two of them wrote.
    expect(steps.at(-1)).toBe('helix-jsx-optional-undefined')
  })
})

describe('dependenciesOf', () => {
  const at = (name: string) => join(import.meta.dir, '..', '..', name)

  test('reaches the manifests a package names, in the order it names them', () => {
    expect([...dependenciesOf(at('sandbox')).keys()]).toEqual([
      '@fusion.dev/helix-core',
      '@fusion.dev/helix-headless',
      '@fusion.dev/helix',
    ])
  })

  // The analyzer followed imports through the dependencies' own files, so a
  // package naming only the styled tier was given headless and core as well.
  // The site names the styled tier and not the two beneath it.
  test('reaches the manifests beneath the ones a package names', () => {
    expect([...dependenciesOf(join(at('..'), 'fusion', 'site')).keys()]).toEqual([
      '@fusion.dev/helix',
      '@fusion.dev/helix-core',
      '@fusion.dev/helix-headless',
      '@fusion.dev/helix-sandbox',
    ])
  })

  test('a package that depends on no manifest is built against none', () => {
    expect([...dependenciesOf(at('core')).keys()]).toEqual([])
  })
})

import { describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterManifest, dependenciesOf, peersOf } from './index.js'
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
    expect(steps.indexOf('helix-svelte-types')).toBeGreaterThan(
      steps.indexOf('helix-jsx-framework-props'),
    )
    // Each tag entry's `BaseProps<T>` is read as the generator wrote it, then
    // given the framework parameter.
    expect(steps.indexOf('helix-jsx-framework-props')).toBeGreaterThan(
      steps.indexOf('helix-jsx-native-events'),
    )
    // Last of the generators, because it rewrites what two of them wrote.
    expect(steps.at(-1)).toBe('helix-jsx-optional-undefined')
  })
})

describe('dependenciesOf', () => {
  const at = (name: string) => join(import.meta.dir, '..', '..', name)

  // In the order the package names them. The sandbox names core, which its
  // editor extends, and headless, which its code-block entry imports.
  test('reads the manifests of the packages a package names, in that order', () => {
    expect([...dependenciesOf(at('sandbox')).keys()]).toEqual([
      '@fusion.dev/helix-core',
      '@fusion.dev/helix-headless',
    ])
  })

  // The analyzer followed imports through the dependencies' own files, so a
  // package naming only the styled tier was given headless and core as well,
  // each after the package that reaches it.
  test('reaches the manifests beneath the ones a package names', () => {
    const root = mkdtempSync(join(tmpdir(), 'helix-cem-'))
    const write = (directory: string, manifest: object): void => {
      mkdirSync(join(root, directory), { recursive: true })
      writeFileSync(join(root, directory, 'package.json'), JSON.stringify(manifest))
    }
    const manifest = 'custom-elements.json'
    try {
      write('.', { dependencies: { styled: '1' } })
      write('node_modules/styled', { customElements: manifest, dependencies: { headless: '1' } })
      write('node_modules/headless', { customElements: manifest, dependencies: { core: '1' } })
      write('node_modules/core', { customElements: manifest })
      expect([...dependenciesOf(root).keys()]).toEqual(['styled', 'headless', 'core'])
    } finally {
      rmSync(root, { force: true, recursive: true })
    }
  })

  test('a package that depends on no manifest is built against none', () => {
    expect([...dependenciesOf(at('core')).keys()]).toEqual([])
  })
})

/* `@fusion.dev/helix-sandbox` peers `@fusion.dev/helix`, which holds the
   Sandbox family's root, so its `api.json` names the package with the
   family's facts. */
describe('peersOf', () => {
  test('reads the manifests of the Helix packages a package peers, and only those built', () => {
    const root = mkdtempSync(join(tmpdir(), 'helix-cem-'))
    const write = (directory: string, manifest: object): void => {
      mkdirSync(join(root, directory), { recursive: true })
      writeFileSync(join(root, directory, 'package.json'), JSON.stringify(manifest))
    }
    try {
      write('.', {
        peerDependencies: { '@fusion.dev/helix': '1', '@fusion.dev/helix-map': '1', lit: '3' },
      })
      write('node_modules/@fusion.dev/helix', { customElements: 'custom-elements.json' })
      writeFileSync(join(root, 'node_modules/@fusion.dev/helix/custom-elements.json'), '{}')
      write('node_modules/@fusion.dev/helix-map', { customElements: 'custom-elements.json' })
      write('node_modules/lit', { customElements: 'custom-elements.json' })
      expect([...peersOf(root).keys()]).toEqual(['@fusion.dev/helix'])
    } finally {
      rmSync(root, { force: true, recursive: true })
    }
  })
})

import { describe, expect, test } from 'bun:test'
import { createHelixCemConfig } from './index.js'
import { conventionLint } from './plugins/convention-lint.js'
import { helixTier } from './plugins/helix-tier.js'
import { reactEvents, toReactProp } from './plugins/react-events.js'
import type { HelixDeclaration, HelixManifest } from './types.js'

const manifest = (declaration: Partial<HelixDeclaration>): HelixManifest => ({
  modules: [
    {
      declarations: [{ kind: 'class', name: 'HelixThing', ...declaration }],
      path: 'src/thing.ts',
    },
  ],
})

const run = (plugin: ReturnType<typeof helixTier>, customElementsManifest: HelixManifest): void => {
  plugin.packageLinkPhase?.({
    context: {},
    customElementsManifest: customElementsManifest as never,
    ts: {} as never,
  })
}

const first = (pkg: HelixManifest): HelixDeclaration =>
  pkg.modules?.[0]?.declarations?.[0] ?? { name: 'missing' }

describe('toReactProp', () => {
  test('converts kebab-case to an on-prefixed camel prop', () => {
    expect(toReactProp('open-change')).toBe('onOpenChange')
    expect(toReactProp('value-change-complete')).toBe('onValueChangeComplete')
  })

  test('handles a single-word event', () => {
    expect(toReactProp('toggle')).toBe('onToggle')
  })
})

describe('helixTier', () => {
  test('stamps registered custom elements', () => {
    const pkg = manifest({ customElement: true, tagName: 'helix-thing' })
    run(helixTier('styled'), pkg)
    expect(first(pkg).helix?.tier).toBe('styled')
  })

  // The headless tier carries no @customElement decorator, so keying on
  // `customElement: true` would skip it entirely.
  test('stamps unregistered classes too', () => {
    const pkg = manifest({})
    run(helixTier('headless'), pkg)
    expect(first(pkg).helix?.tier).toBe('headless')
  })
})

describe('reactEvents', () => {
  test('annotates each event with its generated React prop', () => {
    const pkg = manifest({ events: [{ description: 'Fired on change.', name: 'open-change' }] })
    run(reactEvents(), pkg)
    expect(first(pkg).events?.[0]?.reactProp).toBe('onOpenChange')
  })
})

describe('conventionLint', () => {
  const lintOf = (declaration: Partial<HelixDeclaration>) => () =>
    run(
      conventionLint({ failOn: 'error' }),
      manifest({ description: 'Does a thing.', ...declaration }),
    )

  test('passes a fully documented component', () => {
    expect(
      lintOf({
        cssParts: [{ description: 'The wrapper.', name: 'container' }],
        events: [{ description: 'Fired on change.', name: 'open-change' }],
        members: [{ description: 'Whether it is open.', kind: 'field', name: 'open' }],
      }),
    ).not.toThrow()
  })

  test('rejects an undocumented public member', () => {
    expect(lintOf({ members: [{ kind: 'field', name: 'open' }] })).toThrow(/documented-member/)
  })

  test('ignores private members', () => {
    expect(
      lintOf({ members: [{ kind: 'field', name: 'internal', privacy: 'private' }] }),
    ).not.toThrow()
  })

  test('rejects an undocumented event', () => {
    expect(lintOf({ events: [{ name: 'open-change' }] })).toThrow(/documented-event/)
  })

  test('rejects a non-kebab event name', () => {
    expect(lintOf({ events: [{ description: 'x', name: 'openChange' }] })).toThrow(/kebab-events/)
  })

  test('rejects an undocumented CSS part', () => {
    expect(lintOf({ cssParts: [{ name: 'container' }] })).toThrow(/documented-csspart/)
  })

  test('rejects a description that opens with appearance', () => {
    expect(lintOf({ description: 'Themed collapsible section.' })).toThrow(/purpose-first/)
  })

  test('rejects an em dash', () => {
    expect(lintOf({ description: 'Does a thing — nicely.' })).toThrow(/no-em-dash/)
  })

  test('rejects a missing class description', () => {
    expect(lintOf({ description: '' })).toThrow(/class-description/)
  })

  test('warns instead of throwing when configured to', () => {
    expect(() =>
      run(
        conventionLint({ failOn: 'warn' }),
        manifest({ members: [{ kind: 'field', name: 'x' }] }),
      ),
    ).not.toThrow()
  })
})

describe('createHelixCemConfig', () => {
  test('ships the Helix plugin set and enables Lit handling', () => {
    const config = createHelixCemConfig({ tier: 'styled' })
    const names = (config.plugins ?? []).map((p) => (p as unknown as { name: string }).name)

    expect(config.litelement).toBe(true)
    // dependencies:true is what lets applyInheritancePlugin resolve members and
    // events across package boundaries. Without it a component that extends a
    // base in another package documents none of its inherited API.
    expect(config.dependencies).toBe(true)
    expect(names).toEqual([
      'helix-tier',
      'helix-declared-events',
      'helix-react-events',
      'helix-convention-lint',
    ])
  })

  test('inferred events are dropped before the linter sees them', () => {
    const names = (createHelixCemConfig({ tier: 'styled' }).plugins ?? []).map(
      (p) => (p as unknown as { name: string }).name,
    )
    expect(names.indexOf('helix-declared-events')).toBeLessThan(
      names.indexOf('helix-convention-lint'),
    )
  })

  test('lint can be turned off', () => {
    const config = createHelixCemConfig({ lint: false, tier: 'styled' })
    const names = (config.plugins ?? []).map((p) => (p as unknown as { name: string }).name)
    expect(names).not.toContain('helix-convention-lint')
  })

  test('extra plugins are appended after the Helix set', () => {
    const config = createHelixCemConfig({ plugins: [{ name: 'custom' }], tier: 'styled' })
    const names = (config.plugins ?? []).map((p) => (p as unknown as { name: string }).name)
    expect(names.at(-1)).toBe('custom')
  })

  test('test files are excluded so specs do not enter the manifest', () => {
    expect(createHelixCemConfig({ tier: 'styled' }).exclude).toContain('src/**/*.test.ts')
  })
})

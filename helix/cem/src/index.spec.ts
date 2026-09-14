import { describe, expect, test } from 'bun:test'
import { createHelixCemConfig } from './index.js'
import { conventionLint } from './plugins/convention-lint.js'
import { helixTier } from './plugins/helix-tier.js'
import { reactEvents, toReactProp } from './plugins/react-events.js'
import { stableOrder } from './plugins/stable-order.js'
import type { HelixContext, HelixDeclaration, HelixManifest } from './types.js'

/**
 * The component root, which every real Helix class descends from.
 *
 * Carries the metadata contract because the linter walks every component in the
 * manifest, including this one.
 */
const ROOT: HelixDeclaration = {
  description: 'Base class for every Helix element.',
  helix: {
    documentation: 'https://helix.fusion.dev/core/helix-element',
    since: '0.1.0',
    status: 'experimental',
  },
  kind: 'class',
  name: 'HelixElement',
}

const manifest = (declaration: Partial<HelixDeclaration>): HelixManifest => ({
  modules: [
    {
      declarations: [
        ROOT,
        {
          kind: 'class',
          name: 'HelixThing',
          superclass: { name: 'HelixElement' },
          ...declaration,
        },
      ],
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

const runWith = (
  plugin: ReturnType<typeof helixTier>,
  customElementsManifest: HelixManifest,
  context: HelixContext,
): void => {
  plugin.packageLinkPhase?.({
    context: context as never,
    customElementsManifest: customElementsManifest as never,
    ts: {} as never,
  })
}

const subject = (pkg: HelixManifest): HelixDeclaration =>
  pkg.modules?.[0]?.declarations?.find((d) => d.name === 'HelixThing') ?? { name: 'missing' }

describe('toReactProp', () => {
  // React strips `on` and listens for exactly what is left, so any transform of
  // the name binds an event nobody dispatches.
  test('is `on` and the event name verbatim', () => {
    expect(toReactProp('helix-open')).toBe('onhelix-open')
    expect(toReactProp('helix-before-change')).toBe('onhelix-before-change')
  })

  test('a relayed native event keeps its own name', () => {
    expect(toReactProp('change')).toBe('onchange')
  })
})

describe('helixTier', () => {
  test('stamps registered custom elements', () => {
    const pkg = manifest({ customElement: true, tagName: 'helix-thing' })
    run(helixTier('styled'), pkg)
    expect(subject(pkg).helix?.tier).toBe('styled')
  })

  // The headless tier carries no @customElement decorator, so keying on
  // `customElement: true` would skip it entirely.
  test('stamps unregistered classes too', () => {
    const pkg = manifest({})
    run(helixTier('headless'), pkg)
    expect(subject(pkg).helix?.tier).toBe('headless')
  })
})

describe('reactEvents', () => {
  test('annotates each event with its generated React prop', () => {
    const pkg = manifest({
      events: [{ description: 'Fired on change.', name: 'OpenChange' }],
    })
    run(reactEvents(), pkg)
    expect(subject(pkg).events?.[0]?.reactProp).toBe('onOpenChange')
  })
})

describe('conventionLint', () => {
  /** The metadata @since, @status, and @documentation carry, all required. */
  const DOCUMENTED = {
    helix: {
      documentation: 'https://helix.fusion.dev/components/thing',
      since: '0.1.0',
      status: 'experimental',
    },
  } as const

  const lintOf = (declaration: Partial<HelixDeclaration>) => () =>
    run(
      conventionLint({ failOn: 'error' }),
      manifest({ description: 'Does a thing.', ...DOCUMENTED, ...declaration }),
    )

  test('rejects a component with no @since', () => {
    expect(lintOf({ helix: { documentation: 'https://x', status: 'experimental' } })).toThrow(
      /documented-since/,
    )
  })

  test('rejects a component with no @status', () => {
    expect(lintOf({ helix: { documentation: 'https://x', since: '0.1.0' } })).toThrow(
      /documented-status/,
    )
  })

  test('passes a fully documented component', () => {
    expect(
      lintOf({
        cssParts: [{ description: 'The wrapper.', name: 'container' }],
        events: [{ description: 'Fired when it opens.', name: 'helix-open' }],
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
    expect(lintOf({ events: [{ name: 'OpenChange' }] })).toThrow(/documented-event/)
  })

  test('rejects an event name with no prefix', () => {
    // An event from inside a shadow root is retargeted to look like it came
    // from the host, so a bare name is indistinguishable from the inner
    // control's own.
    expect(lintOf({ events: [{ description: 'x', name: 'open' }] })).toThrow(/prefixed-events/)
  })

  test('allows a native name that is being relayed', () => {
    // Being indistinguishable from the native event is the point of relaying.
    expect(lintOf({ events: [{ description: 'x', name: 'change' }] })).not.toThrow()
  })

  /* Hyphens are not limited. Measured in Chrome against React 19.2.8,
     `ona-b-c-d` binds exactly as `onhelix-open` does, and `react-dom` slices
     `on` off the prop and hands the remainder to `addEventListener` without
     inspecting it. Web Awesome ships `wa-after-hide` and `wa-column-resize`,
     which is the same finding from the other direction.

     What looks like a hyphen limit is hydration: on a server-rendered page
     React attaches no custom element listener at all, whatever it is called,
     until it commits an update for some other reason, so which names appear to
     bind depends on what else is on the page. */
  test('allows an event name carrying two hyphens', () => {
    expect(lintOf({ events: [{ description: 'x', name: 'helix-value-change' }] })).not.toThrow()
  })

  test('rejects an undocumented CSS part', () => {
    expect(lintOf({ cssParts: [{ name: 'container' }] })).toThrow(/documented-csspart/)
  })

  test('rejects a description that opens with appearance', () => {
    expect(lintOf({ description: 'Themed collapsible section.' })).toThrow(/purpose-first/)
  })

  test('rejects an em dash', () => {
    expect(lintOf({ description: 'Does a thing \u2014 nicely.' })).toThrow(/no-em-dash/)
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

describe('component predicate', () => {
  // Keying on `kind === 'class'` linted and stamped every exported class,
  // which is correct only until a package exports one that is not a component.
  test('ignores a class that does not descend from HelixElement', () => {
    const pkg: HelixManifest = {
      modules: [
        {
          declarations: [
            ROOT,
            { kind: 'class', name: 'UrlBuilder' },
            { kind: 'class', name: 'WithOpenInterface' },
          ],
          path: 'src/util.ts',
        },
      ],
    }

    run(helixTier('styled'), pkg)
    const stamped = (pkg.modules?.[0]?.declarations ?? [])
      .filter((d) => d.helix?.tier)
      .map((d) => d.name)

    expect(stamped).toEqual(['HelixElement'])
  })

  test('resolves the chain through a dependency manifest', () => {
    const dependency: HelixManifest = {
      modules: [{ declarations: [ROOT], path: 'src/index.ts' }],
    }
    const pkg: HelixManifest = {
      modules: [
        {
          declarations: [
            { kind: 'class', name: 'HelixThing', superclass: { name: 'HelixElement' } },
          ],
          path: 'src/thing.ts',
        },
      ],
    }

    // Without the dependency's manifest the base is unresolvable, so the
    // component looks unrelated to HelixElement and is skipped entirely.
    run(helixTier('styled'), pkg)
    expect(subject(pkg).helix).toBeUndefined()

    runWith(helixTier('styled'), pkg, { thirdPartyCEMs: [dependency] })
    expect(subject(pkg).helix?.tier).toBe('styled')
  })

  test('terminates on a superclass cycle', () => {
    const pkg: HelixManifest = {
      modules: [
        {
          declarations: [
            { kind: 'class', name: 'A', superclass: { name: 'B' } },
            { kind: 'class', name: 'B', superclass: { name: 'A' } },
          ],
          path: 'src/cycle.ts',
        },
      ],
    }

    expect(() => run(helixTier('styled'), pkg)).not.toThrow()
  })
})

describe('stableOrder', () => {
  test('sorts modules by path, so an unchanged tree emits an unchanged manifest', () => {
    // The analyzer emits modules in the order its globs resolved, which is
    // filesystem order and not stable between runs.
    const pkg: HelixManifest = {
      modules: [
        { path: 'src/toggle/root.ts' },
        { path: 'src/accordion/root.ts' },
        { path: 'src/badge/root.ts' },
      ],
    }
    run(stableOrder(), pkg)
    expect((pkg.modules ?? []).map((module) => module.path)).toEqual([
      'src/accordion/root.ts',
      'src/badge/root.ts',
      'src/toggle/root.ts',
    ])
  })

  test('leaves a manifest with no modules alone', () => {
    const pkg = {} as HelixManifest
    expect(() => run(stableOrder(), pkg)).not.toThrow()
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
      'helix-composition',
      'helix-metadata',
      // After composition, which is what decides a declaration is the root.
      'helix-examples',
      'helix-source',
      'helix-declared-events',
      'helix-references',
      // After the analyzer has filled each declaration's own `cssProperties`,
      // which is what it copies across, and before `helix-stable-order` so the
      // hooks it appends are sorted with everything else.
      'helix-borrowed-styles',
      'helix-react-events',
      'helix-convention-lint',
      'helix-stable-order',
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

  test('specs are excluded so they do not enter the manifest', () => {
    expect(createHelixCemConfig({ tier: 'styled' }).exclude).toContain('src/**/*.spec.ts')
  })
})

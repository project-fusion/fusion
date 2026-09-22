import { describe, expect, test } from 'bun:test'
import { join } from 'node:path'
import { afterManifest, dependenciesOf } from './index.js'
import { conventionLint } from './plugins/convention-lint.js'
import {
  eachComponent,
  type HelixContext,
  type HelixDeclaration,
  type HelixManifest,
  type Plugin,
} from './types.js'

/**
 * The component root, which every real Helix class descends from.
 *
 * Carries the metadata contract because the linter walks every component in the
 * manifest, including this one.
 */
const ROOT: HelixDeclaration = {
  description: 'Base class for every Helix element.',
  helix: {
    documentation: 'https://example.com/core/helix-element',
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

const run = (plugin: Plugin, customElementsManifest: HelixManifest): void => {
  plugin.packageLinkPhase?.({ context: {}, customElementsManifest })
}

describe('conventionLint', () => {
  /** The metadata @since, @status, and @documentation carry, all required. */
  const DOCUMENTED = {
    helix: {
      documentation: 'https://example.com/components/thing',
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

/** The names `eachComponent` yields, which is what the linter walks. */
const components = (pkg: HelixManifest, context?: HelixContext): string[] =>
  [...eachComponent(pkg, context)].map(({ declaration }) => declaration.name)

describe('component predicate', () => {
  // Keying on `kind === 'class'` linted every exported class, which is correct
  // only until a package exports one that is not a component.
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

    expect(components(pkg)).toEqual(['HelixElement'])
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
    expect(components(pkg)).toEqual([])
    expect(components(pkg, { thirdPartyCEMs: [dependency] })).toEqual(['HelixThing'])
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

    expect(() => components(pkg)).not.toThrow()
  })
})

describe('afterManifest', () => {
  const names = (steps: Plugin[]): string[] => steps.map((one) => one.name)

  test('lints, and writes no typings unless asked to', () => {
    expect(names(afterManifest({ tier: 'core' }))).toEqual(['helix-convention-lint'])
  })

  test('lints before it writes typings, which read the manifest the linter passed', () => {
    const steps = names(
      afterManifest({ frameworkTypes: true, packageName: '@x/y', tier: 'styled' }),
    )
    expect(steps[0]).toBe('helix-convention-lint')
    // Last of the generators, because it rewrites what two of them wrote.
    expect(steps.at(-1)).toBe('helix-jsx-optional-undefined')
  })

  test('lint can be turned off', () => {
    expect(names(afterManifest({ lint: false, tier: 'styled' }))).toEqual([])
  })
})

describe('dependenciesOf', () => {
  const at = (name: string) => join(import.meta.dir, '..', '..', name)

  // The analyzer followed imports through the dependencies' own files, so a
  // package naming only the styled tier was given headless and core as well,
  // which the linter needs to see that a class descends from HelixElement.
  test('reaches the manifests beneath the ones a package names', () => {
    expect([...dependenciesOf(at('sandbox')).keys()]).toEqual([
      '@fusion.dev/helix-core',
      '@fusion.dev/helix',
      '@fusion.dev/helix-headless',
    ])
  })

  test('a package that depends on no manifest is built against none', () => {
    expect([...dependenciesOf(at('core')).keys()]).toEqual([])
  })
})

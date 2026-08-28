import { describe, expect, test } from 'bun:test'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import type { HelixDeclaration, HelixManifest } from '../types.js'
import { borrowedStyles } from './borrowed-styles.js'

/**
 * The analyzer's own TypeScript, which is the only one here that can parse.
 *
 * **`node_modules` holds two and the difference is the whole reason for this
 * dance.** The root is 7, which publishes a `bin/tsc` shim over a platform
 * binary and exports no synchronous compiler API, so it has no
 * `createSourceFile` to call. The analyzer pins `~5.4.2` and resolves its own
 * nested copy, and that nested one is what it hands every plugin as
 * `analyzePhase({ ts })`. Parsing with it is what makes this exercise the nodes
 * the plugin actually meets rather than a shape of our own imagining.
 *
 * **Found by walking up rather than by `require.resolve`**, which does not work
 * under the runner. Bun resolves `@custom-elements-manifest/analyzer` to its
 * global install cache, where the nested `typescript` is not, and it ignores
 * the `paths` option that would otherwise redirect it: asking for `typescript`
 * from there returns the root 7 and the failure is `ScriptTarget` being
 * `undefined`, which names nothing. The path below is the one bun's own
 * hoisting produces, and the walk finds it from wherever this file is run.
 *
 * The plugin itself never imports `typescript` at all, which is the rule in
 * `CLAUDE.md`: it takes `ts` off the callback so 7's types never land on 5.4's
 * nodes. A test is allowed to reach for the module because it is not compiled
 * into the package, and it reaches for the same copy the analyzer would pass.
 */
const NESTED = join(
  'node_modules',
  '@custom-elements-manifest',
  'analyzer',
  'node_modules',
  'typescript',
  'lib',
  'typescript.js',
)

const analyzerTypeScript = (): string => {
  for (let at = import.meta.dir; at !== dirname(at); at = dirname(at)) {
    const candidate = join(at, NESTED)
    if (existsSync(candidate)) {
      return candidate
    }
  }
  throw new Error(`no nested TypeScript above ${import.meta.dir}; run \`bun install\``)
}

// biome-ignore lint/suspicious/noExplicitAny: the analyzer types `ts` structurally per plugin.
const ts: any = createRequire(import.meta.url)(analyzerTypeScript())

/** The lender: a component with three hooks of its own. */
const LENDER: HelixDeclaration = {
  cssProperties: [
    { description: 'Corner rounding.', name: '--icon-button-radii' },
    { description: 'The square box.', name: '--icon-button-size' },
    { description: 'Its lift.', name: '--icon-button-shadow' },
  ],
  kind: 'class',
  name: 'HelixIconButton',
}

/**
 * Runs both phases the way the analyzer does: every module parsed, then linked.
 *
 * `source` is parsed for the borrow, and `declarations` is the manifest the
 * link phase writes into. They are separate because that is the shape of the
 * gap this plugin fills: the relationship is only in the source, and the
 * manifest is where a consumer looks.
 */
const scene = (source: string, declarations: HelixDeclaration[]): HelixDeclaration[] => {
  const plugin = borrowedStyles()
  const file = ts.createSourceFile('component.ts', source, ts.ScriptTarget.ESNext, true)

  const visit = (node: unknown): void => {
    plugin.analyzePhase?.({ moduleDoc: { declarations }, node, ts } as never)
    ts.forEachChild(node, visit)
  }
  visit(file)

  const manifest: HelixManifest = {
    modules: [{ declarations, path: 'src/icon-button/root/icon-button-root.ts' }],
  }
  plugin.packageLinkPhase?.({ context: {}, customElementsManifest: manifest } as never)
  return declarations
}

const hooksOf = (declaration: HelixDeclaration): string[] =>
  (declaration.cssProperties ?? []).map((one) => one.name)

describe('a component that borrows another stylesheet whole', () => {
  test('gains the lender hooks, so the documentation stops saying it answers none', () => {
    const borrower: HelixDeclaration = { kind: 'class', name: 'HelixCopyButton' }
    const [, copyButton] = scene(
      `class HelixCopyButton extends Base {
         static override styles = [HelixIconButton.styles, styles].flat()
       }`,
      [LENDER, borrower],
    )

    expect(hooksOf(copyButton as HelixDeclaration)).toEqual([
      '--icon-button-radii',
      '--icon-button-size',
      '--icon-button-shadow',
    ])
  })

  test('records the lender on each one, because the name is still the lender name', () => {
    const borrower: HelixDeclaration = { kind: 'class', name: 'HelixCopyButton' }
    const [, copyButton] = scene(
      'class HelixCopyButton extends Base { static styles = [HelixIconButton.styles].flat() }',
      [LENDER, borrower],
    )

    expect((copyButton as HelixDeclaration).cssProperties?.[0]?.inheritedFrom).toEqual({
      module: 'src/icon-button/root/icon-button-root.ts',
      name: 'HelixIconButton',
    })
  })

  test('keeps its own description where it documents the same hook itself', () => {
    const borrower: HelixDeclaration = {
      cssProperties: [{ description: 'Mine, and said differently.', name: '--icon-button-size' }],
      kind: 'class',
      name: 'HelixCopyButton',
    }
    const [, copyButton] = scene(
      'class HelixCopyButton extends Base { static styles = [HelixIconButton.styles].flat() }',
      [LENDER, borrower],
    )

    const own = (copyButton as HelixDeclaration).cssProperties ?? []
    expect(own.filter((one) => one.name === '--icon-button-size')).toHaveLength(1)
    expect(own[0]?.description).toBe('Mine, and said differently.')
    expect(own[0]?.inheritedFrom).toBeUndefined()
  })
})

describe('what it deliberately does not follow', () => {
  test('leaves a component composing its own stylesheet alone', () => {
    const plain: HelixDeclaration = { kind: 'class', name: 'HelixCard' }
    const [, card] = scene('class HelixCard extends Base { static styles = [styles].flat() }', [
      LENDER,
      plain,
    ])

    expect((card as HelixDeclaration).cssProperties).toBeUndefined()
  })

  test('ignores a class naming itself, which is `super.styles` written long', () => {
    const self: HelixDeclaration = { kind: 'class', name: 'HelixIconButton' }
    scene(
      'class HelixIconButton extends Base { static styles = [HelixIconButton.styles, x].flat() }',
      [self],
    )

    expect(hooksOf(self)).toEqual([])
  })

  test('ignores a non-static `styles`, which is an instance field and not the sheet', () => {
    const borrower: HelixDeclaration = { kind: 'class', name: 'HelixCopyButton' }
    const [, copyButton] = scene(
      'class HelixCopyButton extends Base { styles = [HelixIconButton.styles].flat() }',
      [LENDER, borrower],
    )

    expect((copyButton as HelixDeclaration).cssProperties).toBeUndefined()
  })

  test('says nothing when the lender is not in the manifest, rather than inventing it', () => {
    const borrower: HelixDeclaration = { kind: 'class', name: 'HelixCopyButton' }
    const [copyButton] = scene(
      'class HelixCopyButton extends Base { static styles = [HelixAbsent.styles].flat() }',
      [borrower],
    )

    expect((copyButton as HelixDeclaration).cssProperties).toBeUndefined()
  })
})

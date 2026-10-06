import { describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import pkg from '../package.json'

/**
 * How a development-only audit reaches a Vite dev server.
 *
 * The source imports each audit as a `#` subpath of core's `imports`, whose
 * targets are the source files. Vite's dev server bundles a dependency with
 * esbuild, which resolves a `#` import with no `development` condition, so
 * `scripts/development-imports.mjs` rewrites each one in `dist` to the subpath
 * `exports` publishes for the same files, which Vite resolves under its own
 * conditions.
 */
const core = fileURLToPath(new URL('..', import.meta.url))

/** Where `tsc` writes a source file. */
const compiled = (source: string): string =>
  source.replace(/^\.\/src\//, './dist/').replace(/\.ts$/, '.js')

/** An `imports` entry with each target replaced by the file `tsc` writes for it. */
const published = (target: Record<string, string>): Record<string, string> =>
  Object.fromEntries(
    Object.entries(target).map(([condition, source]) => [condition, compiled(source)]),
  )

describe('the development-only audits in the published files', () => {
  test('each `#` import has an export that publishes the same files', () => {
    const exported = pkg.exports as unknown as Record<string, Record<string, string>>
    expect(Object.keys(pkg.imports).sort()).toEqual([
      '#audit-name',
      '#audit-source',
      '#react-audit',
    ])
    for (const [key, subpath] of [
      ['#audit-name', './audits/name'],
      ['#audit-source', './audits/source'],
      ['#react-audit', './audits/react'],
    ] as const) {
      const target = pkg.imports[key]
      const { types, ...runtime } = exported[subpath] ?? {}
      expect(runtime).toEqual(published(target))
      expect(types).toBe(compiled(target.development).replace(/\.js$/, '.d.ts'))
      // Order is how a resolver chooses: the declarations first, the default last.
      expect(Object.keys(exported[subpath] ?? {})).toEqual([
        'types',
        'development',
        'helix-development',
        'default',
      ])
    }
  })

  test('the build rewrites each `#` import in a compiled module to the export', () => {
    const dist = mkdtempSync(join(tmpdir(), 'helix-development-imports-'))
    try {
      mkdirSync(join(dist, 'mixins'))
      writeFileSync(
        join(dist, 'index.js'),
        "export { auditName } from '#audit-name';\nexport const id = '#audit-name-not';\n",
      )
      writeFileSync(
        join(dist, 'mixins', 'field.js'),
        'import { auditReactProps } from "#react-audit";\nimport { auditSource } from \'#audit-source\';\n',
      )
      writeFileSync(join(dist, 'index.d.ts'), "export { auditName } from '#audit-name';\n")
      writeFileSync(join(dist, 'notes.md'), "'#audit-name'\n")
      const run = Bun.spawnSync(
        [process.execPath, join(core, 'scripts/development-imports.mjs'), dist],
        { cwd: core },
      )
      expect(run.exitCode).toBe(0)
      expect(readFileSync(join(dist, 'index.js'), 'utf8')).toBe(
        "export { auditName } from '@fusion.dev/helix-core/audits/name';\n" +
          "export const id = '#audit-name-not';\n",
      )
      expect(readFileSync(join(dist, 'mixins', 'field.js'), 'utf8')).toBe(
        'import { auditReactProps } from "@fusion.dev/helix-core/audits/react";\n' +
          "import { auditSource } from '@fusion.dev/helix-core/audits/source';\n",
      )
      // A consumer's TypeScript reads the declarations the export names.
      expect(readFileSync(join(dist, 'index.d.ts'), 'utf8')).toBe(
        "export { auditName } from '@fusion.dev/helix-core/audits/name';\n",
      )
      expect(readFileSync(join(dist, 'notes.md'), 'utf8')).toBe("'#audit-name'\n")
    } finally {
      rmSync(dist, { force: true, recursive: true })
    }
  })

  test('the build runs the rewrite once the modules and the declarations are written', () => {
    expect(pkg.scripts.build).toBe(
      'tsc -p tsconfig.build.json && tsc -p tsconfig.types.json && bun scripts/development-imports.mjs',
    )
  })
})

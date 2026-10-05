import { describe, expect, test } from 'bun:test'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { jsxImports } from './jsx-imports.js'

/** The plugin rewrites a file the generator wrote, so the test writes one. */
const scene = (source: string): string => {
  const dir = mkdtempSync(join(tmpdir(), 'jsx-imports-'))
  writeFileSync(join(dir, 'jsx.d.ts'), source)
  const was = process.cwd()
  process.chdir(dir)
  try {
    jsxImports({ packageName: 'pkg' }).packageLinkPhase?.({ customElementsManifest: {} } as never)
    return readFileSync(join(dir, 'jsx.d.ts'), 'utf8')
  } finally {
    process.chdir(was)
    rmSync(dir, { force: true, recursive: true })
  }
}

/** The names between the braces of the file's import. */
const importedBy = (source: string): string[] =>
  (/^import type \{([^}]*)\}/m.exec(source)?.[1] ?? '')
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean)

describe('the imports of the JSX types', () => {
  test('adds an event type the body names', () => {
    const next = scene(
      "import type { HelixDialog } from 'pkg'\n\ntype A = { e: HelixOpenEvent; d: HelixDialog }\n",
    )
    expect(importedBy(next)).toEqual(['HelixDialog', 'HelixOpenEvent'])
  })

  /* A description saying "other Helix components" imported `Helix`, and a
     signature quoted in one imported a class the package does not export. */
  test('takes nothing from a comment', () => {
    const next = scene(
      "import type { HelixDialog } from 'pkg'\n\n/** Works with other Helix components. `cross(by: HelixHeadlessSplitter)` */\ntype A = { d: HelixDialog }\n",
    )
    expect(importedBy(next)).toEqual(['HelixDialog'])
  })

  /* The generator imports every export of a module it names, constants the
     package root does not export among them. */
  test('drops an import the body never uses', () => {
    const next = scene(
      "import type { FAILED_LABEL, HelixDialog, pointsOf } from 'pkg'\n\ntype A = { d: HelixDialog }\n",
    )
    expect(importedBy(next)).toEqual(['HelixDialog'])
  })
})

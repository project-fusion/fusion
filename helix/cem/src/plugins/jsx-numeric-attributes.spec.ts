import { describe, expect, test } from 'bun:test'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { HelixManifest } from '../types.js'
import { jsxNumericAttributes } from './jsx-numeric-attributes.js'

/** A pagination with a numeric `default-page`, a same-named `pages`, and a boolean. */
const MANIFEST: HelixManifest = {
  modules: [
    {
      declarations: [
        {
          attributes: [
            { fieldName: 'defaultPage', name: 'default-page', type: { text: 'number' } },
            { fieldName: 'pages', name: 'pages', type: { text: 'number' } },
            { fieldName: 'ends', name: 'ends', type: { text: 'boolean' } },
            { fieldName: 'perView', name: 'per-view', type: { text: 'number | undefined' } },
            { fieldName: 'defaultSize', name: 'default-size' },
            { fieldName: 'markAll', name: 'mark-all', type: { text: 'boolean' } },
            { fieldName: 'minLength', name: 'minlength', type: { text: 'number | undefined' } },
          ],
          kind: 'class',
          members: [{ name: 'defaultSize', type: { text: 'number' } }],
          name: 'HelixPagination',
        },
      ],
    },
  ],
}

const FIXTURE = [
  'export type HelixPaginationProps = {',
  '  "default-page"?: HelixPagination[\'defaultPage\'];',
  "  defaultPage?: HelixPagination['defaultPage'];",
  "  pages?: HelixPagination['pages'];",
  "  ends?: HelixPagination['ends'];",
  '  "per-view"?: HelixPagination["perView"];',
  '  "default-size"?: HelixPagination["defaultSize"];',
  '  "mark-all"?: HelixPagination["markAll"];',
  '  minlength?: HelixPagination["minLength"];',
  '  minLength?: HelixPagination["minLength"];',
  '};',
  'export type HelixPaginationSolidJsProps = {',
  '  "attr:default-page"?: HelixPagination[\'defaultPage\'];',
  '  "prop:defaultPage"?: HelixPagination[\'defaultPage\'];',
  '};',
  '',
].join('\n')

/**
 * The plugin rewrites files the generators wrote, so the test writes them.
 *
 * A fixture rather than the real `jsx.d.ts`, which is rebuilt by `analyze`:
 * asserting against it would test whether somebody had run the build. This
 * asserts the transform.
 */
const scene = (source: string, fileName = 'jsx.d.ts', manifest = MANIFEST): string => {
  const dir = mkdtempSync(join(tmpdir(), 'jsx-numeric-'))
  writeFileSync(join(dir, fileName), source)
  const was = process.cwd()
  process.chdir(dir)
  try {
    jsxNumericAttributes().packageLinkPhase?.({ customElementsManifest: manifest } as never)
    return readFileSync(join(dir, fileName), 'utf8')
  } finally {
    process.chdir(was)
    rmSync(dir, { force: true, recursive: true })
  }
}

describe('a numeric attribute takes the string that spells one', () => {
  const widened = scene(FIXTURE)

  test('widens the attribute entry, whichever quote the generator chose', () => {
    expect(widened).toContain('"default-page"?: HelixPagination[\'defaultPage\'] | `${number}`;')
    expect(widened).toContain('"per-view"?: HelixPagination["perView"] | `${number}`;')
  })

  test('leaves the property entry, which React assigns verbatim', () => {
    expect(widened).toContain("  defaultPage?: HelixPagination['defaultPage'];\n")
  })

  test('leaves a same-named attribute, which reaches the property and not the converter', () => {
    expect(widened).toContain("  pages?: HelixPagination['pages'];\n")
  })

  test('leaves a boolean, whose string form is the attribute present', () => {
    expect(widened).toContain('"mark-all"?: HelixPagination["markAll"];\n')
    expect(widened).toContain("  ends?: HelixPagination['ends'];\n")
  })

  test('widens a bare name the generator left unquoted, and not the property it is the attribute of', () => {
    expect(widened).toContain('  minlength?: HelixPagination["minLength"] | `${number}`;\n')
    expect(widened).toContain('  minLength?: HelixPagination["minLength"];\n')
  })

  test('reads the type off the member when the attribute records none', () => {
    expect(widened).toContain('"default-size"?: HelixPagination["defaultSize"] | `${number}`;')
  })

  test("widens Solid's attr: spelling and not its prop: one", () => {
    expect(widened).toContain(
      '"attr:default-page"?: HelixPagination[\'defaultPage\'] | `${number}`;',
    )
    expect(widened).toContain('"prop:defaultPage"?: HelixPagination[\'defaultPage\'];\n')
  })

  test('rewrites vue.d.ts on the same pass', () => {
    expect(scene(FIXTURE, 'vue.d.ts')).toContain(
      '"default-page"?: HelixPagination[\'defaultPage\'] | `${number}`;',
    )
  })

  test('leaves a file alone when the manifest has no numeric attribute', () => {
    expect(scene(FIXTURE, 'jsx.d.ts', { modules: [] })).toBe(FIXTURE)
  })

  test('says nothing about a package that generated no types', () => {
    const dir = mkdtempSync(join(tmpdir(), 'jsx-numeric-'))
    const was = process.cwd()
    process.chdir(dir)
    try {
      expect(() =>
        jsxNumericAttributes().packageLinkPhase?.({ customElementsManifest: MANIFEST } as never),
      ).not.toThrow()
    } finally {
      process.chdir(was)
      rmSync(dir, { force: true, recursive: true })
    }
  })
})

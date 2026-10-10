import { describe, expect, test } from 'bun:test'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { HelixManifest } from '../types.js'
import { jsxUnnamedAttributes } from './jsx-unnamed-attributes.js'

/** A field whose `aria-label` names no field, beside one that names `label`. */
const MANIFEST: HelixManifest = {
  modules: [
    {
      declarations: [
        {
          attributes: [
            {
              description: 'The name a screen reader says.\n\nA second paragraph.',
              name: 'aria-label',
              type: { text: 'string | null' },
            },
            { fieldName: 'label', name: 'label', type: { text: 'string' } },
            { name: 'tone' },
          ],
          kind: 'class',
          name: 'HelixInput',
        },
        { attributes: [{ fieldName: 'open', name: 'open' }], kind: 'class', name: 'HelixMenu' },
      ],
    },
  ],
}

/** What the generators write for it, a description over two paragraphs included. */
const FIXTURE = [
  'export type HelixInputProps = {',
  '  /** The visible label. */',
  '  label?: HelixInput["label"];',
  '  /** The name a screen reader says.',
  '',
  'A second paragraph. */',
  '  "aria-label"?: unknown;',
  '  /** The name a screen reader says.',
  '',
  'A second paragraph. */',
  '  undefined?: unknown;',
  '  /**  */',
  '  tone?: unknown;',
  '};',
  'export type HelixInputSolidJsProps = {',
  '  /**  */',
  '  "attr:aria-label"?: unknown;',
  '  /**  */',
  '  "prop:undefined"?: unknown;',
  '};',
  'export type HelixMenuProps = {',
  '  "aria-label"?: unknown;',
  '};',
  '',
].join('\n')

/**
 * The plugin rewrites files the generators wrote, so the test writes them.
 *
 * A fixture rather than the real `jsx.d.ts`, which is rebuilt by `analyze`:
 * asserting against it would test whether somebody had run the build.
 */
const scene = (source: string, fileName = 'jsx.d.ts'): string => {
  const dir = mkdtempSync(join(tmpdir(), 'jsx-unnamed-'))
  writeFileSync(join(dir, fileName), source)
  const was = process.cwd()
  process.chdir(dir)
  try {
    jsxUnnamedAttributes().packageLinkPhase?.({ customElementsManifest: MANIFEST } as never)
    return readFileSync(join(dir, fileName), 'utf8')
  } finally {
    process.chdir(was)
    rmSync(dir, { force: true, recursive: true })
  }
}

describe('an attribute that names no field', () => {
  const typed = scene(FIXTURE)

  test('is typed by its own type, without the null its field starts as', () => {
    expect(typed).toContain('  "aria-label"?: string;\n')
    expect(typed).toContain('  "attr:aria-label"?: string;\n')
  })

  test('is a string where the manifest records no type', () => {
    expect(typed).toContain('  tone?: string;\n')
  })

  test('keeps its description', () => {
    expect(typed).toContain(
      '  /** The name a screen reader says.\n\nA second paragraph. */\n  "aria-label"',
    )
  })

  test('leaves no prop called undefined, with its comment', () => {
    expect(typed).not.toContain('undefined?:')
    expect(typed).not.toContain('"prop:undefined"')
    expect(typed.match(/The name a screen reader says/g)).toHaveLength(1)
  })

  // Only the class whose manifest says so. Menu's `"aria-label"` here is a
  // made-up line the manifest gives no type for, and stays as written.
  test('is read per element', () => {
    expect(typed).toContain('export type HelixMenuProps = {\n  "aria-label"?: unknown;\n};')
  })

  test('and the same in the Vue typings', () => {
    const vue = scene(
      'export type HelixInputVueProps = {\n  /**  */\n  "aria-label"?: unknown;\n};\n',
      'vue.d.ts',
    )
    expect(vue).toContain('  "aria-label"?: string;\n')
  })
})

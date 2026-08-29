import { describe, expect, test } from 'bun:test'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { jsxOptionalUndefined } from './jsx-optional-undefined.js'

/**
 * The plugin rewrites files the generators wrote, so the test writes them.
 *
 * A fixture rather than the real `jsx.d.ts`, which is 40,000 lines and rebuilt
 * by `analyze`: asserting against it would test whether somebody had run the
 * build. This asserts the transform.
 */
const scene = (source: string, fileName = 'jsx.d.ts'): string => {
  const dir = mkdtempSync(join(tmpdir(), 'jsx-optional-'))
  writeFileSync(join(dir, fileName), source)
  const was = process.cwd()
  process.chdir(dir)
  try {
    jsxOptionalUndefined().packageLinkPhase?.({} as never)
    return readFileSync(join(dir, fileName), 'utf8')
  } finally {
    process.chdir(was)
    rmSync(dir, { force: true, recursive: true })
  }
}

describe('widening optional props', () => {
  test('adds undefined to a plain prop', () => {
    expect(scene('type A = {\n  label?: string;\n};\n')).toContain('label?: (string) | undefined;')
  })

  test('parenthesizes a handler, so the union is not read as its return type', () => {
    /* The whole reason this wraps rather than appends. `(e: Event) => void |
       undefined` is a handler returning `void | undefined`, which changes
       nothing about whether the prop may be passed `undefined` and is an error
       nowhere, so the bug would be silent. */
    const widened = scene('type A = {\n  onClick?: (e: Event) => void;\n};\n')
    expect(widened).toContain('onClick?: ((e: Event) => void) | undefined;')
  })

  test('reads a type that spans lines to its own semicolon', () => {
    const widened = scene(
      'type A = {\n  "onhelix-open"?: (\n    e: HelixOpenEvent,\n  ) => void;\n  name?: string;\n};\n',
    )
    expect(widened).toContain('  ) => void) | undefined;')
    expect(widened).toContain('name?: (string) | undefined;')
  })

  test('counts the braces of an object type, whose semicolons are not the end', () => {
    const widened = scene('type A = {\n  data?: { a: string; b: number };\n};\n')
    expect(widened).toContain('data?: ({ a: string; b: number }) | undefined;')
  })

  test('leaves a semicolon inside a string literal type alone', () => {
    const widened = scene('type A = {\n  sep?: "a;b";\n};\n')
    expect(widened).toContain('sep?: ("a;b") | undefined;')
  })

  test('never pairs angle brackets, because an arrow would close them', () => {
    /* `=>` holds a `>`, so a scanner counting `<>` closes every generic it walks
       past and then reads the wrong semicolon. A `;` cannot appear in a type
       argument list, so they are not counted at all. */
    const widened = scene('type A = {\n  map?: Record<string, () => void>;\n};\n')
    expect(widened).toContain('map?: (Record<string, () => void>) | undefined;')
  })

  test('leaves a type that already admits undefined', () => {
    const source = 'type A = {\n  label?: string | undefined;\n};\n'
    expect(scene(source)).toBe(source)
  })

  test('leaves any and unknown, which already hold it', () => {
    const source = 'type A = {\n  children?: any;\n  other?: unknown;\n};\n'
    expect(scene(source)).toBe(source)
  })

  test('rewrites vue.d.ts on the same pass', () => {
    expect(scene('type A = {\n  open?: boolean;\n};\n', 'vue.d.ts')).toContain(
      'open?: (boolean) | undefined;',
    )
  })

  test('says nothing about a package that generated no types', () => {
    const dir = mkdtempSync(join(tmpdir(), 'jsx-optional-'))
    const was = process.cwd()
    process.chdir(dir)
    try {
      expect(() => jsxOptionalUndefined().packageLinkPhase?.({} as never)).not.toThrow()
    } finally {
      process.chdir(was)
      rmSync(dir, { force: true, recursive: true })
    }
  })
})

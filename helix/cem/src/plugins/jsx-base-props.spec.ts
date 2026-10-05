import { describe, expect, test } from 'bun:test'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { jsxBaseProps } from './jsx-base-props.js'

/** The plugin rewrites a file the generator wrote, so the test writes one. */
const scene = (source: string): string => {
  const dir = mkdtempSync(join(tmpdir(), 'jsx-base-props-'))
  writeFileSync(join(dir, 'jsx.d.ts'), source)
  const was = process.cwd()
  process.chdir(dir)
  try {
    jsxBaseProps().packageLinkPhase?.({ customElementsManifest: {} } as never)
    return readFileSync(join(dir, 'jsx.d.ts'), 'utf8')
  } finally {
    process.chdir(was)
    rmSync(dir, { force: true, recursive: true })
  }
}

/** The lines `@wc-toolkit/jsx-types` writes, as it writes them. */
const GENERATED = `type BaseProps<T extends HTMLElement> = {
  /** Prop for setting inline styles */
  style?: Record<string, string | number>;
  popovertarget?: "top" | "bottom" | "left" | "right" | "auto";
};

type BaseEvents = {
  /** Fired when a key is pressed down. */
  onKeyDown?: (event: KeyboardEvent) => void;
  /** Fired when a key is released.. */
  onKeyUp?: (event: KeyboardEvent) => void;
  /** Fired when a key is pressed down. */
  onKeyPressed?: (event: KeyboardEvent) => void;
};

/**
 * - \`--dialog-padding\`: The space inside the dialog. (default: \`undefined\`)
 */
`

describe('what the generator writes on every tag', () => {
  test('popovertarget takes the id of a popover', () => {
    expect(scene(GENERATED)).toContain('  popovertarget?: string;')
  })

  test('a handler for an event that does not exist is gone, and the rest stay', () => {
    const next = scene(GENERATED)
    expect(next).not.toContain('onKeyPressed')
    expect(next).toContain('onKeyDown?: (event: KeyboardEvent) => void;')
    expect(next).toContain('onKeyUp?: (event: KeyboardEvent) => void;')
  })

  /* `style={{ colr: 'red' }}` compiled, and the custom properties this file
     adds to React's type never reached a Helix tag. */
  test('style is React’s, which knows the custom properties', () => {
    expect(scene(GENERATED)).toContain("  style?: import('react').CSSProperties;")
  })

  test('a custom property says nothing about a default it does not know', () => {
    expect(scene(GENERATED)).toContain('The space inside the dialog.\n')
  })

  test('writes the same bytes when run again', () => {
    const once = scene(GENERATED)
    expect(scene(once)).toBe(once)
  })
})

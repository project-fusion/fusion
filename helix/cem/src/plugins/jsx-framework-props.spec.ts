import { describe, expect, test } from 'bun:test'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { jsxFrameworkProps } from './jsx-framework-props.js'

/** The plugin rewrites a file the generator wrote, so the test writes one. */
const scene = (source: string): string => {
  const dir = mkdtempSync(join(tmpdir(), 'jsx-framework-props-'))
  writeFileSync(join(dir, 'jsx.d.ts'), source)
  const was = process.cwd()
  process.chdir(dir)
  try {
    jsxFrameworkProps().packageLinkPhase?.({ customElementsManifest: {} } as never)
    return readFileSync(join(dir, 'jsx.d.ts'), 'utf8')
  } finally {
    process.chdir(was)
    rmSync(dir, { force: true, recursive: true })
  }
}

/** The lines `@wc-toolkit/jsx-types` writes, as it writes them. */
const GENERATED = `type BaseProps<T extends HTMLElement> = {
  /** Content added between the opening and closing tags of the element */
  children?: any;
  /** A unique identifier for the element. */
  id?: string;
  /** Use the ref attribute with a variable to assign a DOM element to the variable once the element is rendered. */
  ref?: T | ((e: T) => void);
  /** Adds a reference for a custom element slot */
  slot?: string;
  /** Prop for setting inline styles */
  style?: Record<string, string | number>;
};

export type CustomElements = {
  "helix-button": Partial<
    HelixButtonProps & BaseProps<HelixButton> & BaseEvents<HelixButton>
  >;
  "helix-input": Partial<HelixInputProps & BaseProps<HelixInput> & BaseEvents<HelixInput>>;
};

export type CustomElementsSolidJs = {
  "helix-input": Partial<HelixInputProps & BaseProps<HelixInput> & BaseEvents<HelixInput>>;
};

declare module "react" {
  namespace JSX {
    interface IntrinsicElements extends CustomElements {}
  }
  export interface CSSProperties extends CustomCssProperties {}
}

declare module "react/jsx-runtime" {
  namespace JSX {
    interface IntrinsicElements extends CustomElements {}
  }
}

declare module "react/jsx-dev-runtime" {
  namespace JSX {
    interface IntrinsicElements extends CustomElements {}
  }
}

declare module "preact" {
  namespace JSX {
    interface IntrinsicElements extends CustomElements {}
  }
}

declare module "solid-js" {
  namespace JSX {
    interface IntrinsicElements extends CustomElementsSolidJs {}
  }
  export interface CSSProperties extends CustomCssProperties {}
}

declare global {
  namespace JSX {
    interface IntrinsicElements extends CustomElements {}
  }
}
`

/** The text of the shared props, from their head to the end of the block. */
const shared = (source: string): string => {
  const head = source.indexOf('type BaseProps<')
  return source.slice(head, source.indexOf('\n};', head))
}

describe('ref and style in each framework', () => {
  /* Read into every tag, React's types failed a Svelte or Preact project
     without `@types/react`, and typed `ref` and `style` as `any` there. */
  test('the props every tag shares import no framework, and take it as a parameter', () => {
    const written = shared(scene(GENERATED))
    expect(written).not.toContain('import(')
    expect(written).toContain(
      'type BaseProps<T extends HTMLElement, F extends Framework = "other"> = {',
    )
    expect(written).toContain('  ref?: FrameworkRef<T, F>;')
    expect(written).toContain('  style?: FrameworkStyle<F>;')
    expect(written).toContain('  suppressHydrationWarning?: F extends "react" ? boolean : never;')
    expect(written).toContain('  id?: string;')
    expect(written).toContain('  slot?: string;')
  })

  test('React and Preact each read the map with their own name', () => {
    const written = scene(GENERATED)
    for (const module of ['react', 'react/jsx-runtime', 'react/jsx-dev-runtime']) {
      expect(written).toContain(
        `declare module "${module}" {\n  namespace JSX {\n    interface IntrinsicElements extends CustomElements<"react"> {}`,
      )
    }
    expect(written).toContain(
      'declare module "preact" {\n  namespace JSX {\n    interface IntrinsicElements extends CustomElements<"preact"> {}',
    )
  })

  /* `jsxImportSource: "solid-js"` reads the namespace `solid-js/jsx-runtime`
     declares. The generator's augmentation of `solid-js` reached it only in a
     program where another file imports `solid-js`. */
  test('Solid reads its map where its JSX is declared, and where it is re-exported', () => {
    const written = scene(GENERATED)
    expect(written).toContain(
      'declare module "solid-js" {\n  namespace JSX {\n    interface IntrinsicElements extends CustomElementsSolidJs {}\n  }\n  export interface CSSProperties extends CustomCssProperties {}\n}\n\ndeclare module "solid-js/jsx-runtime" {\n  namespace JSX {\n    interface IntrinsicElements extends CustomElementsSolidJs {}\n  }\n}\n\ndeclare global {',
    )
  })

  test('every other framework reads the map with the generator’s shapes', () => {
    const written = scene(GENERATED)
    expect(written).toMatch(
      /declare global \{\n {2}namespace JSX \{\n {4}interface IntrinsicElements extends CustomElements \{\}/,
    )
    expect(written).toContain('    : T | ((e: T) => void);')
    expect(written).toContain('    : Record<string, string | number>;')
  })

  test('each tag entry passes the framework to its shared props, in the map React reads', () => {
    const written = scene(GENERATED)
    expect(written).toContain('export type CustomElements<F extends Framework = "other"> = {')
    expect(written).toContain(
      'HelixButtonProps & BaseProps<HelixButton, F> & BaseEvents<HelixButton>',
    )
    expect(written).toContain('HelixInputProps & BaseProps<HelixInput, F> & BaseEvents<HelixInput>')
    expect(written).toContain(
      'export type CustomElementsSolidJs = {\n  "helix-input": Partial<HelixInputProps & BaseProps<HelixInput, "solid"> & BaseEvents<HelixInput>>;',
    )
  })

  test("React's types on React's branch, Preact's on Preact's, and Solid's on Solid's", () => {
    const written = scene(GENERATED)
    const ref = written.slice(
      written.indexOf('type FrameworkRef<'),
      written.indexOf('type FrameworkStyle<'),
    )
    expect(ref).toMatch(
      /F extends "react"\n {2}\? \/\/ @ts-ignore: [^\n]*\n {4}import\('react'\)\.Ref<T>\n/,
    )
    expect(ref).toMatch(
      /F extends "preact"\n {4}\? \/\/ @ts-ignore: [^\n]*\n {6}import\('preact'\)\.Ref<T>\n/,
    )
    const style = written.slice(written.indexOf('type FrameworkStyle<'))
    expect(style).toMatch(
      /F extends "react"\n {2}\? \/\/ @ts-ignore: [^\n]*\n {4}import\('react'\)\.CSSProperties\n/,
    )
    expect(style).toContain('import(\'preact\').JSX.IntrinsicElements["div"]["style"]')
    expect(style).toMatch(
      /F extends "solid"\n {6}\? \/\/ @ts-ignore: [^\n]*\n {8}import\('solid-js'\)\.JSX\.IntrinsicElements\["div"\]\["style"\]\n/,
    )
  })

  /* A reference to a module the project does not install is an error in any
     file it loads, under `skipLibCheck: false`, and every framework loads this
     one. */
  test('every import of a framework is on the line after a comment that ignores its error', () => {
    const lines = scene(GENERATED).split('\n')
    const imports = lines.flatMap((line, at) => (/^\s*import\(/.test(line) ? [at] : []))
    expect(imports).toHaveLength(5)
    expect(lines.filter((line) => line.includes('import('))).toHaveLength(5)
    for (const at of imports) {
      expect(lines[at - 1]).toMatch(/\/\/ @ts-ignore: /)
    }
  })

  test('writes the same bytes when run again', () => {
    const once = scene(GENERATED)
    expect(scene(once)).toBe(once)
  })
})

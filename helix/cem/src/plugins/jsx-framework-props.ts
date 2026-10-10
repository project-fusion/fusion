import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Plugin } from '../types.js'

/** The head of the props every tag shares, as the generator writes it. */
const BASE_PROPS = 'type BaseProps<T extends HTMLElement> = {'

/** The first of those props, which is where React's own is inserted. */
const BASE_PROPS_FIRST =
  /^(\s*)\/\*\* Content added between the opening and closing tags of the element \*\/$/m

/** The generator's `ref`, which takes Solid's ref and neither React's nor Preact's. */
const GENERATED_REF = /^(\s*)ref\?: T \| \(\(e: T\) => void\);$/m

/** The generator's inline style, which accepts any key. */
const GENERATED_STYLE = /^(\s*)style\?: Record<string, string \| number>;$/m

/** The tag map React's and Preact's JSX read, as the generator heads it. */
const MAP_HEAD = 'export type CustomElements = {'

/** The tag map Solid's JSX reads, with its `prop:`, `attr:`, and `on:` entries. */
const SOLID_MAP_HEAD = 'export type CustomElementsSolidJs = {'

/** A tag entry's shared props, which name the element class. */
const ENTRY = /\bBaseProps<([A-Za-z0-9_]+)>/g

/** A module whose JSX reads the tag map, and the line that points it there. */
const BLOCK =
  /(declare module (['"])(react|react\/jsx-runtime|react\/jsx-dev-runtime|preact)\2 \{\n[ \t]*namespace JSX \{\n[ \t]*interface IntrinsicElements extends CustomElements) \{\}/g

/** The generator's augmentation of `solid-js`, to the line that closes it. */
const SOLID_BLOCK = /^declare module (['"])solid-js\1 \{\n[\s\S]*?\n\}\n/m

/** Solid's JSX where it is declared, which `jsxImportSource: "solid-js"` reads. */
const SOLID_RUNTIME_BLOCK = `
declare module "solid-js/jsx-runtime" {
  namespace JSX {
    interface IntrinsicElements extends CustomElementsSolidJs {}
  }
}
`

/**
 * Solid's JSX without its compiler, which `jsxImportSource: "solid-js/h"`
 * reads, and the tag map it reads there.
 *
 * The comment above each type is the explanation a reader of the typings
 * gets, so it says what `h` does with a function.
 */
const SOLID_H_BLOCK = `
/**
 * A prop as Solid's JSX takes it without the compiler, with
 * \`jsxImportSource: "solid-js/h"\`. \`h\` calls a function given to a prop for
 * the prop's value, and calls it again when a signal it read changes, so each
 * prop takes its value or a function that returns it. \`ref\`, \`children\`, and
 * the props named \`on…\` are taken as they are, as \`h\` takes them. A property
 * whose value is a function takes only a function that returns it, because
 * \`h\` calls any function it is given. A prop typed \`any\` stays \`any\`.
 */
type SolidHProp<K, V> = K extends "children" | "ref" | \`on\${string}\`
  ? V
  : 0 extends 1 & V
    ? V
    : [Exclude<V, undefined>] extends [(...args: never[]) => unknown]
      ? (() => V) | undefined
      : V | (() => V);

/** One tag's props as Solid's JSX takes them without the compiler. */
type SolidHProps<P> = { [K in keyof P]: SolidHProp<K, P[K]> };

/** The tag map Solid's JSX reads without the compiler: \`CustomElementsSolidJs\`, each prop as \`SolidHProp\` takes it. */
export type CustomElementsSolidH = {
  [Tag in keyof CustomElementsSolidJs]: SolidHProps<CustomElementsSolidJs[Tag]>;
};

declare module "solid-js/h/jsx-runtime" {
  namespace JSX {
    interface IntrinsicElements extends CustomElementsSolidH {}
  }
}
`

/**
 * The type parameter that names the framework, and `ref` and `style` in each.
 *
 * The comment above each `import()` is the one this plugin exists to place,
 * and the file explains it where a reader of the typings will look.
 */
const FRAMEWORK_TYPES = `/**
 * The JSX a tag is written in. React, Preact, and Solid each read a tag map
 * with their own name, and every other framework reads it as \`"other"\`.
 *
 * **Each framework's types are imported only on its own branch below.** Every
 * framework loads this file, the Svelte typings included, and a project has
 * only its own framework's types installed. A reference to a module that is
 * not installed is an error in any file the program loads, under
 * \`skipLibCheck: false\`, so the comment above each import keeps a project
 * without that module compiling. Where the module is installed, the import
 * resolves as written.
 */
type Framework = "other" | "preact" | "react" | "solid";

/**
 * \`ref\` as each framework types it, and the generator's shape for the rest,
 * which is Solid's own.
 */
type FrameworkRef<T extends HTMLElement, F extends Framework> = F extends "react"
  ? // @ts-ignore: React's types, read only by React's JSX.
    import('react').Ref<T>
  : F extends "preact"
    ? // @ts-ignore: Preact's types, read only by Preact's JSX.
      import('preact').Ref<T>
    : T | ((e: T) => void);

/** \`style\` as each framework types it on a \`<div>\`, and any object for the rest. */
type FrameworkStyle<F extends Framework> = F extends "react"
  ? // @ts-ignore: React's types, read only by React's JSX.
    import('react').CSSProperties
  : F extends "preact"
    ? // @ts-ignore: Preact's types, read only by Preact's JSX.
      import('preact').JSX.IntrinsicElements["div"]["style"]
    : F extends "solid"
      ? // @ts-ignore: Solid's types, read only by Solid's JSX.
        import('solid-js').JSX.IntrinsicElements["div"]["style"]
      : Record<string, string | number>;

`

export interface JsxFrameworkPropsOptions {
  /** File the JSX generator wrote, relative to the package root. */
  fileName?: string
}

/**
 * Types `ref` and `style` on every tag as the framework it is written in
 * types them.
 *
 * `@wc-toolkit/jsx-types` writes one tag map for every JSX framework, and its
 * `ref?: T | ((e: T) => void)` fits neither React nor Preact. React's `ref` is
 * `Ref<T>`, and the usual way to get one is `useRef<T>(null)`, whose type is
 * `RefObject<T | null>`. That is assignable to neither half of the generated
 * union, so **the most common way to hold a ref was a type error**, in React
 * and in Preact alike. Its `style` accepts any key, so `style={{ colr: 'red' }}`
 * compiled, and the `CustomCssProperties` the file adds to React's
 * `CSSProperties` never reached a Helix tag.
 *
 * **Each framework's own types, and only in that framework's JSX.** Writing
 * React's types into the props every tag shares made every other framework
 * read them: a Svelte or Preact project without `@types/react` failed on
 * `Cannot find module 'react'` under `skipLibCheck: false`, and read `ref` and
 * `style` as `any` with it on. So the shared props take the framework as a
 * type parameter. `CustomElements<"react">` types `ref` and `style` with
 * React's `Ref` and `CSSProperties`, and `CustomElements<"preact">` with
 * Preact's `Ref` and the style a `<div>` takes there, which may be a string.
 * `CustomElementsSolidJs` takes Solid's style the same way, and its `ref` is
 * the generator's, which is Solid's own. Every other framework reads
 * `CustomElements` with the generator's shapes.
 *
 * **Solid's JSX is also augmented where it is declared.** The generator
 * augments `solid-js`, whose `JSX` is a re-export, and that reaches the
 * compiler's JSX only in a program where some file imports `solid-js`. So this
 * adds the same augmentation of `solid-js/jsx-runtime`, which is the module
 * `jsxImportSource: "solid-js"` reads, and keeps the generator's for code that
 * reads `JSX` from `solid-js`.
 *
 * **And Solid's JSX without the compiler.** `jsxImportSource: "solid-js/h"`
 * reads the `JSX` of `solid-js/h/jsx-runtime`, a namespace of its own, so the
 * augmentations above never reached it and every Helix tag there was unknown.
 * `h` reads a function given to a prop as the prop's value, so its map,
 * `CustomElementsSolidH`, is Solid's with each prop also taking a function
 * that returns it. `ref`, `children`, and the props named `on…` are left as
 * they are, which is the test `h` itself makes, and a property whose value is
 * a function takes only a function that returns it: `h` calls whatever
 * function it is given, so a bare `formatter={format}` would be called with
 * no arguments and its result assigned.
 *
 * **A type on each prop, so `BaseProps` stays one object type.** Error
 * messages name it, `BaseProps<HelixButton, "react">`, where an intersection
 * with the framework's props was flattened into every message.
 *
 * `suppressHydrationWarning` is React's, and `never` everywhere else. A custom
 * element writes its own state attributes the moment it upgrades: a listbox
 * marks its current option with `data-active`, and registration can beat
 * React to the subtree, so hydration finds an attribute in the DOM that its
 * own render never produced and logs a mismatch it cannot patch up. React's
 * answer is this prop.
 *
 * `allowUnknownProps` on the generator would also silence these, and would
 * silence every typo alongside them. These types exist so
 * `appearance="wrong"` fails, so the missing props are named one at a time
 * instead.
 *
 * Runs after `jsxNativeEvents`, whose rewrite of each tag entry reads
 * `BaseProps<T>` as the generator wrote it, and before `jsxOptionalUndefined`,
 * so the props written here get the same `| undefined` as the rest.
 */
export const jsxFrameworkProps = ({
  fileName = 'jsx.d.ts',
}: JsxFrameworkPropsOptions = {}): Plugin => ({
  name: 'helix-jsx-framework-props',
  packageLinkPhase() {
    const path = join(process.cwd(), fileName)

    let source: string
    try {
      source = readFileSync(path, 'utf8')
    } catch {
      // No JSX types for this package, which is the normal case for one that
      // ships no elements.
      return
    }

    const head = source.indexOf(BASE_PROPS)
    const map = source.indexOf(MAP_HEAD)
    if (head === -1 || map === -1) {
      return
    }
    const tail = source.indexOf('\n};', head)
    const shared = source.slice(head, tail)
    if (!GENERATED_REF.test(shared) || !GENERATED_STYLE.test(shared)) {
      return
    }

    const props = shared
      .replace(
        BASE_PROPS,
        'type BaseProps<T extends HTMLElement, F extends Framework = "other"> = {',
      )
      .replace(
        BASE_PROPS_FIRST,
        '$1/** Skips the hydration check for an element whose DOM is written by something other than React, which a custom element writing its own state attributes is. React takes it, and no other framework does. */\n$1suppressHydrationWarning?: F extends "react" ? boolean : never;\n$1/** Content added between the opening and closing tags of the element */',
      )
      .replace(GENERATED_REF, '$1ref?: FrameworkRef<T, F>;')
      .replace(GENERATED_STYLE, '$1style?: FrameworkStyle<F>;')

    const mapTail = source.indexOf('\n};', map)
    const tags = source.slice(map + MAP_HEAD.length, mapTail).replace(ENTRY, 'BaseProps<$1, F>')

    /* Solid's map follows the shared one, and its entries take Solid's
       props by name. */
    let rest = source.slice(mapTail)
    const solid = rest.indexOf(SOLID_MAP_HEAD)
    if (solid !== -1) {
      const solidTail = rest.indexOf('\n};', solid)
      rest =
        rest.slice(0, solid) +
        rest.slice(solid, solidTail).replace(ENTRY, 'BaseProps<$1, "solid">') +
        rest.slice(solidTail)
    }
    rest = rest
      .replace(BLOCK, (_, line: string, _quote: string, module: string) => {
        const framework = module === 'preact' ? 'preact' : 'react'
        return `${line}<"${framework}"> {}`
      })
      .replace(SOLID_BLOCK, (block) => `${block}${SOLID_RUNTIME_BLOCK}${SOLID_H_BLOCK}`)

    const next =
      source.slice(0, head) +
      FRAMEWORK_TYPES +
      props +
      source.slice(tail, map) +
      'export type CustomElements<F extends Framework = "other"> = {' +
      tags +
      rest

    writeFileSync(path, next)
  },
})

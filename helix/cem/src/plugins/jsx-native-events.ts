import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Plugin } from '../types.js'

/** The generator's shared handler bag, which knows nothing about the element. */
const BASE_EVENTS = /^type BaseEvents = \{$/m

/** A handler inside it, whatever event type it takes. */
const HANDLER = /^(\s*)(on[A-Za-z]+)\?: \(event: ([A-Za-z]+)\) => void;$/gm

/** A tag entry, which already names its element in `BaseProps`. */
const TAG_ENTRY = /BaseProps<([A-Za-z0-9_]+)> &(\s*)BaseEvents/g

export interface JsxNativeEventsOptions {
  /** File the JSX generator wrote, relative to the package root. */
  fileName?: string
}

/**
 * Types `currentTarget` on a native handler as the element it is written on.
 *
 * **The path this library recommends had the worse types, which is the whole
 * reason this exists.** A consumer mirroring a value writes `onChange` and
 * reads `event.currentTarget.value`, and that is a type error: the generator
 * ships one `BaseEvents` for every tag and types each handler as taking a bare
 * `Event`, so `currentTarget` is `EventTarget` or null. The prefixed events
 * have no such problem, being emitted per element with a typed detail. So the
 * ergonomic half of 294 cost a consumer a cast and the advanced half did not,
 * which is exactly backwards. See 300.
 *
 * `@wc-toolkit/jsx-types` cannot do better and is not wrong to: it emits one
 * shared bag because it has no idea which element a handler will be written on.
 * The manifest does, and `BaseProps<T>` beside it already names the element,
 * which is what makes this a rewrite rather than a table to keep.
 *
 * **Generic rather than per-component, which was the first shape tried.**
 * Emitting an override for each native event a component declares needs the
 * declarations read, kept in step, and intersected with the shared bag, and an
 * intersection of two handler types is an overload rather than a replacement:
 * the prop goes on accepting both signatures and infers neither. Making
 * `BaseEvents` generic replaces the type outright, needs no list, and is right
 * for every native handler rather than the six a component happens to send:
 * `currentTarget` on any event dispatched at an element *is* that element,
 * whatever the event is called.
 *
 * The same reasoning as `helix-jsx-react-ref`, one prop over: these types exist
 * for consumers writing JSX, so they should describe what a consumer writes.
 *
 * Runs after the generator, so list it after `jsxTypesPlugin`.
 */
export const jsxNativeEvents = ({
  fileName = 'jsx.d.ts',
}: JsxNativeEventsOptions = {}): Plugin => ({
  name: 'helix-jsx-native-events',
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

    if (!BASE_EVENTS.test(source) || source.includes('type BaseEvents<')) {
      return
    }

    const head = source.indexOf('type BaseEvents = {')
    const tail = source.indexOf('\n};', head)
    const bag = source.slice(head, tail)

    /* `HTMLElement` by default, so anything the rewrite below misses keeps
       working rather than failing to resolve a parameter. */
    const typed = bag
      .replace('type BaseEvents = {', 'type BaseEvents<T = HTMLElement> = {')
      .replace(HANDLER, '$1$2?: (event: $3 & { currentTarget: T }) => void;')

    const next = (source.slice(0, head) + typed + source.slice(tail)).replace(
      TAG_ENTRY,
      'BaseProps<$1> &$2BaseEvents<$1>',
    )

    writeFileSync(path, next)
  },
})

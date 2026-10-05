import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { HelixManifest, Plugin } from '../types.js'

/** The generator's shared handler bag, after `jsxNativeEvents` made it generic. */
const BASE_EVENTS = 'type BaseEvents<T = HTMLElement> = {'

/** A handler already in it, whatever event type it takes. */
const DECLARED = /^\s*(on[A-Za-z]+)\?:/gm

export interface JsxDeclaredEventsOptions {
  /** File the JSX generator wrote, relative to the package root. */
  fileName?: string
}

/** A platform event class, which every consumer has from lib.dom and nobody imports. */
const PLATFORM = /^(?!Helix)[A-Z][A-Za-z]*Event$/

/**
 * The type a handler in the shared bag takes, from what the manifest declares.
 *
 * **The one type every element agrees on, where it is the platform's.** The
 * bag is shared by every tag, so a `toggle` declared as a `ToggleEvent` by
 * every element that sends it types `onToggle` as one, and `event.newState`
 * compiles. Elements that disagree fall back to `Event`, and so does a type of
 * this package's own, because `jsxImports` has already run and would not
 * import it.
 */
const platformType = (types: Set<string> | undefined): string => {
  const [only] = types ?? []
  return types?.size === 1 && only !== undefined && PLATFORM.test(only) ? only : 'Event'
}

/** `toggle` to `onToggle`, and `dragend` to `onDragend`, which is what React reads. */
const handlerName = (event: string): string => `on${event.charAt(0).toUpperCase()}${event.slice(1)}`

/**
 * Adds a handler for every native-named event the manifest declares.
 *
 * **The generator ships a fixed bag of DOM events and the manifest is the
 * authority on what an element sends.** `@wc-toolkit/jsx-types` emits 38
 * handlers from its own list of standard events, and five of the nine
 * non-prefixed events these elements declare are not in it: `toggle` on sixteen
 * popover-backed families, `close` on Dialog and Drawer, and `play`, `pause` and
 * `ended` on Video. So a React consumer writing `onToggle` on `helix-dialog`
 * gets a type error for an event the manifest publishes, while `onChange`
 * beside it is fine because that one happens to be on the list.
 *
 * **Only the ones missing, and never a replacement.** A handler the generator
 * already emits carries its real event type, `MouseEvent` for `onClick` and
 * `KeyboardEvent` for `onKeyDown`, which is better than anything this could
 * reconstruct: the manifest records these five as `Event` and nothing more. So
 * the bag is read first and an entry is added only where there is none.
 *
 * **Prefixed events are not this plugin's business.** `helix-*` events are
 * emitted per element with a typed detail, which is the half of the surface
 * that already worked, and they are bound with `onhelix-*` rather than through
 * this bag.
 *
 * Runs after `jsxNativeEvents`, which is what makes `BaseEvents` generic, so
 * the handlers written here can name `T` directly. It runs before
 * `jsxOptionalUndefined`, so the `| undefined` every other entry carries is
 * added to these by the same pass rather than by hand.
 */
export const jsxDeclaredEvents = ({
  fileName = 'jsx.d.ts',
}: JsxDeclaredEventsOptions = {}): Plugin => ({
  name: 'helix-jsx-declared-events',
  packageLinkPhase({ customElementsManifest }) {
    const path = join(process.cwd(), fileName)

    let source: string
    try {
      source = readFileSync(path, 'utf8')
    } catch {
      // No JSX types for this package, which is the normal case for one that
      // ships no elements.
      return
    }

    const head = source.indexOf(BASE_EVENTS)
    if (head === -1) {
      return
    }
    const tail = source.indexOf('\n};', head)

    /* Every event name the manifest declares that is not one of ours. A
       prefixed name cannot be a handler in this bag: `onhelix-input` is not an
       identifier, and those are typed per element elsewhere. */
    const declared = new Map<string, Set<string>>()
    for (const module of (customElementsManifest as HelixManifest).modules ?? []) {
      for (const declaration of module.declarations ?? []) {
        for (const event of declaration.events ?? []) {
          if (event.name && !event.name.startsWith('helix-')) {
            const types = declared.get(event.name) ?? new Set<string>()
            types.add(event.type?.text ?? 'Event')
            declared.set(event.name, types)
          }
        }
      }
    }

    const bag = source.slice(head, tail)
    const present = new Set([...bag.matchAll(DECLARED)].map((match) => match[1]))
    const missing = [...declared.keys()].filter((event) => !present.has(handlerName(event))).sort()

    if (missing.length === 0) {
      return
    }

    const added = missing
      .map(
        (event) =>
          `\n  /** Declared by an element in this package's manifest. */\n` +
          `  ${handlerName(event)}?: (event: ${platformType(declared.get(event))} & { currentTarget: T }) => void;`,
      )
      .join('')

    const block = `\n\n  // Declared by an element rather than by the generator's own list.${added}`
    writeFileSync(path, source.slice(0, tail) + block + source.slice(tail))
  },
})

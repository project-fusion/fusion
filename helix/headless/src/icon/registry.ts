import type { HelixIcon } from '@fusion.dev/helix-icons'

/*
 * Finds a glyph for a name: one a page registered, or one a library it named
 * resolves.
 *
 * **Why there is a registry at all.** A name is a string, so resolving one
 * needs a table of glyphs, and a table of the whole set is a module no bundler
 * can shake. The family's own entry registers the whole set, so a name works
 * with nothing else written. The element's own module registers none, so a
 * page that imports it and registers the glyphs it uses ships those glyphs
 * and no others, and names still resolve.
 *
 * **A library resolves names under a prefix**, as Web Awesome's
 * `registerIconLibrary` does: `lucide:camera` asks the `lucide` library for
 * `camera`, and the answer may arrive later.
 *
 * Kept on `globalThis` rather than in this module, because a page can carry two
 * bundles of this module, one per family that imports it, and a glyph
 * registered through one has to resolve through the other.
 */

/** What a library gives for a name: a glyph, a glyph later, or nothing. */
export type IconResolver = (name: string) => HelixIcon | Promise<HelixIcon | undefined> | undefined

interface Registry {
  /** What each library gave for a written name, so a name asks once. */
  answers: Map<string, HelixIcon | Promise<HelixIcon | undefined> | undefined>
  glyphs: Map<string, HelixIcon>
  libraries: Map<string, IconResolver>
  watchers: Set<() => void>
}

const KEY = Symbol.for('helix.icon-registry')

/** Tells every watcher that a name may now resolve to something else. */
const changed = (held: Registry): void => {
  for (const watcher of held.watchers) {
    watcher()
  }
}

const registry = (): Registry => {
  const held = globalThis as unknown as Record<symbol, Registry | undefined>
  let found = held[KEY]
  if (!found) {
    found = { answers: new Map(), glyphs: new Map(), libraries: new Map(), watchers: new Set() }
    held[KEY] = found
  }
  return found
}

/**
 * Makes glyphs resolvable by name: a record of names to glyphs, such as the
 * whole set, or a list of glyphs, each under its own `name`.
 *
 * A name registered again takes the newer glyph.
 */
export const registerIcons = (glyphs: Record<string, HelixIcon> | readonly HelixIcon[]): void => {
  const held = registry()
  const into = held.glyphs
  const entries: Array<[string, HelixIcon]> = Array.isArray(glyphs)
    ? glyphs.map((glyph: HelixIcon) => [glyph.name, glyph])
    : Object.entries(glyphs)
  for (const [name, glyph] of entries) {
    into.set(name, glyph)
  }
  changed(held)
}

/**
 * Resolves names written `prefix:name` through a library of your own, such as
 * another icon set or glyphs fetched from a server.
 *
 * The resolver may answer at once or with a promise; an element waiting on a
 * promise draws the glyph when it arrives and fires `load`. Each written name
 * is asked once, and a prefix registered again is asked afresh.
 */
export const registerIconLibrary = (prefix: string, resolve: IconResolver): void => {
  const held = registry()
  held.libraries.set(prefix, resolve)
  for (const name of held.answers.keys()) {
    if (name.startsWith(`${prefix}:`)) {
      held.answers.delete(name)
    }
  }
  changed(held)
}

/**
 * Calls `watcher` whenever a glyph or a library is registered, so an element
 * drawn before its glyph was registered can look again. Returns the function
 * that stops it.
 */
export const watchIcons = (watcher: () => void): (() => void) => {
  const held = registry()
  held.watchers.add(watcher)
  return () => {
    held.watchers.delete(watcher)
  }
}

/** The registered glyph of this name, or `undefined`. */
export const registeredIcon = (name: string): HelixIcon | undefined => registry().glyphs.get(name)

/**
 * The glyph for a name: a registered one at once, or what the library its
 * prefix names gives, which may be a promise. `undefined` where nothing
 * answers.
 *
 * A registered name wins over a library, so a page can override one glyph of
 * a library by registering it under the same written name. A library that
 * fails answers nothing.
 */
export const resolveIcon = (
  name: string,
): HelixIcon | Promise<HelixIcon | undefined> | undefined => {
  const registered = registeredIcon(name)
  if (registered || name === '') {
    return registered
  }
  const split = name.indexOf(':')
  if (split <= 0) {
    return undefined
  }
  const held = registry()
  if (held.answers.has(name)) {
    return held.answers.get(name)
  }
  const library = held.libraries.get(name.slice(0, split))
  if (!library) {
    return undefined
  }
  const answer = asked(library, name.slice(split + 1))
  if (answer instanceof Promise) {
    const settled = answer.then(
      (glyph) => glyph,
      () => undefined,
    )
    held.answers.set(name, settled)
    void settled.then((glyph) => {
      if (held.answers.get(name) === settled) {
        held.answers.set(name, glyph)
      }
    })
    return settled
  }
  held.answers.set(name, answer)
  return answer
}

/** A library's answer, with a throw read as no answer. */
const asked = (
  library: IconResolver,
  name: string,
): HelixIcon | Promise<HelixIcon | undefined> | undefined => {
  try {
    return library(name)
  } catch {
    return undefined
  }
}

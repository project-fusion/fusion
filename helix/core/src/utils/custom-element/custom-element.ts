/*
 * Registers a custom element, once.
 *
 * A drop-in replacement for Lit's `@customElement` that does not throw when the
 * tag is already registered.
 *
 * The duplicate is not hypothetical. Next.js evaluates a module in both the
 * server and client graphs, so a component imported by a server component and a
 * client component runs its registration twice against one registry, and
 * `customElements.define` throws:
 *
 * > Failed to execute 'define': the name "helix-card" has already been used
 *
 * That failure takes down the whole prerender, and it appears only once an app
 * mixes server and client usage of the same component, which is exactly what a
 * real app does.
 *
 * The analyzer detects `@customElement` **by decorator name**, not by where it
 * is imported from, so the manifest still records `tagName` and nothing
 * downstream changes.
 */

/**
 * Tags already reported, so a page holding duplicates says each one once rather
 * than once per module that tried.
 */
const reported = new Set<string>()

/**
 * The tags this page registered twice, for a reader that is not a person.
 *
 * **The warning below is the right thing and it is not a readable output.** It
 * fires at the moment of the second registration, which is the best possible
 * position and better than anything a later pass can do, and it goes to a
 * console: a CI job cannot see it, and a developer whose console already has
 * forty lines in it will not. `@fusion.dev/helix-diagnostics` reads this instead, so the
 * same fault reaches a structured report without a second detector guessing at
 * it from the outside. Detect once, at the source; surface twice.
 */
const duplicates = new Set<string>()

/** Every tag registered twice by different classes, in registration order. */
export const duplicateRegistrations = (): string[] => [...duplicates]

/**
 * Every tag this decorator has defined, in definition order.
 *
 * **Recorded here because here is the only place that sees all of them once.** A
 * spec wanting "every element this package defines" reached for patching
 * `customElements.define` around an import of the barrel, and that answers
 * correctly only for the first importer in the process: a second import is a
 * module-cache hit and defines nothing, so any spec that touched a component
 * first silently shrank the list. Measured when one did, and what it reported
 * was a floor count, 164 against 250, which names nothing about the cause.
 *
 * Not `registerElementEvents`, which was tried and is a different set: the
 * generated map holds the tags that *dispatch* something, so it came out 68
 * against 90. Definition is the question, so the definition site is the answer.
 */
const defined: string[] = []

/** Every tag registered through `customElement`, whoever imported it first. */
export const definedTags = (): string[] => [...defined]

/**
 * Says so when a second, different class asks for a tag that is already taken.
 *
 * **Returning quietly is right and saying nothing is not.** The registry keeps
 * the first constructor, so on a page carrying two copies of Helix every
 * `<helix-button>` is the first copy's class whatever the second copy exports.
 * Nothing fails: the element renders, behaves, and answers its own API. What
 * breaks is identity, `el instanceof HelixButton` returning `false` against an
 * element that is visibly a button, and a version's fixes being absent from
 * elements the consumer believes are on that version. Both are hours of
 * debugging with no error to search for, which is the worst shape a library
 * failure can take.
 *
 * **Only in a browser, which is the line that keeps this quiet where the guard
 * was written for.** The prerender case above is a server one: Lit's SSR shim
 * provides `customElements` and `document` and leaves `window` undefined, so
 * `typeof window` separates a real page from a render pass exactly. Measured
 * against `@lit-labs/ssr`'s global DOM shim rather than assumed, because a
 * diagnostic that fires during a build is a diagnostic somebody turns off.
 *
 * **Different constructors, not merely a second call.** A module evaluated
 * twice in one graph produces two class objects and is a genuine duplicate; the
 * same class arriving twice through two import specifiers is not, and has
 * nothing to report.
 *
 * No `throw`. The first definition is already live and elements are already
 * upgraded against it, so there is nothing left to refuse and a lot to take
 * down.
 */
const warnDuplicate = (tagName: string): void => {
  if (typeof window === 'undefined' || reported.has(tagName)) {
    return
  }
  reported.add(tagName)
  duplicates.add(tagName)
  console.warn(
    `<${tagName}> is already registered by a different class, so this page holds two copies of ` +
      'Helix. The first one keeps the tag: every element of this name is built from it, whatever ' +
      'the second copy exports, so `instanceof` against the second copy is false and its fixes are ' +
      'not in the DOM. Two dependencies asking for different versions is the usual cause, and a ' +
      'bundler shipping the same version twice is the other. Deduplicate the dependency.',
  )
}

export const customElement =
  (tagName: string) =>
  (target: CustomElementConstructor): void => {
    // Lit SSR shims the registry, but a bare Node context may have none.
    if (typeof customElements === 'undefined') {
      return
    }
    const existing = customElements.get(tagName)
    if (existing) {
      if (existing !== target) {
        warnDuplicate(tagName)
      }
      return
    }
    customElements.define(tagName, target)
    defined.push(tagName)
  }

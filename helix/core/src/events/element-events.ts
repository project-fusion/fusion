/**
 * Which events each tag actually dispatches, for the React prop audit.
 *
 * **The audit could already tell a name from a typo and not a name from a
 * misplacement.** `helixEventNames` is every event the library has, so
 * `onhelix-resize` written on an element that never fires it read as valid: the
 * name is real, and nothing knew that this element is not the one that sends it.
 * That is the likelier mistake of the two, because it happens while writing a
 * *correct* event name.
 *
 * **Registered rather than imported, because the direction of the tiers forbids
 * the other way round.** This lives in `core`, which is below the packages that
 * define elements and cannot name them. Each package ships a generated call
 * instead, so the map is filled by whoever is loaded and a consumer importing
 * one component is checked against that component.
 *
 * A tag nobody registered is not an error. It is a component from outside this
 * library, or a package built before the generator existed, and the audit says
 * nothing rather than guessing.
 */
const declared = new Map<string, ReadonlySet<string>>()

/** Records the events a set of tags dispatch. Called by generated code. */
export const registerElementEvents = (
  entries: Readonly<Record<string, readonly string[]>>,
): void => {
  for (const [tag, names] of Object.entries(entries)) {
    declared.set(tag, new Set(names))
  }
}

/** The events a tag dispatches, or `undefined` if nothing registered it. */
export const eventsForTag = (tag: string): ReadonlySet<string> | undefined => declared.get(tag)

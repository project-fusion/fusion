/** What a host can say about itself. Anything omitted is left alone. */
export interface HostAria {
  /** Elements describing it. Cleared with an empty array. */
  describedBy?: Element[]
  /** The accessible name, as a string. `''` clears it. */
  label?: string
  /** Elements naming it, which beat `label` where both are set. */
  labelledBy?: Element[]
  /** The role, which is what the host is. `''` clears it. */
  role?: string
}

/**
 * Writes a host's semantics onto its `ElementInternals`.
 *
 * Onto internals rather than onto the host, which is the whole point: an
 * attribute written at upgrade is markup a React consumer's server output never
 * had, and hydration reports the difference. Internals carry the same meaning
 * to the accessibility tree and leave the element as the consumer wrote it.
 *
 * **Empty means absent, and that is the trap this exists for.** Assigning `''`
 * to `ariaLabel` is not the same as not naming the element: it is a name of no
 * characters, which a screen reader announces as an unnamed control while every
 * check for "is it labeled" passes. Every caller had written
 * `this.label === '' ? null : this.label` and one of them would eventually not.
 *
 * **Element references are feature-tested rather than assumed.** They are the
 * only way a host in the light DOM can point at a node in its own shadow root,
 * an IDREF cannot cross that boundary, and the plain `element.aria*Elements`
 * reflection drops the reference where `ElementInternals` keeps it. Older
 * engines have neither, and assigning to a property they do not implement is a
 * silent no-op rather than an error, so the guard is what makes the absence
 * visible to anything reading this.
 *
 * Omitted keys are left alone, so a component that sets its role once in
 * `willUpdate` and its references later in `updated` does not have to repeat
 * itself or risk clearing what the other call wrote.
 */
export const hostAria = (internals: ElementInternals, semantics: HostAria): void => {
  if (semantics.role !== undefined) {
    internals.role = semantics.role === '' ? null : semantics.role
  }
  if (semantics.label !== undefined) {
    internals.ariaLabel = semantics.label === '' ? null : semantics.label
  }
  if (semantics.labelledBy !== undefined && 'ariaLabelledByElements' in internals) {
    internals.ariaLabelledByElements = semantics.labelledBy.length > 0 ? semantics.labelledBy : null
  }
  if (semantics.describedBy !== undefined && 'ariaDescribedByElements' in internals) {
    internals.ariaDescribedByElements =
      semantics.describedBy.length > 0 ? semantics.describedBy : null
  }
}

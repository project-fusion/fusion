const HEADING = 'h1, h2, h3, h4, h5, h6, [role="heading"]'

/** What names and describes a stop's panel. */
export interface StopNaming {
  /** The elements that describe the panel, in reading order. */
  describedBy: Element[]
  /** The elements that name the panel, or none where a label names it. */
  labelledBy: Element[]
}

/** Where a stop's words are. */
export interface StopWords {
  /** The elements in the stop's default slot. */
  content: readonly Element[]
  /** The elements in its `description` slot. */
  description: readonly Element[]
  /** The elements in its `heading` slot. */
  heading: readonly Element[]
  /** Whether the stop has a `label` of its own. */
  labeled: boolean
  /** The element that says the stop's place in the tour, such as "2 of 5". */
  progress: Element | null
}

/**
 * What names a tour stop's panel and what describes it.
 *
 * Named by the `heading` slot, then by the first heading in the content, then
 * by the stop's own `label`, and where there is none of those, by its place in
 * the tour, so no stop is an unnamed group. Described by the `description`
 * slot and by its place, which is how a screen reader hears where it is as
 * focus moves from one stop to the next.
 */
export const stopNaming = ({
  content,
  description,
  heading,
  labeled,
  progress,
}: StopWords): StopNaming => {
  const found =
    heading.length > 0
      ? [...heading]
      : content
          .flatMap((one) => (one.matches(HEADING) ? [one] : [...one.querySelectorAll(HEADING)]))
          .slice(0, 1)
  const place = progress ? [progress] : []
  if (found.length === 0 && !labeled) {
    return { describedBy: [...description], labelledBy: place }
  }
  return { describedBy: [...description, ...place], labelledBy: found }
}

import { headingIn } from '@fusion.dev/helix-core'
import { wordsAmong } from '../dialog/description.js'

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
  /**
   * The region that holds the content, given where the content holds words
   * with no element around them, which then describes the panel.
   */
  loose?: Element | null
  /** The element that says the stop's place in the tour, such as "2 of 5". */
  progress: Element | null
}

/**
 * What names a tour stop's panel and what describes it.
 *
 * Named by the `heading` slot, then by the first heading in the content, then
 * by the stop's own `label`, and where there is none of those, by its place in
 * the tour, so no stop is an unnamed group. Described by the `description`
 * slot, or where it is empty by the words at the start of the content, as a
 * `Dialog` is, and then by its place, which is how a screen reader hears where
 * it is as focus moves from one stop to the next.
 */
export const stopNaming = ({
  content,
  description,
  heading,
  labeled,
  loose = null,
  progress,
}: StopWords): StopNaming => {
  const first = heading.length > 0 ? null : headingIn(content)
  const found = heading.length > 0 ? [...heading] : first ? [first] : []
  const place = progress ? [progress] : []
  const said =
    description.length > 0
      ? [...description]
      : content.length === 0 && loose
        ? [loose]
        : wordsAmong(content, first)
  if (found.length === 0 && !labeled) {
    return { describedBy: said, labelledBy: place }
  }
  return { describedBy: [...said, ...place], labelledBy: found }
}

import type { Insight } from '../../../content/insights'

/**
 * How the grid may be ordered, and what each one compares.
 *
 * `newest` is the resting order because a post is dated and a reader arriving
 * at a writing page wants the most recent one first. `title` is here for the
 * reader who remembers a name, and every comparison falls back to the title so
 * the order is defined rather than whatever the registry happened to hold.
 */
export const SORTS: Record<string, (a: Insight, b: Insight) => number> = {
  newest: (a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title),
  oldest: (a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title),
  title: (a, b) => a.title.localeCompare(b.title),
}

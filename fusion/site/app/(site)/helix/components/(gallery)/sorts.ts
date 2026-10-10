import type { Family } from '../../../../../content/catalog/catalog'

/**
 * How the grid may be ordered, and what each one compares.
 *
 * `newest` compares each family's `@since`. Most families share the first
 * version, so the name breaks the tie among them, which makes the order defined
 * whatever order the manifest emits them in.
 */
export const SORTS: Record<string, (a: Family, b: Family) => number> = {
  category: (a, b) => a.category.localeCompare(b.category) || a.label.localeCompare(b.label),
  name: (a, b) => a.label.localeCompare(b.label),
  newest: (a, b) =>
    b.since.localeCompare(a.since, undefined, { numeric: true }) || a.label.localeCompare(b.label),
}

/**
 * What a Filter Input bound to a Data Table by `for` reads from the table and
 * writes to it.
 *
 * **By shape, and nothing here imports the table.** The Data Table family is
 * the larger of the two by far, and a field that never binds to one should not
 * carry it. So this names what the field needs of a table, and the table's
 * columns are read the same way.
 */

import type { FacetDetail } from './events/index.js'
import type { FilterGrammarField, FilterGrammarOperator } from './grammar.js'
import type { FilterSource, FilterSuggestion } from './suggest.js'

/** One filter in a table's view. */
export interface BoundFilter {
  field: string
  operator: string
  values: string[]
}

/** One column of a bound table, as the field reads it. */
export interface BoundColumn {
  field: string
  filterable: boolean
  textContent: string | null
  type?: string | undefined
}

/** What the field needs of a table it is bound to. */
export interface BoundTable extends HTMLElement {
  facetsOf(field: string): readonly { count: number; value: string }[]
  operatorsOf(field: string): readonly { arity: string; label: string; name: string }[]
  requestView(next: { filters?: BoundFilter[]; query?: string }): boolean
  readonly tableColumns: readonly BoundColumn[]
  readonly view: { filters: readonly BoundFilter[]; query: string }
}

/** Whether an element is a table the field can bind to. */
export const isBoundTable = (element: Element | null): element is BoundTable =>
  element !== null &&
  typeof (element as Partial<BoundTable>).requestView === 'function' &&
  typeof (element as Partial<BoundTable>).facetsOf === 'function'

/** The columns a reader can filter by: the ones marked `filterable`, with a field. */
export const filterableColumns = (table: BoundTable): BoundColumn[] =>
  table.tableColumns.filter((column) => column.filterable && column.field !== '')

const labelOf = (column: BoundColumn): string => column.textContent?.trim() || column.field

/** What a column's comparisons are to the grammar, which knows one, none and many. */
const grammarOperators = (table: BoundTable, field: string): FilterGrammarOperator[] =>
  table.operatorsOf(field).map((one, place) => ({
    arity: one.arity === 'none' ? 'none' : one.arity === 'one' ? 'one' : 'many',
    default: place === 0,
    label: one.label,
    name: one.name,
  }))

/** The values a column offers to type: an enum's and a boolean's, none for the rest. */
const valuesOf = (table: BoundTable, column: BoundColumn): { label: string; value: string }[] => {
  if (column.type === 'boolean') {
    return [
      { label: 'true', value: 'true' },
      { label: 'false', value: 'false' },
    ]
  }
  return column.type === 'enum'
    ? table.facetsOf(column.field).map(({ value }) => ({ label: value, value }))
    : []
}

/** The table's filterable columns as the grammar reads a declared field. */
export const tableFields = (table: BoundTable): FilterGrammarField[] =>
  filterableColumns(table).map((column) => ({
    label: labelOf(column),
    name: column.field,
    operators: grammarOperators(table, column.field),
    values: valuesOf(table, column),
  }))

/**
 * The filters after one field's change: the field's filter replaced, or taken
 * out where it has no values left and its comparison needs some.
 */
export const filtersAfter = (
  filters: readonly BoundFilter[],
  facet: FacetDetail,
): BoundFilter[] => {
  const others = filters.filter((one) => one.field !== facet.field)
  if (facet.values.length === 0 && facet.arity !== 'none') {
    return others
  }
  const next = { field: facet.field, operator: facet.operator, values: [...facet.values] }
  const at = filters.findIndex((one) => one.field === facet.field)
  if (at < 0) {
    return [...others, next]
  }
  return filters.map((one) => (one.field === facet.field ? next : one))
}

/** The chip a filter in the view draws, as the facet that would have made it. */
export const facetOf = (table: BoundTable, filter: BoundFilter): FacetDetail | undefined => {
  const column = filterableColumns(table).find((one) => one.field === filter.field)
  if (!column) {
    return undefined
  }
  const operators = grammarOperators(table, filter.field)
  const operator = operators.find((one) => one.name === filter.operator) ?? operators[0]
  return {
    arity: operator?.arity ?? 'many',
    field: filter.field,
    label: labelOf(column),
    operator: operator?.name ?? filter.operator,
    operatorLabel: operator && !operator.default ? operator.label : '',
    values: filter.values,
  }
}

/**
 * Suggestions from the table: its filterable columns while a key is typed,
 * and a column's values, with how many rows hold each, after `field:`.
 */
export const tableSource =
  (
    table: () => BoundTable | null,
    matches: (words: string, term: string) => boolean,
  ): FilterSource =>
  ({ field, term }) => {
    const bound = table()
    if (!bound) {
      return []
    }
    const columns = filterableColumns(bound)
    if (field === '') {
      return columns
        .filter((column) => matches(`${labelOf(column)} ${column.field}`, term))
        .map((column): FilterSuggestion => ({ label: labelOf(column), value: `${column.field}:` }))
    }
    const column = columns.find((one) => one.field === field || labelOf(one) === field)
    if (!column) {
      return []
    }
    const counted = column.type === 'enum' ? bound.facetsOf(column.field) : []
    return counted
      .filter(({ value }) => matches(value, term))
      .map(({ count, value }) => ({ label: `${value} (${count})`, value }))
  }

/**
 * What a page calls on a table drawn from an array, by its ref, the web element's
 * own methods: `search`, `toggleSort`, `hideColumn`, `showColumn`, and `csv`. Each
 * request answers whether it stood, as on the web.
 */
import { csvOf, type DataRow } from '@fusion.dev/helix-core/data-table'
import { type Ref, useImperativeHandle } from 'react'
import type { DataColumn } from './data-table-model'

/** A Data Table's methods on a phone. */
export interface DataTableHandle {
  /** The rows the search leaves, as CSV, past the page, in the columns shown. */
  readonly csv: () => string
  readonly hideColumn: (field: string) => boolean
  readonly search: (query: string) => boolean
  readonly showColumn: (field: string) => boolean
  readonly toggleSort: (field: string) => boolean
}

/** What the handle reads of the table as it stands. */
interface HandleOf {
  readonly columns: readonly DataColumn[]
  readonly hide: (field: string, hide: boolean) => boolean
  readonly ref: unknown
  readonly rows: readonly DataRow[]
  readonly search: (query: string) => boolean
  readonly toggleSort: (field: string) => boolean
}

/** The words a column's element holds. */
const headingOf = (column: DataColumn): string => {
  const words = (column.element.props as { readonly children?: unknown }).children
  return (typeof words === 'string' ? words.trim() : '') || column.field
}

/** Gives the table's ref its methods. */
export const useDataTableHandle = ({
  columns,
  hide,
  ref,
  rows,
  search,
  toggleSort,
}: HandleOf): void => {
  useImperativeHandle(ref as Ref<DataTableHandle> | undefined, () => ({
    csv: () =>
      csvOf(
        columns
          .filter((column) => column.field !== '')
          .map((column) => ({ field: column.field, heading: headingOf(column) })),
        rows,
      ),
    hideColumn: (field) => hide(field, true),
    search,
    showColumn: (field) => hide(field, false),
    toggleSort,
  }))
}

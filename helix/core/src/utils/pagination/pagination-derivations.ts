/**
 * Pagination's derivations: the words a summary says for the page it reports.
 */
import { formatMessage } from '../../words/index.js'
import type { Derivation } from '../derivations/derivations.js'
import { textOf } from '../number-format/props.js'
import { pageRange } from './pagination.js'

const numberOf = (value: unknown): number => {
  const read = typeof value === 'string' ? Number(value) : value
  return typeof read === 'number' && Number.isFinite(read) ? read : 0
}

/** `pagination-summary-words`: which items a page holds, or nothing with no count. */
export const paginationSummaryWords: Derivation = (props) => {
  const total = numberOf(props.total)
  const range = pageRange(numberOf(props.page), numberOf(props['page-size']), total)
  return range === undefined
    ? ''
    : formatMessage(textOf(props.format), { ...range, total }, textOf(props.locale))
}

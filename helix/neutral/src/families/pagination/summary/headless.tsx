import { headless, Text } from '../../../render.js'
import { derive } from '../../../tree.js'

/**
 * Pagination Summary's headless tier: the words that say which items a page
 * holds, out of how many, as `1-25 of 248`. It stands apart from the row of pages,
 * so you decide where the count goes.
 *
 * **It draws an empty box until it knows a total and a size**, so a footer keeps
 * its column. A page past the end reads as the last page.
 *
 * **Held to `helix-pagination-summary`.** `helix system check` compares what it
 * declares with what the manifest says the element has.
 */
export default headless('pagination-summary', {
  props: {
    format: '{from}-{to} of {total}',
    locale: '',
    page: 1,
    pageSize: 0,
    total: 0,
  },
  states: ['settled'],
  derived: {
    words: derive('pagination-summary-words'),
  },
  render: ({ derived }) => (
    <Text
      part="words"
      platform="native"
    >
      {derived.words}
    </Text>
  ),
})

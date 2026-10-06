import { describe, expect, test } from 'bun:test'
import { hostAttributes, rendered, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'
import { styles } from './pagination-summary.css.js'

describe('pagination summary server output', () => {
  test('the reading is in the served markup, not worked out on hydration', () => {
    // Arithmetic over three numbers the server already has, so there is nothing
    // here to wait for.
    const it = html`<helix-pagination-summary
      page="4"
      page-size="25"
      total="248"
    ></helix-pagination-summary>`
    expect(rendered(ssr(it), 'helix-pagination-summary')).toContain('76-100 of 248')
  })

  test('a page past the end is clamped on the server too', () => {
    const it = html`<helix-pagination-summary
      page="99"
      page-size="25"
      total="248"
    ></helix-pagination-summary>`
    expect(rendered(ssr(it), 'helix-pagination-summary')).toContain('226-248 of 248')
  })

  test('the host stays exactly as the consumer wrote it', () => {
    const it = html`<helix-pagination-summary
      page="1"
      page-size="10"
      total="90"
    ></helix-pagination-summary>`
    expect(hostAttributes(ssr(it), 'helix-pagination-summary')).toEqual([
      'page',
      'page-size',
      'total',
    ])
  })
})

describe('pagination summary hooks', () => {
  test('the hooks the docs name are what the sheet reads', () => {
    for (const hook of ['--pagination-font-size', '--pagination-summary-foreground-color']) {
      expect(styles.cssText).toMatch(new RegExp(`var\\(\\s*${hook},`))
    }
  })
})

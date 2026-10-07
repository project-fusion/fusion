import { describe, expect, test } from 'bun:test'
import { rendered, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

/**
 * Format Date reads the one locale rule: on a server, its own `lang`, which a
 * server can see, where before it read only `locale` and otherwise wrote the
 * server's own language.
 */
describe('format-date on a server', () => {
  test('writes the date in its own `lang`', () => {
    const markup = ssr(
      html`<helix-headless-format-date
        date="2020-01-01T00:00:00.000Z"
        lang="de"
        month="long"
        time-zone="UTC"
        year="numeric"
      ></helix-headless-format-date>`,
    )
    expect(rendered(markup, 'helix-headless-format-date')).toContain('Januar 2020')
  })
})

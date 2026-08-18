import { describe, expect, test } from 'bun:test'
import { hostAttributes, ssr, withoutStyles } from '@fusion-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('pagination size server output', () => {
  test('the select and its options ship, rather than appearing on hydration', () => {
    const it = html`<helix-pagination-size
      default-value="25"
      sizes="10,25,50"
    ></helix-pagination-size>`
    const markup = withoutStyles(ssr(it))
    expect(markup).toContain('<helix-select')
    expect(markup).toContain('value="10"')
    expect(markup).toContain('value="50"')
  })

  test('the label ships with it, so the row is one line before any script runs', () => {
    const it = html`<helix-pagination-size label="Rows"></helix-pagination-size>`
    expect(withoutStyles(ssr(it))).toContain('Rows')
  })

  test('nothing to choose from renders nothing', () => {
    // A chooser with no choices is a control a reader can reach and cannot use,
    // which is worse than an absence.
    const it = html`<helix-pagination-size sizes=""></helix-pagination-size>`
    expect(withoutStyles(ssr(it))).not.toContain('<helix-select')
  })

  test('the host stays exactly as the consumer wrote it', () => {
    const it = html`<helix-pagination-size sizes="10,25"></helix-pagination-size>`
    expect(hostAttributes(ssr(it), 'helix-pagination-size')).toEqual(['sizes'])
  })
})

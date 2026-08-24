import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, ssr, withoutStyles } from '@helix-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

const markup = ssr(html`<helix-headless-table columns="10rem 1fr" label="Attributes">
  <helix-headless-table-row>
    <helix-headless-table-cell header>Name</helix-headless-table-cell>
    <helix-headless-table-cell>appearance</helix-headless-table-cell>
  </helix-headless-table-row>
</helix-headless-table>`)

describe('table server output', () => {
  test('the table role and name are in the served markup', () => {
    expect(partTag(markup, 'table')).toContain('role="table"')
    expect(partTag(markup, 'table')).toContain('aria-label="Attributes"')
  })

  test('rows and cells put their structure on internals, not on the host', () => {
    // The roles are real, and a DOM spec asserts them. What the host must not
    // do is write them as attributes: the consumer's server markup has only
    // what they typed, so anything added on upgrade is a hydration mismatch.
    expect(hostAttributes(markup, 'helix-headless-table-row')).toEqual([])
    expect(hostAttributes(markup, 'helix-headless-table-cell')).toEqual(['header'])
  })

  test('the content is in the markup for a crawler', () => {
    expect(withoutStyles(markup)).toContain('appearance')
  })
})

describe('table column server output', () => {
  test('a column serves its heading', () => {
    expect(
      withoutStyles(
        ssr(html`<helix-headless-table-column width="12rem">Service</helix-headless-table-column>`),
      ),
    ).toContain('Service')
  })

  test('the track list is not served, because it is read from children', () => {
    // The server has no tree to walk, so the table cannot know its columns. The
    // grid falls back to one track until it upgrades, which is the same trade
    // the docs describe for anything that inspects the DOM.
    const markup = ssr(html`<helix-headless-table label="T"></helix-headless-table>`)
    expect(withoutStyles(markup)).not.toContain('--table-columns')
  })
})

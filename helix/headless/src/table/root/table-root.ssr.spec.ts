import { describe, expect, test } from 'bun:test'
import {
  hasPart,
  hostAttributes,
  partTag,
  rendered,
  ssr,
  withoutStyles,
} from '@fusion.dev/helix-testing/ssr'
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

  test('every level projects, so a crawler reads the cells the consumer wrote', () => {
    /* `toContain('appearance')` was the fixture's own cell text, in the
       document whatever the table, the row and the cell did with it. What the
       three owe is the slot at each level, read off renders with no children:
       a row or a cell that dropped its slot would still have passed. */
    expect(
      rendered(
        ssr(html`<helix-headless-table label="T"></helix-headless-table>`),
        'helix-headless-table',
      ),
      /* Lit's markers stand where the checkbox heading of a selectable table goes. */
    ).toMatch(/<div part="head" role="row">(<!--[^>]*-->)*<slot name="columns"><\/slot><\/div>/)
    expect(
      rendered(
        ssr(html`<helix-headless-table-row></helix-headless-table-row>`),
        'helix-headless-table-row',
      ),
      // A `slotchange` listener here too, so the same space inside the tag.
    ).toMatch(/<slot\s*><\/slot>/)
    expect(
      rendered(
        ssr(html`<helix-headless-table-cell></helix-headless-table-cell>`),
        'helix-headless-table-cell',
      ),
      /* The cell's slot carries a `slotchange` listener, which Lit marks with a
         node comment and a space inside the tag. It is still an unnamed slot. */
    ).toMatch(/<slot\s*><\/slot>/)
  })
})

describe('table column server output', () => {
  test('a column serves the box its heading is projected into', () => {
    // `toContain('Service')` was the word the spec itself slotted, so it held
    // for a column rendering nothing. The box is the part a consumer styles.
    const markup = ssr(
      html`<helix-headless-table-column width="12rem"></helix-headless-table-column>`,
    )
    expect(hasPart(markup, 'column')).toBe(true)
    expect(rendered(markup, 'helix-headless-table-column')).toContain('<slot></slot>')
  })

  test('the track list a server can send is the one that needs no children', () => {
    /* `columns` is an attribute, so the grid is laid out in the first paint.
       The assertion names `--table-template`, which is what this element
       writes: a name it never writes could not fail here whatever the render
       held. */
    expect(
      partTag(
        ssr(html`<helix-headless-table columns="10rem 1fr" label="T"></helix-headless-table>`),
        'table',
      ),
    ).toContain('--table-template: 10rem 1fr')
  })

  test('and the one worked out from the columns is not', () => {
    // The server has no tree to walk, so the table cannot know its columns. The
    // grid falls back to one track until it upgrades, which is the same trade
    // the docs describe for anything that inspects the DOM.
    const markup = ssr(
      html`<helix-headless-table label="T">
        <helix-headless-table-column width="12rem">Service</helix-headless-table-column>
      </helix-headless-table>`,
    )
    expect(withoutStyles(markup)).not.toContain('--table-template')
  })
})

describe('a table with a heading, on the server', () => {
  test('serves the heading slot ahead of the grid', () => {
    const served = rendered(
      ssr(html`<helix-headless-table label="T"></helix-headless-table>`),
      'helix-headless-table',
    )
    expect(served).toMatch(/<slot name="heading"><\/slot>(<!--[^>]*-->)*<div\s+part="table"/)
  })

  test('serves a selectable table its checkbox heading', () => {
    const served = rendered(
      ssr(html`<helix-headless-table label="T" selectable></helix-headless-table>`),
      'helix-headless-table',
    )
    expect(served).toMatch(/<span part="select-all" role="columnheader"/)
  })
})

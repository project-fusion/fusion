import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, rendered, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('list server output', () => {
  test('the list and a row each serve the slot that projects the content', () => {
    /* `toContain('One')` read the row's own light-DOM text back out of the
       render, so it passed with either element rendering no slot at all. Each
       is read off an element with no children, so the only shadow root in it is
       that element's own. */
    const list = ssr(html`<helix-headless-list></helix-headless-list>`)
    expect(rendered(list, 'helix-headless-list')).toMatch(/<slot\s*><\/slot>/)

    const row = ssr(html`<helix-headless-list-item></helix-headless-list-item>`)
    expect(partTag(row, 'row')).toMatch(/^<div\b/)
    // The default slot carries the id the grid cell is named by.
    expect(rendered(row, 'helix-headless-list-item')).toContain('<slot id="label"></slot>')
  })

  test('neither the list nor a row carries an attribute the consumer did not write', () => {
    const markup = ssr(
      html`<helix-headless-list label="Files"><helix-headless-list-item>x</helix-headless-list-item></helix-headless-list>`,
    )
    expect(hostAttributes(markup, 'helix-headless-list')).toEqual(['label'])
    expect(hostAttributes(markup, 'helix-headless-list-item')).toEqual([])
  })

  /* `start` needs no rows to know, so the served list already counts from it. */
  test('a start is served as the number the rows count from', () => {
    const markup = ssr(html`<helix-headless-list kind="ordered" start="5"></helix-headless-list>`)
    expect(rendered(markup, 'helix-headless-list')).toMatch(
      /<slot style="--list-first: 5; --list-step: 1"/,
    )
    const down = ssr(
      html`<helix-headless-list kind="ordered" reversed start="3"></helix-headless-list>`,
    )
    expect(rendered(down, 'helix-headless-list')).toMatch(
      /<slot style="--list-first: 3; --list-step: -1"/,
    )
  })

  /* Counting down from the number of rows needs the rows, which a server does
     not have, so the served list counts from one until it runs. */
  test('reversed with no start serves the ordinary count', () => {
    const markup = ssr(html`<helix-headless-list kind="ordered" reversed></helix-headless-list>`)
    expect(rendered(markup, 'helix-headless-list')).toMatch(/<slot\s*><\/slot>/)
  })

  test('a row in a plain list serves no grid cell and no tab stop', () => {
    const plain = ssr(
      html`<helix-headless-list><helix-headless-list-item>x</helix-headless-list-item></helix-headless-list>`,
    )
    expect(partTag(plain, 'row')).not.toContain('gridcell')
    expect(partTag(plain, 'row')).not.toContain('tabindex')
  })
})

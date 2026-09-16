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
    expect(rendered(list, 'helix-headless-list')).toContain('<slot></slot>')

    const row = ssr(html`<helix-headless-list-item></helix-headless-list-item>`)
    expect(partTag(row, 'row')).toMatch(/^<div\b/)
    expect(rendered(row, 'helix-headless-list-item')).toContain('<slot></slot>')
  })

  test('neither the list nor a row carries an attribute the consumer did not write', () => {
    const markup = ssr(
      html`<helix-headless-list label="Files"><helix-headless-list-item>x</helix-headless-list-item></helix-headless-list>`,
    )
    expect(hostAttributes(markup, 'helix-headless-list')).toEqual(['label'])
    expect(hostAttributes(markup, 'helix-headless-list-item')).toEqual([])
  })
})

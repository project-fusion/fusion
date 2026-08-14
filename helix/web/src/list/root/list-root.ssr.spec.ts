import { describe, expect, test } from 'bun:test'
import { hostAttributes, ssr, withoutStyles } from '@fusion-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('list server output', () => {
  test('the rows are in the served markup', () => {
    const markup = withoutStyles(
      ssr(html`<helix-list><helix-list-item>One</helix-list-item></helix-list>`),
    )
    expect(markup).toContain('One')
  })

  test('neither the list nor a row carries an attribute the consumer did not write', () => {
    const markup = ssr(
      html`<helix-list label="Files"><helix-list-item>x</helix-list-item></helix-list>`,
    )
    expect(hostAttributes(markup, 'helix-list')).toEqual(['label'])
    expect(hostAttributes(markup, 'helix-list-item')).toEqual([])
  })
})

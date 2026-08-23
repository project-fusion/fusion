import { describe, expect, test } from 'bun:test'
import { hostAttributes, ssr, withoutStyles } from '@helix-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('list server output', () => {
  test('the rows are in the served markup', () => {
    const markup = withoutStyles(
      ssr(
        html`<helix-base-list><helix-base-list-item>One</helix-base-list-item></helix-base-list>`,
      ),
    )
    expect(markup).toContain('One')
  })

  test('neither the list nor a row carries an attribute the consumer did not write', () => {
    const markup = ssr(
      html`<helix-base-list label="Files"><helix-base-list-item>x</helix-base-list-item></helix-base-list>`,
    )
    expect(hostAttributes(markup, 'helix-base-list')).toEqual(['label'])
    expect(hostAttributes(markup, 'helix-base-list-item')).toEqual([])
  })
})

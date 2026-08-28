import { describe, expect, test } from 'bun:test'
import { hostAttributes, ssr, withoutStyles } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('list server output', () => {
  test('the rows are in the served markup', () => {
    const markup = withoutStyles(
      ssr(
        html`<helix-headless-list><helix-headless-list-item>One</helix-headless-list-item></helix-headless-list>`,
      ),
    )
    expect(markup).toContain('One')
  })

  test('neither the list nor a row carries an attribute the consumer did not write', () => {
    const markup = ssr(
      html`<helix-headless-list label="Files"><helix-headless-list-item>x</helix-headless-list-item></helix-headless-list>`,
    )
    expect(hostAttributes(markup, 'helix-headless-list')).toEqual(['label'])
    expect(hostAttributes(markup, 'helix-headless-list-item')).toEqual([])
  })
})

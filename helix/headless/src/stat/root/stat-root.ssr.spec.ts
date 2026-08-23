import { describe, expect, test } from 'bun:test'
import { hostAttributes, ssr, withoutStyles } from '@helix-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('stat server output', () => {
  test('the figure and its label are in the served markup', () => {
    const markup = withoutStyles(
      ssr(
        html`<helix-base-stat><span slot="label">Revenue</span><span>42</span></helix-base-stat>`,
      ),
    )
    expect(markup).toContain('Revenue')
    expect(markup).toContain('42')
  })

  test('the host carries nothing the consumer did not write', () => {
    expect(
      hostAttributes(
        ssr(html`<helix-base-stat><span>42</span></helix-base-stat>`),
        'helix-base-stat',
      ),
    ).toEqual([])
  })
})

import { describe, expect, test } from 'bun:test'
import { hostAttributes, ssr, withoutStyles } from '@helix-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('stat server output', () => {
  test('the figure and its label are in the served markup', () => {
    const markup = withoutStyles(
      ssr(
        html`<helix-headless-stat><span slot="label">Revenue</span><span>42</span></helix-headless-stat>`,
      ),
    )
    expect(markup).toContain('Revenue')
    expect(markup).toContain('42')
  })

  test('the host carries nothing the consumer did not write', () => {
    expect(
      hostAttributes(
        ssr(html`<helix-headless-stat><span>42</span></helix-headless-stat>`),
        'helix-headless-stat',
      ),
    ).toEqual([])
  })
})

import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, partTag, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('spinner server output', () => {
  test('renders its circles on the server', () => {
    const markup = ssr(html`<helix-headless-loader></helix-headless-loader>`)
    expect(hasPart(markup, 'track')).toBe(true)
    expect(hasPart(markup, 'indicator')).toBe(true)
  })

  test('the host carries nothing the consumer did not write', () => {
    expect(
      hostAttributes(
        ssr(html`<helix-headless-loader></helix-headless-loader>`),
        'helix-headless-loader',
      ),
    ).toEqual([])
  })
})

describe('a loader with a delay, served', () => {
  /* A page that loads quickly never draws it, the server included. */
  test('is served hidden', () => {
    const markup = ssr(html`<helix-headless-loader delay="300"></helix-headless-loader>`)
    expect(partTag(markup, 'svg')).toMatch(/\shidden/)
  })
})

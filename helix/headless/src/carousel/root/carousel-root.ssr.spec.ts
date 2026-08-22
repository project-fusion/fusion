import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, ssr, withoutStyles } from '@fusion-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

const carousel = html`<helix-carousel label="Verticals">
  <div>Design</div>
  <div>Mind</div>
</helix-carousel>`

describe('carousel server output', () => {
  test('every slide is in the served markup, not only the one in view', () => {
    // They are content, so a crawler and a reader without script get all of
    // them rather than the first.
    const markup = withoutStyles(ssr(carousel))
    expect(markup).toContain('Design')
    expect(markup).toContain('Mind')
  })

  test('the controls ship with the markup', () => {
    expect(hasPart(ssr(carousel), 'previous')).toBe(true)
    expect(hasPart(ssr(carousel), 'next')).toBe(true)
  })

  test('no rotation control until it is asked for', () => {
    expect(hasPart(ssr(carousel), 'rotation')).toBe(false)
  })

  test('the host carries only what the consumer wrote', () => {
    expect(hostAttributes(ssr(carousel), 'helix-carousel')).toEqual(['label'])
  })
})

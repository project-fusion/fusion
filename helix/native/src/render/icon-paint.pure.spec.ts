import { describe, expect, test } from 'bun:test'
import { paintedMarkup } from './icon-paint.js'

const tokens = { 'color-primary': '#123456', 'color-primary-active': '#654321' }

describe('an icon’s paint on a phone', () => {
  test('a Helix token behind a page’s own property is the theme’s value', () => {
    expect(
      paintedMarkup(
        '<stop stop-color="var(--logo-color-from, var(--helix-color-primary))"/>' +
          '<stop stop-color="var(--logo-color-to, var(--helix-color-primary-active))"/>',
        tokens,
        '#000000',
      ),
    ).toBe('<stop stop-color="#123456"/><stop stop-color="#654321"/>')
  })

  test('a property with a written fallback is the fallback, and one with none is the color', () => {
    expect(paintedMarkup('<path fill="var(--mark, #ff0000)"/>', tokens, '#000000')).toBe(
      '<path fill="#ff0000"/>',
    )
    expect(paintedMarkup('<path fill="var(--mark)"/>', tokens, '#abcdef')).toBe(
      '<path fill="#abcdef"/>',
    )
  })

  test('markup with no var() is left as it is', () => {
    const plain = '<path fill="currentColor" d="M0 0h1v1z"/>'
    expect(paintedMarkup(plain, tokens, '#000000')).toBe(plain)
  })
})

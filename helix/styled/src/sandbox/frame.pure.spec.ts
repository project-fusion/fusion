import { describe, expect, test } from 'bun:test'
import { isRender, loggedText, withoutStylesheets } from './frame.js'

describe('the frame side of the preview protocol', () => {
  test('a render is an object whose type names it, and nothing else is', () => {
    expect(isRender({ source: '<p>Hi</p>', type: 'helix-preview-render' })).toBe(true)
    expect(isRender({ type: 'helix-preview-size' })).toBe(false)
    expect(isRender('helix-preview-render')).toBe(false)
    expect(isRender(null)).toBe(false)
  })

  test('the stylesheet links an example carries are dropped, and the rest is kept', () => {
    expect(
      withoutStylesheets(
        '<link href="styles.css" rel="stylesheet">\n<p>Hi</p><link rel="icon" href="x">',
      ),
    ).toBe('<p>Hi</p><link rel="icon" href="x">')
  })

  test('a logged value is its text, and a cycle does not throw', () => {
    const cycle: Record<string, unknown> = {}
    cycle.self = cycle
    expect(loggedText('plain')).toBe('plain')
    expect(loggedText({ a: 1 })).toBe('{"a":1}')
    expect(loggedText(undefined)).toBe('undefined')
    expect(loggedText(cycle)).toBe('[object Object]')
  })
})

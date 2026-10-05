import { describe, expect, test } from 'bun:test'
import { qrSvg } from './export.js'

const drawing = {
  background: 'rgb(255, 255, 255)',
  box: 29,
  finderColor: 'rgb(200, 0, 0)',
  finders: 'M0 0h7v7h-7z',
  moduleColor: 'rgb(0, 0, 0)',
  modules: 'M8 0h1v1h-1z',
  quiet: 4,
}

describe('qrSvg', () => {
  test('writes a file that stands alone, at the size asked for', () => {
    const markup = qrSvg(drawing, 512)
    expect(markup.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 29 29"')).toBe(
      true,
    )
    expect(markup).toContain('width="512" height="512"')
  })

  test('puts the background under the code, quiet zone and all', () => {
    expect(qrSvg(drawing, 64)).toContain('<rect width="29" height="29" fill="rgb(255, 255, 255)"/>')
  })

  test('writes each path in its own color, moved in by the quiet zone', () => {
    const markup = qrSvg(drawing, 64)
    expect(markup).toContain(
      '<path d="M8 0h1v1h-1z" transform="translate(4 4)" fill="rgb(0, 0, 0)"/>',
    )
    expect(markup).toContain(
      '<path d="M0 0h7v7h-7z" transform="translate(4 4)" fill="rgb(200, 0, 0)"/>',
    )
  })

  test('escapes what it writes into an attribute', () => {
    expect(qrSvg({ ...drawing, background: 'url("#a")' }, 64)).toContain(
      'fill="url(&quot;#a&quot;)"',
    )
  })
})

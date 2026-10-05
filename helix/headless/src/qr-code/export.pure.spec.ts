import { describe, expect, test } from 'bun:test'
import { qrLogo, qrSvg } from './export.js'

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

/* The exports left the slotted logo out, so a saved code did not look like
   the one on the page. */
describe('qrLogo', () => {
  const frame = [11, 11, 7.333, 7] as const
  const mark = [12, 12, 5, 5] as const

  test('writes an image logo as an image over a box that clears the modules', () => {
    expect(
      qrLogo({ frame, ground: 'rgb(255, 255, 255)', href: 'data:image/png;base64,AA', mark }),
    ).toBe(
      '<rect x="11" y="11" width="7.33" height="7" fill="rgb(255, 255, 255)"/>' +
        '<image x="12" y="12" width="5" height="5" href="data:image/png;base64,AA" preserveAspectRatio="xMidYMid meet"/>',
    )
  })

  test("moves an inline SVG to the mark's place, dropping its own", () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" slot="logo" viewBox="0 0 24 24" width="40" height="40"><circle r="4"/></svg>'
    expect(qrLogo({ frame, ground: '#fff', mark, svg })).toBe(
      '<rect x="11" y="11" width="7.33" height="7" fill="#fff"/>' +
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" x="12" y="12" width="5" height="5"><circle r="4"/></svg>',
    )
  })

  test('writes nothing for a mark a file cannot carry', () => {
    expect(qrLogo({ frame, ground: '#fff', mark })).toBe('')
  })

  test('goes over the code, after both paths', () => {
    const markup = qrSvg({ ...drawing, logo: { frame, ground: '#fff', href: 'a.png', mark } }, 64)
    expect(markup.indexOf('<image')).toBeGreaterThan(markup.lastIndexOf('<path'))
    expect(qrSvg(drawing, 64)).not.toContain('<image')
  })
})

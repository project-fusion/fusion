import { describe, expect, test } from 'bun:test'
import { creditMarkup, creditParts } from './credit.js'

/* A server has no `DOMParser`, and read a credit by taking every tag out, so
   a snapshot's credit lost its links and wrote `&copy;` as it stood. */
describe('creditParts on a server', () => {
  test('has no DOM to read with', () => {
    expect(typeof (globalThis as { DOMParser?: unknown }).DOMParser).toBe('undefined')
  })

  test('words and links, in reading order, with their entities read', () => {
    expect(
      creditParts([
        '<a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap</a> contributors',
      ]),
    ).toEqual([
      { href: 'https://www.openstreetmap.org/copyright', text: '© OpenStreetMap' },
      { text: ' contributors' },
    ])
  })

  test('a link that leads anywhere but the web is only its words', () => {
    expect(creditParts(["<a href='javascript:alert(1)'>Tiles</a>"])).toEqual([{ text: 'Tiles' }])
  })

  test('every other element is its words, and nothing runs', () => {
    expect(
      creditParts(['<img src=x onerror="alert(1)"><script>alert(1)</script><b>Bold</b> tiles']),
    ).toEqual([{ text: 'alert(1)' }, { text: 'Bold' }, { text: ' tiles' }])
  })

  test('two credits that read the same are one, and two different ones are divided', () => {
    const parts = creditParts([
      '© OpenStreetMap',
      '<i>&#169; OpenStreetMap</i>',
      'Weather: Rain Co',
    ])
    expect(parts.map((part) => part.text).join('')).toBe('© OpenStreetMap | Weather: Rain Co')
  })
})

describe('creditMarkup', () => {
  test('is the span the connector writes, its words escaped', () => {
    expect(
      creditMarkup([
        { href: 'https://example.com/?a=1&b="2"', text: '<Tiles>' },
        { text: ' & co' },
      ]),
    ).toBe(
      '<span data-helix-map-credit slot="attribution"><a data-link="quiet" href="https://example.com/?a=1&#38;b=&#34;2&#34;" rel="noopener noreferrer" target="_blank">&#60;Tiles&#62;</a> &#38; co</span>',
    )
  })

  test('is nothing for a credit that says nothing', () => {
    expect(creditMarkup([])).toBe('')
  })
})

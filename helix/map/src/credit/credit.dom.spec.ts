import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import { creditParts } from './credit.js'

beforeAll(() => {
  registerDom()
})

describe('creditParts', () => {
  test('words and links, in reading order', () => {
    expect(
      creditParts([
        '<a href="https://www.openstreetmap.org/copyright">© OpenStreetMap</a> contributors',
      ]),
    ).toEqual([
      { href: 'https://www.openstreetmap.org/copyright', text: '© OpenStreetMap' },
      { text: ' contributors' },
    ])
  })

  test('a link that leads anywhere but the web is only its words', () => {
    expect(creditParts(['<a href="javascript:alert(1)">Tiles</a>'])).toEqual([{ text: 'Tiles' }])
  })

  test('every other element is its words, and nothing runs', () => {
    expect(
      creditParts(['<img src=x onerror="alert(1)"><script>alert(1)</script><b>Bold</b> tiles']),
    ).toEqual([{ text: 'alert(1)' }, { text: 'Bold' }, { text: ' tiles' }])
  })

  test('two credits that read the same are one, and two different ones are divided', () => {
    const parts = creditParts(['© OpenStreetMap', '<i>© OpenStreetMap</i>', 'Weather: Rain Co'])
    expect(parts.map((part) => part.text).join('')).toBe('© OpenStreetMap | Weather: Rain Co')
  })

  test('an empty credit says nothing', () => {
    expect(creditParts(['', '  ', '<span></span>'])).toEqual([])
  })
})

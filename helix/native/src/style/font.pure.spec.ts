import { describe, expect, test } from 'bun:test'
import { apply } from './apply.js'
import { fontLonghands } from './font.js'
import { BLOCK } from './resolved.js'

const scale = {
  fontSize: 16,
  inherits: 16,
  rem: 16,
  shrinks: false,
  spaceEm: 16,
  spaceRem: 16,
  within: BLOCK,
}

describe('the font shorthand', () => {
  test('splits into its style, weight, size, line height and family', () => {
    expect(fontLonghands('italic 600 14px/1.5 ui-sans-serif, system-ui')).toEqual([
      ['font-style', 'italic'],
      ['font-weight', '600'],
      ['font-size', '14px'],
      ['line-height', '1.5'],
      ['font-family', 'ui-sans-serif, system-ui'],
    ])
    expect(fontLonghands('1rem / 2 serif')?.[3]).toEqual(['line-height', '2'])
  })

  test('leaves every longhand unset for a keyword, and refuses words with no size', () => {
    expect(fontLonghands('inherit')).toEqual([])
    expect(fontLonghands('bold serif')).toBeUndefined()
  })

  test('draws each longhand on a phone, with no line height where it is normal', () => {
    const out: Record<string, number | string> = {}
    expect(apply(out, 'font', '700 1rem serif', scale)).toBeUndefined()
    expect(out).toMatchObject({ fontFamily: 'serif', fontSize: 16, fontWeight: '700' })
    expect(out.lineHeight).toBeUndefined()
    const kept: Record<string, number | string> = {}
    expect(apply(kept, 'font', 'inherit', scale)).toBeUndefined()
    expect(kept).toEqual({})
  })
})

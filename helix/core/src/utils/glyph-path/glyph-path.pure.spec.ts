import { describe, expect, test } from 'bun:test'
import { caretDown, caretLeft, caretRight, caretUp, x } from '@fusion.dev/helix-icons'
import { glyphPath } from './glyph-path.js'

describe('the path of a glyph', () => {
  /* The glyphs a template draws by their path: the dismiss cross, and the
     carets on Tabs' scroll buttons. */
  test('is the whole of each glyph drawn by it', () => {
    for (const glyph of [caretDown, caretLeft, caretRight, caretUp, x]) {
      expect(glyph.content).toBe(`<path d="${glyphPath(glyph)}"/>`)
    }
  })

  test('is empty for markup with no path', () => {
    expect(glyphPath({ content: '<circle r="4"/>' })).toBe('')
  })
})

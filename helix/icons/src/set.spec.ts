import { describe, expect, test } from 'bun:test'
import { keyboard, sparkle, tray } from './bold.js'
import { icons } from './generated.js'
import { keyboard as rootKeyboard, sparkle as rootSparkle, tray as rootTray } from './index.js'
import {
  keyboard as regularKeyboard,
  sparkle as regularSparkle,
  tray as regularTray,
} from './regular.js'

const GLYPHS = [
  { bold: keyboard, regular: regularKeyboard, root: rootKeyboard },
  { bold: sparkle, regular: regularSparkle, root: rootSparkle },
  { bold: tray, regular: regularTray, root: rootTray },
]

describe('the set', () => {
  for (const { bold, regular, root } of GLYPHS) {
    test(`${bold.name} is drawn at both weights on the set's box`, () => {
      for (const glyph of [bold, regular]) {
        expect(glyph.viewBox).toBe('0 0 256 256')
        expect(glyph.content).toContain('<path')
      }
      expect(regular.name).toBe(bold.name)
      expect(regular.content).not.toBe(bold.content)
      expect(root).toBe(bold)
    })

    test(`${bold.name} is in the index that name reads`, () => {
      expect(icons[bold.name]).toBe(bold)
    })
  }
})

import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import { SlottedGlyph } from './slotted-glyph.js'

beforeAll(() => {
  registerDom()
})

const slotted = (markup: string): HTMLSlotElement => {
  const host = document.createElement('div')
  host.innerHTML = markup
  document.body.replaceChildren(host)
  const root = host.attachShadow({ mode: 'open' })
  root.innerHTML = '<slot name="mark"></slot>'
  return root.querySelector('slot') as HTMLSlotElement
}

describe('a slotted glyph', () => {
  test('draws nothing until something is slotted', () => {
    const glyph = new SlottedGlyph()
    glyph.read(slotted('<span>text</span>'))
    expect(glyph.slotted).toBe(false)
    expect(glyph.copyFor(0)).toBeUndefined()
  })

  test('makes one copy per place and keeps it', () => {
    const glyph = new SlottedGlyph()
    glyph.read(slotted('<svg slot="mark" id="star"></svg>'))
    const first = glyph.copyFor(0)
    expect((first as Element).id).toBe('star')
    expect(glyph.copyFor(0)).toBe(first)
    expect(glyph.copyFor('track:0')).not.toBe(first)
  })

  test('drops its copies when the slot is read again', () => {
    const glyph = new SlottedGlyph()
    const slot = slotted('<svg slot="mark" id="star"></svg>')
    glyph.read(slot)
    const first = glyph.copyFor(0)
    glyph.read(slot)
    expect(glyph.copyFor(0)).not.toBe(first)
  })
})

import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, part, registerDom } from '@fusion.dev/helix-testing/dom'
import sheet from '../.examples/preview.css' with { type: 'text' }
import preview from '../.examples/preview.html' with { type: 'text' }
import shortcut from '../.examples/shortcut.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../input/index.js')
})

/* Browser only: happy-dom does not run a script inserted by script. */
const run = hasLayout() ? test : (): void => {}

describe('the shortcut example', () => {
  run('slash in the field is heard, and the page says so', async () => {
    await example(shortcut)
    const field = document.querySelector('helix-headless-input') as HTMLElement
    const control = part(field, 'control') as HTMLInputElement
    control.focus()
    control.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, composed: true, key: '/' }),
    )
    await idle()
    expect(document.getElementById('said')?.textContent).toContain('Heard')
  })
})

/* An empty block as tall as a capital, set on the baseline: its bottom is the
   baseline of the text it is in, and its top is the top of that text's
   capitals. */
const probe = (): HTMLElement => {
  const block = document.createElement('span')
  block.style.cssText = 'block-size: 1cap; display: inline-block; inline-size: 0'
  return block
}

const middle = (block: Element): number => {
  const box = block.getBoundingClientRect()
  return box.bottom - box.height / 2
}

/* What the preview's own sheet does with the key, which every page styling the
   headless key copies: the inside of each face is centered on the capitals
   beside it, and its label on its capitals inside the face. */
describe('the preview example', () => {
  run('centers each key on the words, and each label in its key', async () => {
    await example(preview, sheet)
    await document.fonts.ready
    const words = probe()
    document.querySelector('p')?.prepend(words)
    for (const key of document.querySelectorAll<HTMLElement>('helix-headless-kbd')) {
      const label = probe()
      key.append(label)
      const face = part(key, 'kbd') as HTMLElement
      const box = face.getBoundingClientRect()
      const inside = box.top + 1 + (box.height - 3) / 2
      expect(Math.abs(inside - middle(words))).toBeLessThan(0.1)
      expect(Math.abs(middle(label) - inside)).toBeLessThan(0.1)
    }
  })
})

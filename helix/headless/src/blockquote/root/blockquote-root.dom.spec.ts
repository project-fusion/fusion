import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom, slotted } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

describe('blockquote', () => {
  test('the attribution is a footer beside the passage, not inside it', async () => {
    // The attribution is about the quotation rather than part of it. Inside the
    // quoted text it claims the source said their own name.
    const quote = await mount(
      '<helix-base-blockquote><p>Said so.</p><cite slot="attribution">A</cite></helix-base-blockquote>',
    )
    expect(part(quote, 'blockquote')?.tagName).toBe('BLOCKQUOTE')
    expect(part(quote, 'attribution')?.tagName).toBe('FOOTER')
    expect(slotted(quote, 'attribution')[0]?.textContent).toBe('A')
  })

  test('a source is carried through to cite', async () => {
    const quote = await mount(
      '<helix-base-blockquote cite="https://x.test">x</helix-base-blockquote>',
    )
    expect(part(quote, 'blockquote')?.getAttribute('cite')).toBe('https://x.test')
  })
})

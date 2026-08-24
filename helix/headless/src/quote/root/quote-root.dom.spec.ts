import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@helix-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

describe('quote', () => {
  test('renders a real q, which is what supplies the marks', async () => {
    // The browser inserts the right marks for the document's language and nests
    // them when one quotation sits inside another. Typing them into the content
    // gets both wrong in every language but one.
    const quote = await mount('<helix-headless-quote>said so</helix-headless-quote>')
    expect(part(quote, 'quote')?.tagName).toBe('Q')
  })

  test('a source is carried through to cite', async () => {
    const quote = await mount(
      '<helix-headless-quote cite="https://x.test">said so</helix-headless-quote>',
    )
    expect(part(quote, 'quote')?.getAttribute('cite')).toBe('https://x.test')
  })

  test('no source leaves no empty cite', async () => {
    const quote = await mount('<helix-headless-quote>said so</helix-headless-quote>')
    expect(part(quote, 'quote')?.hasAttribute('cite')).toBe(false)
  })
})

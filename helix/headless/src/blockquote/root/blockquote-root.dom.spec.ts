import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom, slotted } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

describe('blockquote', () => {
  test('the attribution is a caption beside the passage, outside the quotation', async () => {
    /* The attribution is about the quotation. It was a `<footer>` inside the
       `<blockquote>`, so it was read as part of the quoted text, claiming the
       source said their own name. */
    const quote = await mount(
      '<helix-headless-blockquote><p>Said so.</p><cite slot="attribution">A</cite></helix-headless-blockquote>',
    )
    const blockquote = part(quote, 'blockquote')
    const attribution = part(quote, 'attribution')
    expect(blockquote?.tagName).toBe('BLOCKQUOTE')
    expect(attribution?.tagName).toBe('FIGCAPTION')
    expect(attribution?.parentElement).toBe(part(quote, 'figure') as HTMLElement)
    expect(blockquote?.contains(attribution as Node)).toBe(false)
    expect(slotted(quote, 'attribution')[0]?.textContent).toBe('A')
  })

  /* HTML-AAM names a figure from its caption. Read in Chromium's own tree, the
     figure was unnamed, since the caption's words are slotted. The reference
     is by id inside the shadow root, so it resolves there. */
  test('the attribution names the figure', async () => {
    const quote = await mount(
      '<helix-headless-blockquote><p>Said so.</p><cite slot="attribution">A</cite></helix-headless-blockquote>',
    )
    const figure = part(quote, 'figure')
    const id = figure?.getAttribute('aria-labelledby') ?? ''
    expect(id).not.toBe('')
    expect(quote.shadowRoot?.getElementById(id)).toBe(part(quote, 'attribution') as HTMLElement)
  })

  /* The region was re-marked only when a property changed, so an attribution a
     framework rendered later stayed hidden. */
  test('an attribution slotted after the first render is shown', async () => {
    const quote = (await mount(
      '<helix-headless-blockquote><p>Said so.</p></helix-headless-blockquote>',
    )) as HTMLElement & { updateComplete: Promise<unknown> }
    expect((part(quote, 'attribution') as HTMLElement | null)?.hidden).toBe(true)
    const late = document.createElement('span')
    late.slot = 'attribution'
    late.textContent = 'Added later'
    quote.append(late)
    await new Promise((done) => setTimeout(done, 0))
    expect((part(quote, 'attribution') as HTMLElement | null)?.hidden).toBe(false)
  })

  test('a source is carried through to cite', async () => {
    const quote = await mount(
      '<helix-headless-blockquote cite="https://x.test">x</helix-headless-blockquote>',
    )
    expect(part(quote, 'blockquote')?.getAttribute('cite')).toBe('https://x.test')
  })
})

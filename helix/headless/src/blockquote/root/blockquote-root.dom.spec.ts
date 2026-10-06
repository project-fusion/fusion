import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom, slotted } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Quoting = HTMLElement & {
  attribution: string
  marks: boolean
  updateComplete: Promise<unknown>
}

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

  /* A `<figure>` took a 40px indent and a line above and below from the
     browser's sheet, on a tier that ships no sheet to take them away. */
  test('the figure is a role on an element the browser draws no margins on', async () => {
    const quote = await mount(
      '<helix-headless-blockquote>x<span slot="attribution">A</span></helix-headless-blockquote>',
    )
    const figure = part(quote, 'figure')
    expect(figure?.tagName).toBe('DIV')
    expect(figure?.getAttribute('role')).toBe('figure')
    expect(part(quote, 'attribution')?.tagName).toBe('DIV')
  })

  /* With nothing in the caption, the figure had no name and nothing to say: a
     wrapper a reader met before the quotation. */
  test('is a figure only while the attribution has words', async () => {
    const quote = (await mount(
      '<helix-headless-blockquote><p>Said so.</p></helix-headless-blockquote>',
    )) as Quoting
    const figure = part(quote, 'figure')
    expect(figure?.hasAttribute('role')).toBe(false)
    expect(figure?.hasAttribute('aria-labelledby')).toBe(false)
    const late = document.createElement('span')
    late.slot = 'attribution'
    late.textContent = 'A'
    quote.append(late)
    await new Promise((done) => setTimeout(done, 0))
    expect(figure?.getAttribute('role')).toBe('figure')
    expect(figure?.getAttribute('aria-labelledby')).toBe('attribution')
    late.remove()
    await new Promise((done) => setTimeout(done, 0))
    expect(figure?.hasAttribute('role')).toBe(false)
  })

  test('takes its attribution as words, which a slotted one replaces', async () => {
    const quote = (await mount(
      '<helix-headless-blockquote attribution="Maria Lopez">Said so.</helix-headless-blockquote>',
    )) as Quoting
    const caption = part(quote, 'attribution') as HTMLElement
    expect(caption.hidden).toBe(false)
    expect(caption.textContent?.trim()).toBe('Maria Lopez')
    expect(part(quote, 'figure')?.getAttribute('role')).toBe('figure')
    quote.attribution = ''
    await quote.updateComplete
    expect(caption.hidden).toBe(true)
    expect(part(quote, 'figure')?.hasAttribute('role')).toBe(false)
  })

  test('a source is carried through to cite', async () => {
    const quote = await mount(
      '<helix-headless-blockquote cite="https://x.test">x</helix-headless-blockquote>',
    )
    expect(part(quote, 'blockquote')?.getAttribute('cite')).toBe('https://x.test')
  })
})

describe('a blockquote with marks', () => {
  /** What the console was warned while `markup` mounted and settled. */
  const warnedOn = async (markup: string): Promise<string[]> => {
    const warnings: string[] = []
    const original = console.warn
    console.warn = (message: string) => warnings.push(message)
    try {
      await mount(markup)
      await new Promise((done) => setTimeout(done, 5))
    } finally {
      console.warn = original
    }
    return warnings
  }

  test('reflects, so a sheet draws the mark', async () => {
    const quote = (await mount(
      '<helix-headless-blockquote>x</helix-headless-blockquote>',
    )) as Quoting
    quote.marks = true
    await quote.updateComplete
    expect(quote.hasAttribute('marks')).toBe(true)
  })

  /* The element draws the opening mark, so a typed one showed twice. */
  test('a passage that starts with a typed mark is reported once, by its tag', async () => {
    const warnings = await warnedOn(
      '<helix-headless-blockquote marks><p>"Less is more."</p></helix-headless-blockquote>',
    )
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain(
      '<helix-headless-blockquote marks> starts with a typed quotation mark',
    )
  })

  test('is not reported without `marks`, or for a passage with no typed mark', async () => {
    expect(
      await warnedOn(
        '<helix-headless-blockquote><p>"Less is more."</p></helix-headless-blockquote>',
      ),
    ).toEqual([])
    expect(
      await warnedOn(
        '<helix-headless-blockquote marks><p>Less is more.</p></helix-headless-blockquote>',
      ),
    ).toEqual([])
  })
})

describe('a blockquote whose `cite` holds words', () => {
  const warnedOn = async (markup: string): Promise<string[]> => {
    const warnings: string[] = []
    const original = console.warn
    console.warn = (message: string) => warnings.push(message)
    try {
      await mount(markup)
      await new Promise((done) => setTimeout(done, 5))
    } finally {
      console.warn = original
    }
    return warnings
  }

  /* The common mistake: the author's name where the source's URL belongs,
     which the browser keeps as a URL and no reader is shown. */
  test('is reported once, by its tag', async () => {
    const warnings = await warnedOn(
      '<helix-headless-blockquote cite="Maria Lopez, operations manager">x</helix-headless-blockquote>',
    )
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain(
      '<helix-headless-blockquote cite="Maria Lopez, operations manager"> holds words',
    )
  })

  test('a URL, a path or no `cite` is not reported', async () => {
    expect(
      await warnedOn(
        '<helix-headless-blockquote cite="https://example.com/source">x</helix-headless-blockquote>',
      ),
    ).toEqual([])
    expect(
      await warnedOn('<helix-headless-blockquote cite="/talks/2026">x</helix-headless-blockquote>'),
    ).toEqual([])
    expect(await warnedOn('<helix-headless-blockquote>x</helix-headless-blockquote>')).toEqual([])
  })
})

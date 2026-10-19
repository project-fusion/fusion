import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

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

  /* A pull quote beside a large drawn mark showed the browser's marks too,
     and there was no way to take them off. */
  test('no-marks reflects and takes the marks off, still counting the level', async () => {
    const quote = (await mount(
      '<helix-headless-quote no-marks>said so</helix-headless-quote>',
    )) as HTMLElement & { noMarks: boolean; updateComplete: Promise<boolean> }
    expect(quote.noMarks).toBe(true)
    const sheet = String(
      (customElements.get('helix-headless-quote') as unknown as { styles: { cssText: string } })
        .styles.cssText,
    )
    expect(sheet).toContain("[part='quote']::before")
    expect(sheet).toContain('content: no-open-quote')
    expect(sheet).toContain('content: no-close-quote')
    quote.noMarks = false
    await quote.updateComplete
    expect(quote.hasAttribute('no-marks')).toBe(false)
  })

  test('no source leaves no empty cite', async () => {
    const quote = await mount('<helix-headless-quote>said so</helix-headless-quote>')
    expect(part(quote, 'quote')?.hasAttribute('cite')).toBe(false)
  })
})

describe('a quote with typed marks', () => {
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

  /* The `<q>` sets its own marks, so “"typed"” showed both. */
  test('is reported once, by its tag', async () => {
    const warnings = await warnedOn('<helix-headless-quote>"Less is more."</helix-headless-quote>')
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain(
      '<helix-headless-quote> starts or ends with a typed quotation mark',
    )
  })

  test('and a quote without them is not', async () => {
    expect(await warnedOn('<helix-headless-quote>Less is more.</helix-headless-quote>')).toEqual([])
  })

  /* Under `no-marks` the typed marks are the only ones drawn. */
  test('nor one under no-marks', async () => {
    expect(
      await warnedOn('<helix-headless-quote no-marks>"Less is more."</helix-headless-quote>'),
    ).toEqual([])
  })
})

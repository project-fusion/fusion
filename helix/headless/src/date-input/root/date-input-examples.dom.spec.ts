import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, part, registerDom } from '@fusion.dev/helix-testing/dom'
import sheet from '../.examples/preview.css' with { type: 'text' }
import preview from '../.examples/preview.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* Browser only: what is asserted is where the preview's own sheet puts things. */
const run = hasLayout() ? test : (): void => {}

/**
 * The month carets on a right-to-left page, the way the styled tier draws them.
 *
 * **A caret is physical and the month it moves to is not.** The earlier month's
 * control sits at the inline start, which is the right here, and its caret
 * points there, outward, as Pagination's, Carousel's and the styled picker's
 * do. The preview drew the glyph unturned, so the two tiers' previews pointed
 * opposite ways on the same page.
 */
describe('the preview on a right-to-left page', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('dir')
  })

  /* By tag, since the preview opens with its stylesheet's `<link>`. */
  const opened = async (): Promise<HTMLElement> => {
    await example(preview, sheet)
    const host = document.querySelector('helix-headless-date-input') as HTMLElement & {
      toggleOpen(): boolean
    }
    host.toggleOpen()
    return host
  }

  run('the earlier month is on the right and its caret points right', async () => {
    document.documentElement.dir = 'rtl'
    const host = await opened()
    await idle()
    const picker = part(host, 'picker') as HTMLElement
    const previous = part(picker, 'previous') as HTMLElement
    const next = part(picker, 'next') as HTMLElement
    expect(previous.getBoundingClientRect().left).toBeGreaterThan(next.getBoundingClientRect().left)
    expect(getComputedStyle(part(picker, 'previous-mark') as Element).scale).toBe('-1 1')
    expect(getComputedStyle(part(picker, 'next-mark') as Element).scale).toBe('-1 1')
  })

  run('and a left-to-right page keeps the glyphs as drawn', async () => {
    const host = await opened()
    await idle()
    const picker = part(host, 'picker') as HTMLElement
    expect(getComputedStyle(part(picker, 'previous-mark') as Element).scale).toBe('none')
  })
})

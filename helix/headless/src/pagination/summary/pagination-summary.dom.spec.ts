import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom } from '@helix-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const text = (host: HTMLElement): string => host.shadowRoot?.textContent?.trim() ?? ''

describe('pagination summary', () => {
  test('reads which items are on show', async () => {
    const it = await mount(
      '<helix-headless-pagination-summary page="4" page-size="25" total="248"></helix-headless-pagination-summary>',
    )
    expect(text(it)).toBe('76-100 of 248')
  })

  test('the last page is clamped to the total, because it is rarely full', async () => {
    const it = await mount(
      '<helix-headless-pagination-summary page="10" page-size="25" total="248"></helix-headless-pagination-summary>',
    )
    expect(text(it)).toBe('226-248 of 248')
  })

  test('says nothing until it has been told enough to say something', async () => {
    // A wrong count is worse than none: it is the one number in a footer a
    // reader cannot check against anything else on screen.
    const it = await mount(
      '<helix-headless-pagination-summary page="2"></helix-headless-pagination-summary>',
    )
    expect(text(it)).toBe('')
  })

  test('the words are a template and the numbers take a locale', async () => {
    const it = await mount(
      '<helix-headless-pagination-summary format="{from} bis {to} von {total}" locale="de-DE" page="2" page-size="10" total="1500"></helix-headless-pagination-summary>',
    )
    expect(text(it)).toBe('11 bis 20 von 1.500')
  })
})

describe('pagination summary out of range', () => {
  test('a page past the end reads as the last one, not as a backwards range', async () => {
    /* Only the end was clamped, so page 99 of a ten-page result produced a start
       past the total and an end pinned to it: "2,451-248 of 248". A count is the
       one number in a footer a reader cannot check against anything else on
       screen, so a wrong one is the worst kind here. */
    const it = await mount(
      '<helix-headless-pagination-summary page="99" page-size="25" total="248"></helix-headless-pagination-summary>',
    )
    expect(text(it)).toBe('226-248 of 248')
  })

  test('and it agrees with the run beside it, which clamps the same way', async () => {
    const it = await mount(
      '<helix-headless-pagination-summary page="0" page-size="25" total="248"></helix-headless-pagination-summary>',
    )
    expect(text(it)).toBe('1-25 of 248')
  })
})

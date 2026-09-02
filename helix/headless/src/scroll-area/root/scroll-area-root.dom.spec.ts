import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Area = HTMLElement & { updateComplete: Promise<unknown> }

const area = async (attrs = '', body = '<p>One</p>'): Promise<Area> => {
  const host = (await mount(
    `<helix-headless-scroll-area ${attrs}>${body}</helix-headless-scroll-area>`,
  )) as Area
  await host.updateComplete
  return host
}

describe('a scroll area', () => {
  test('hands out the box that scrolls, because the host does not', async () => {
    /* A consumer holding a reference to this element holds the host, and the
       host does not scroll: `scrollBy` on it is a no-op that reports nothing.
       Anything bringing a row into view has to be told which box to move, and
       that box is in here. */
    const host = await area('label="Notes"')
    const scroller = (host as unknown as HTMLElement & { scroller: HTMLElement | null }).scroller
    expect(scroller).toBe(part(host, 'viewport') as HTMLElement)
    expect(scroller).not.toBe(host)
  })

  test('names its region only when it has a name to give', async () => {
    /* An unnamed region is an announcement with no content: a reader is told
       "region" and has learned nothing they did not already know. */
    expect(part(await area('label="Notes"'), 'viewport')?.getAttribute('role')).toBe('region')
    expect(part(await area(), 'viewport')?.getAttribute('role')).toBe(null)
  })

  test('carries the name onto the box that scrolls', async () => {
    expect(part(await area('label="Notes"'), 'viewport')?.getAttribute('aria-label')).toBe('Notes')
  })
})

/**
 * The box scrolls on this tier, with no stylesheet from `helix/styled` involved.
 *
 * **This is the one thing no other spec can see.** Every browser assertion
 * about scrolling in this library runs against the styled tier, whose sheet
 * sets `overflow` itself, so removing the mechanism from `core` changes none of
 * them: measured, `scroll-area`, `virtual-list` and `carousel` all pass in
 * Chromium either way. What breaks without it is the headless consumer, and
 * until #175 nothing exercised one.
 *
 * Asserted through the adopted stylesheet rather than through a computed style,
 * because happy-dom has no layout and answers the empty string for a property
 * that came from an adopted sheet. What is being checked is that the rule is
 * there and that the component marked its box, which is the whole of the
 * contract; that a marked box with a bounded height actually scrolls was
 * measured in Chromium and is written up on `SCROLLER`.
 */
describe('the box a headless consumer gets', () => {
  test('is marked as the one that scrolls, so `scrollTop` exists at all', async () => {
    const host = await area()
    expect((part(host, 'viewport') as HTMLElement).hasAttribute('data-scroller')).toBe(true)
  })

  test('and `core` ships the rule that makes it one, with no token in it', async () => {
    const host = await area()
    const rules = (host.shadowRoot?.adoptedStyleSheets ?? []).flatMap((sheet) =>
      [...(sheet.cssRules ?? [])].map((rule) => rule.cssText),
    )
    const scroller = rules.find((text) => text.includes('data-scroller'))
    expect(scroller).toContain('overflow')
    expect(scroller).not.toContain('var(')
  })
})

import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'
import type { ReactiveElement } from 'lit'

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

/* The inline edges on a right-to-left page, where the start is the right-hand
   edge and `scrollLeft` counts down from zero. Read as a count up, the start
   never had more and the end always did. A browser's: happy-dom lays nothing
   out, so nothing scrolls. */
if (hasLayout()) {
  describe('a scroll area on a right-to-left page', () => {
    afterEach(() => {
      document.documentElement.removeAttribute('dir')
    })

    test('says which inline edge has more, counting from the right', async () => {
      document.documentElement.dir = 'rtl'
      const host = await area(
        'label="Row" style="display:block;inline-size:120px"',
        '<div style="inline-size:400px">Row</div>',
      )
      await new Promise((settled) => {
        requestAnimationFrame(() => {
          settled(undefined)
        })
      })
      const view = part(host, 'viewport') as HTMLElement
      const more = (): string[] =>
        ['inline-start', 'inline-end'].filter((edge) => host.matches(`:state(more-${edge})`))
      const to = async (left: number): Promise<void> => {
        view.scrollLeft = left
        view.dispatchEvent(new Event('scroll'))
        await host.updateComplete
      }
      expect(more()).toEqual(['inline-end'])
      await to(-100)
      expect(more()).toEqual(['inline-start', 'inline-end'])
      await to(-view.scrollWidth)
      expect(more()).toEqual(['inline-start'])
    })
  })
}

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
 * Asserted through the styles the class declares rather than through a
 * computed style, because happy-dom has no layout and answers the empty string
 * for a property that came from an adopted sheet. Not through the shadow root's
 * sheets either: how Lit delivers them depends on what else loaded into the
 * process first, and in a run that mixes the server specs in, the root holds
 * none. What is being checked is that the rule is there and that the component
 * marked its box, which is the whole of the contract; that a marked box with a bounded height actually scrolls was
 * measured in Chromium and is written up on `SCROLLER`.
 */
describe('the box a headless consumer gets', () => {
  test('is marked as the one that scrolls, so `scrollTop` exists at all', async () => {
    const host = await area()
    expect((part(host, 'viewport') as HTMLElement).hasAttribute('data-scroller')).toBe(true)
  })

  test('and `core` ships the rule that makes it one, with no token in it', async () => {
    const host = await area()
    const rules = (host.constructor as typeof ReactiveElement).elementStyles.map((style) =>
      style instanceof CSSStyleSheet
        ? [...style.cssRules].map((rule) => rule.cssText).join('\n')
        : style.cssText,
    )
    const scroller = rules.find((text) => text.includes('data-scroller'))
    expect(scroller).toContain('overflow')
    expect(scroller).not.toContain('var(')
  })
})

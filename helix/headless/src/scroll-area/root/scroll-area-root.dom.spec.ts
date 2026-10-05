import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, hasState, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'
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

describe('the scroll events', () => {
  /* The viewport's own `scroll` stops at the shadow root, so a consumer holding
     the host heard nothing when the content moved. */
  test('are sent again from the host, and do not bubble', async () => {
    const host = await area()
    const heard: Event[] = []
    host.addEventListener('scroll', (event) => heard.push(event))
    host.addEventListener('scrollend', (event) => heard.push(event))
    const view = part(host, 'viewport') as HTMLElement
    view.dispatchEvent(new Event('scroll'))
    view.dispatchEvent(new Event('scrollend'))
    expect(heard.map((event) => event.type)).toEqual(['scroll', 'scrollend'])
    expect(heard.every((event) => event.target === host && !event.bubbles)).toBe(true)
  })
})

/** Gives the viewport a size and a content length, which happy-dom has none of. */
const sized = (view: HTMLElement, client: number, scroll: number): void => {
  Object.defineProperty(view, 'clientHeight', { configurable: true, value: client })
  Object.defineProperty(view, 'scrollHeight', { configurable: true, value: scroll })
}

describe('scrollbars of its own', () => {
  test('are not drawn unless asked for, so the browser keeps its own', async () => {
    const host = await area()
    expect(part(host, 'scrollbar')).toBe(null)
    expect(part(host, 'corner')).toBe(null)
  })

  test('are hidden from screen readers and take no focus, so the viewport stays the way in', async () => {
    const host = await area('label="Notes" scrollbars="always"')
    const bars = [...(host.shadowRoot?.querySelectorAll('[part~="scrollbar"]') ?? [])]
    expect(bars.length).toBe(2)
    expect(bars.every((bar) => bar.getAttribute('aria-hidden') === 'true')).toBe(true)
    expect(host.shadowRoot?.querySelector('[tabindex]:not([part="viewport"])')).toBe(null)
    expect(part(host, 'viewport')?.getAttribute('role')).toBe('region')
  })

  test('under always, on each axis that can scroll, with the corner between them', async () => {
    const host = await area('scrollbars="always"')
    expect(part(host, 'scrollbar-vertical')?.hasAttribute('hidden')).toBe(false)
    expect(part(host, 'scrollbar-horizontal')?.hasAttribute('hidden')).toBe(false)
    expect(part(host, 'corner')?.hasAttribute('hidden')).toBe(false)
    expect(part(host, 'scrollbar-vertical')?.getAttribute('part')).toContain('scrollbar-visible')
    expect(hasState(host, 'scrollbar-vertical')).toBe(true)
  })

  test('and none on an axis whose overflow is hidden', async () => {
    /* How a list that only scrolls down keeps a sideways bar off itself. */
    const host = (await mount(
      '<helix-headless-scroll-area><p>One</p></helix-headless-scroll-area>',
    )) as Area
    await host.updateComplete
    ;(part(host, 'viewport') as HTMLElement).style.overflowX = 'hidden'
    host.setAttribute('scrollbars', 'always')
    await host.updateComplete
    await host.updateComplete
    expect(part(host, 'scrollbar-horizontal')?.hasAttribute('hidden')).toBe(true)
    expect(part(host, 'scrollbar-vertical')?.hasAttribute('hidden')).toBe(false)
    expect(part(host, 'corner')?.hasAttribute('hidden')).toBe(true)
    expect(hasState(host, 'scrollbar-horizontal')).toBe(false)
  })

  test('under auto, only where there is content past the edge', async () => {
    const host = await area('scrollbars="auto"')
    expect(part(host, 'scrollbar-vertical')?.hasAttribute('hidden')).toBe(true)
    const view = part(host, 'viewport') as HTMLElement
    sized(view, 100, 400)
    view.dispatchEvent(new Event('scroll'))
    await host.updateComplete
    expect(part(host, 'scrollbar-vertical')?.hasAttribute('hidden')).toBe(false)
    expect(part(host, 'scrollbar-horizontal')?.hasAttribute('hidden')).toBe(true)
  })

  test('publish the thumb as two fractions on the scrollbar, for the stylesheet to draw', async () => {
    const host = await area('scrollbars="auto"')
    const view = part(host, 'viewport') as HTMLElement
    sized(view, 100, 400)
    view.scrollTop = 150
    view.dispatchEvent(new Event('scroll'))
    await host.updateComplete
    const bar = part(host, 'scrollbar-vertical') as HTMLElement
    expect(bar.style.getPropertyValue('--scroll-area-thumb-fraction').trim()).toBe('0.25')
    expect(bar.style.getPropertyValue('--scroll-area-scroll-fraction').trim()).toBe('0.5')
  })

  test('under scroll, show while the content moves and go after the hide delay', async () => {
    const host = await area('scrollbars="scroll" hide-delay="20"')
    const view = part(host, 'viewport') as HTMLElement
    sized(view, 100, 400)
    const bar = (): string => part(host, 'scrollbar-vertical')?.getAttribute('part') ?? ''
    view.dispatchEvent(new Event('scroll'))
    await host.updateComplete
    expect(bar()).toContain('scrollbar-visible')
    await new Promise((done) => setTimeout(done, 40))
    await host.updateComplete
    expect(bar()).not.toContain('scrollbar-visible')
  })

  test('under hover, show while the pointer is over the scroll area', async () => {
    const host = await area('scrollbars="hover" hide-delay="20"')
    const view = part(host, 'viewport') as HTMLElement
    sized(view, 100, 400)
    view.dispatchEvent(new Event('scroll'))
    await new Promise((done) => setTimeout(done, 40))
    await host.updateComplete
    const bar = (): string => part(host, 'scrollbar-vertical')?.getAttribute('part') ?? ''
    expect(bar()).not.toContain('scrollbar-visible')
    host.dispatchEvent(new Event('pointerenter'))
    await host.updateComplete
    expect(bar()).toContain('scrollbar-visible')
    host.dispatchEvent(new Event('pointerleave'))
    await new Promise((done) => setTimeout(done, 40))
    await host.updateComplete
    expect(bar()).not.toContain('scrollbar-visible')
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

/* Dragging the thumb and pressing the track, which need a laid-out box. The
   headless tier has no stylesheet, so the spec places the scrollbar itself. */
if (hasLayout()) {
  describe('a thumb in a browser', () => {
    const sheet = document.createElement('style')
    sheet.textContent = `
      helix-headless-scroll-area::part(viewport) { block-size: 100%; scrollbar-width: none; }
      helix-headless-scroll-area::part(scrollbar-vertical) {
        position: absolute; inset-block: 0; inset-inline-end: 0; inline-size: 10px;
      }
      helix-headless-scroll-area::part(thumb-vertical) {
        position: absolute; inline-size: 10px;
        block-size: calc(var(--scroll-area-thumb-fraction) * 100%);
        inset-block-start: calc(var(--scroll-area-scroll-fraction) * (100% - var(--scroll-area-thumb-fraction) * 100%));
      }`

    afterEach(() => {
      sheet.remove()
    })

    const tall = async (): Promise<{ bar: HTMLElement; host: Area; view: HTMLElement }> => {
      document.head.append(sheet)
      const body = Array.from(
        { length: 40 },
        (_, at) => `<p style="margin:0;block-size:20px">${at}</p>`,
      ).join('')
      const host = await area(
        'scrollbars="always" style="display:block;position:relative;block-size:200px;inline-size:200px"',
        body,
      )
      await new Promise((settled) => {
        requestAnimationFrame(() => {
          settled(undefined)
        })
      })
      await host.updateComplete
      return {
        bar: part(host, 'scrollbar-vertical') as HTMLElement,
        host,
        view: part(host, 'viewport') as HTMLElement,
      }
    }

    test('scrolls the content by the gearing when dragged', async () => {
      /* 800 of content in 200: a 50 thumb on a 200 track, 150 to travel for 600. */
      const { bar, view } = await tall()
      const thumb = bar.querySelector('[part~="thumb"]') as HTMLElement
      const at = thumb.getBoundingClientRect()
      const x = at.left + 5
      thumb.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          button: 0,
          clientX: x,
          clientY: at.top + 5,
        }),
      )
      bar.dispatchEvent(
        new PointerEvent('pointermove', { bubbles: true, clientX: x, clientY: at.top + 30 }),
      )
      expect(Math.round(view.scrollTop)).toBe(100)
      bar.dispatchEvent(
        new PointerEvent('pointerup', { bubbles: true, clientX: x, clientY: at.top + 30 }),
      )
    })

    test('sends the middle of the thumb to a press on the track', async () => {
      const { bar, view } = await tall()
      const track = bar.getBoundingClientRect()
      bar.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          button: 0,
          clientX: track.left + 5,
          clientY: track.top + 100,
        }),
      )
      expect(Math.round(view.scrollTop)).toBe(300)
      bar.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }))
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

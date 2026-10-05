import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, registerDom } from '@fusion.dev/helix-testing/dom'

/* Browser only: happy-dom lays nothing out. */
const inBrowser = hasLayout() ? test : (): void => {}

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Nav = HTMLElement & {
  behavior: ScrollBehavior
  current: string
  offset: number
  updateComplete: Promise<boolean>
}

describe('page nav', () => {
  test('a link pointing at nothing is skipped rather than throwing', async () => {
    /* Fragments go stale: a heading is renamed and the contents page still
       points at the old id. Marking nothing is right; failing to render is
       not. */
    const nav = (await mount(
      `<helix-headless-outline label="On this page"><a href="#gone">Gone</a></helix-headless-outline>`,
    )) as Nav
    await nav.updateComplete
    expect(nav.querySelector('a')?.hasAttribute('aria-current')).toBe(false)
  })

  test('nothing is marked before anything has been measured', async () => {
    const nav = (await mount('<helix-headless-outline></helix-headless-outline>')) as Nav
    await nav.updateComplete
    expect(nav.current).toBe('')
  })
})
describe('outline scrolling', () => {
  const page = async (attrs = '') => {
    const nav = (await mount(
      `<div><helix-headless-outline ${attrs} label="On this page">` +
        '<a href="#one">One</a><a href="#two">Two</a>' +
        '</helix-headless-outline>' +
        '<section id="one"><h2>One</h2></section><section id="two"><h2>Two</h2></section></div>',
    )) as HTMLElement
    const outline = nav.querySelector('helix-headless-outline') as Nav
    await outline.updateComplete
    return { outline, root: nav }
  }

  const press = (root: HTMLElement, href: string) => {
    const event = new MouseEvent('click', { bubbles: true, button: 0, cancelable: true })
    root.querySelector<HTMLAnchorElement>(`a[href="${href}"]`)?.dispatchEvent(event)
    return event
  }

  test('offset reaches the sections, not only the marker', async () => {
    /* `offset` describes where the top of the readable area is, so the sections
       have to carry it. Read by the marker alone, a fragment click puts the
       heading against the very top of the window, under the masthead whose
       height the consumer just measured for us. */
    const { outline, root } = await page('offset="64"')
    await outline.updateComplete
    expect((root.querySelector('#two') as HTMLElement).style.scrollMarginBlockStart).toBe('64px')
  })

  test('no offset leaves no style attribute behind', async () => {
    const { root } = await page()
    expect((root.querySelector('#two') as HTMLElement).style.scrollMarginBlockStart).toBe('')
  })

  test('the offset is cleared when it goes back to zero', async () => {
    const { outline, root } = await page('offset="64"')
    outline.offset = 0
    await outline.updateComplete
    expect((root.querySelector('#two') as HTMLElement).style.scrollMarginBlockStart).toBe('')
  })

  test('auto leaves the navigation to the browser', async () => {
    /* The whole point of the default: four things happen on a fragment click
       and the platform does all four. Taking the click to do one of them is
       what makes the other three this component's problem. */
    const { root } = await page()
    expect(press(root, '#two').defaultPrevented).toBe(false)
  })

  test('a chosen behavior takes the click, and puts focus where the anchor would have', async () => {
    const { root } = await page('behavior="smooth"')
    expect(press(root, '#two').defaultPrevented).toBe(true)
    const target = root.querySelector('#two') as HTMLElement
    expect(target.getAttribute('tabindex')).toBe('-1')
    expect(document.activeElement).toBe(target)
  })

  /* A contents list is written `<ul><li><a>` more often than as a run of
     anchors, and the outline read only the anchors slotted directly: it found
     no sections in a nested list and did nothing, silently. */
  test('finds the links nested in a list, as it finds a run of anchors', async () => {
    const nav = (await mount(
      '<div><helix-headless-outline behavior="smooth" label="On this page">' +
        '<ul><li><a href="#one">One</a><ul><li><a href="#two">Two</a></li></ul></li></ul>' +
        '</helix-headless-outline>' +
        '<section id="one"><h2>One</h2></section><section id="two"><h2>Two</h2></section></div>',
    )) as HTMLElement
    const outline = nav.querySelector('helix-headless-outline') as Nav
    await outline.updateComplete
    expect(press(nav, '#two').defaultPrevented).toBe(true)
    expect(nav.querySelector('a[href="#two"]')?.getAttribute('aria-current')).toBe('location')
  })

  test('a modified click is left alone, being a new tab rather than a jump', async () => {
    const { root } = await page('behavior="smooth"')
    const event = new MouseEvent('click', {
      bubbles: true,
      button: 0,
      cancelable: true,
      metaKey: true,
    })
    root.querySelector<HTMLAnchorElement>('a[href="#two"]')?.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
  })

  test('a link pointing at nothing is not taken over', async () => {
    const { root } = await page('behavior="smooth"')
    const stale = document.createElement('a')
    stale.setAttribute('href', '#gone')
    root.querySelector('helix-headless-outline')?.append(stale)
    await (root.querySelector('helix-headless-outline') as Nav).updateComplete
    const event = new MouseEvent('click', { bubbles: true, button: 0, cancelable: true })
    stale.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
  })

  test('an outline removed before its scroll lands leaves nothing on the document', async () => {
    /* A route change a moment after a click is the case: the `scrollend`
       listener held the outline until the next page scrolled, and ran on it
       then. Two clicks before the first landed left two. */
    const waiting = new Set<EventListenerOrEventListenerObject>()
    const add = document.addEventListener.bind(document)
    const remove = document.removeEventListener.bind(document)
    document.addEventListener = ((
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions,
    ) => {
      if (type === 'scrollend') {
        waiting.add(listener)
      }
      add(type, listener, options)
    }) as typeof document.addEventListener
    document.removeEventListener = ((
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | EventListenerOptions,
    ) => {
      if (type === 'scrollend') {
        waiting.delete(listener)
      }
      remove(type, listener, options)
    }) as typeof document.removeEventListener
    try {
      const { outline, root } = await page()
      press(root, '#one')
      press(root, '#two')
      expect(waiting.size).toBe(1)
      outline.remove()
      expect(waiting.size).toBe(0)
    } finally {
      document.addEventListener = add
      document.removeEventListener = remove
    }
  })
})

describe('the levels of a flat run', () => {
  const outline = async (body: string): Promise<Nav> => {
    const nav = (await mount(
      `<helix-headless-outline label="On this page">${body}</helix-headless-outline>`,
    )) as Nav
    await nav.updateComplete
    await nav.updateComplete
    return nav
  }

  /** The lists drawn in the shadow root, written short: each link's href in its list. */
  const lists = (nav: Nav): string => {
    const read = (list: Element): string =>
      `[${[...list.children]
        .map((item) => {
          const link = item.querySelector<HTMLSlotElement>(':scope > slot[data-link]')
          const href = link?.assignedElements()[0]?.getAttribute('href') ?? '?'
          const inner = item.querySelector(':scope > slot[role="list"]')
          return inner ? `${href} ${read(inner)}` : href
        })
        .join(' ')}]`
    const top = nav.shadowRoot?.querySelector('nav > slot[role="list"]')
    return top ? read(top) : 'none'
  }

  test('are lists inside list items, nested by data-level', async () => {
    /* A screen reader heard `data-level` as a flat run of links, the level
       being an attribute only a stylesheet read. */
    const nav = await outline(
      '<a href="#a">A</a><a href="#b" data-level="2">B</a><a href="#c" data-level="3">C</a>' +
        '<a href="#d" data-level="2">D</a><a href="#e">E</a>',
    )
    expect(lists(nav)).toBe('[#a [#b [#c] #d] #e]')
    expect(
      [...(nav.shadowRoot?.querySelectorAll('[role="listitem"]') ?? [])].every(
        (item) => item.tagName === 'SLOT' && item.parentElement?.getAttribute('role') === 'list',
      ),
    ).toBe(true)
  })

  test('follow a level that changes, or a link that arrives', async () => {
    const nav = await outline('<a href="#a">A</a><a href="#b">B</a>')
    expect(lists(nav)).toBe('[#a #b]')
    nav.querySelector('[href="#b"]')?.setAttribute('data-level', '2')
    const c = document.createElement('a')
    c.href = '#c'
    nav.append(c)
    await new Promise((settled) => setTimeout(settled, 0))
    await nav.updateComplete
    await nav.updateComplete
    expect(lists(nav)).toBe('[#a [#b] #c]')
  })

  test('are left to a list a consumer wrote, which has its levels already', async () => {
    const nav = await outline('<ul><li><a href="#a">A</a></li></ul>')
    expect(lists(nav)).toBe('none')
    const plain = nav.shadowRoot?.querySelector<HTMLSlotElement>('nav > slot:not([role])')
    expect(plain?.assignedElements().map((one) => one.tagName)).toEqual(['UL'])
  })
})

describe('the heading slot', () => {
  test('holds what is slotted for it, outside the run of links', async () => {
    const nav = (await mount(
      '<helix-headless-outline><h2 slot="heading">Contents</h2><a href="#a">A</a></helix-headless-outline>',
    )) as Nav
    await nav.updateComplete
    await nav.updateComplete
    const heading = nav.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="heading"]')
    expect(heading?.assignedElements().map((one) => one.textContent)).toEqual(['Contents'])
    expect(heading?.parentElement?.getAttribute('part')).toBe('heading')
    expect(nav.shadowRoot?.querySelectorAll('[role="listitem"]').length).toBe(1)
  })

  test('names the navigation, where the browser can point at it from the shadow root', async () => {
    /* happy-dom has no element reflection, so this half runs in a browser. */
    const nav = (await mount(
      '<helix-headless-outline><h2 slot="heading">Contents</h2><a href="#a">A</a></helix-headless-outline>',
    )) as Nav
    await nav.updateComplete
    const landmark = nav.shadowRoot?.querySelector('nav') as Element & {
      ariaLabelledByElements?: Element[] | null
    }
    if (!('ariaLabelledByElements' in landmark)) {
      return
    }
    expect(landmark.ariaLabelledByElements?.map((one) => one.textContent)).toEqual(['Contents'])
  })
})

/* Browser only: which box scrolls is a question of layout. */
describe('following the section in view', () => {
  const rail = async (attrs: string) => {
    /* One link to a line, so the rail is taller than its box at any width:
       inline links share lines, and a wide page fitted the thirtieth in view. */
    const links = Array.from(
      { length: 40 },
      (_, at) => `<a href="#s${at}" style="display: block">Section ${at}</a>`,
    ).join('')
    const sections = Array.from(
      { length: 40 },
      (_, at) => `<section id="s${at}" style="block-size: 400px"><h2>Section ${at}</h2></section>`,
    ).join('')
    const root = (await mount(
      `<div><div id="rail" style="block-size: 120px; overflow-y: auto">` +
        `<helix-headless-outline ${attrs} label="On this page">${links}</helix-headless-outline></div>` +
        `${sections}</div>`,
    )) as HTMLElement
    const outline = root.querySelector('helix-headless-outline') as Nav
    await outline.updateComplete
    return { box: root.querySelector('#rail') as HTMLElement, outline, root }
  }

  inBrowser('scrolls the rail to the link of the section in view, and only the rail', async () => {
    const { box, outline, root } = await rail('follow behavior="smooth"')
    root
      .querySelector<HTMLAnchorElement>('a[href="#s30"]')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0, cancelable: true }))
    await outline.updateComplete
    const link = root.querySelector('a[href="#s30"]') as HTMLElement
    const shown = box.getBoundingClientRect()
    const at = link.getBoundingClientRect()
    expect(at.top).toBeGreaterThanOrEqual(shown.top - 1)
    expect(at.bottom).toBeLessThanOrEqual(shown.bottom + 1)
    expect(box.scrollTop).toBeGreaterThan(0)
  })

  inBrowser('leaves the rail where it is without follow', async () => {
    const { box, outline, root } = await rail('behavior="smooth"')
    root
      .querySelector<HTMLAnchorElement>('a[href="#s30"]')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0, cancelable: true }))
    await outline.updateComplete
    expect(box.scrollTop).toBe(0)
  })
})

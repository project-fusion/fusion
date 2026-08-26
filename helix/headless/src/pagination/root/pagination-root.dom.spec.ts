import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom, role } from '@helix-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/** Everything in the run, in order, with a gap reading as an ellipsis. */
const run = (host: HTMLElement): string[] =>
  [...(host.shadowRoot?.querySelectorAll('[part="page"], [part="gap"]') ?? [])].map(
    (one) => one.textContent?.trim() ?? '',
  )

const pages = (host: HTMLElement): HTMLElement[] => [
  ...(host.shadowRoot?.querySelectorAll<HTMLElement>('[part="page"]') ?? []),
]

describe('pagination', () => {
  test('the host is the landmark, and carries a name it can be chosen by', async () => {
    const nav = await mount('<helix-headless-pagination pages="4"></helix-headless-pagination>')
    expect(role(nav)).toBe('navigation')
    // On internals, so a consumer's own `aria-label` beats it without the
    // element having written an attribute their server output never had.
    expect(nav.getAttributeNames()).toEqual(['pages'])
  })

  test('shows the whole range while there is nothing to hide', async () => {
    const nav = await mount(
      '<helix-headless-pagination default-page="3" pages="5"></helix-headless-pagination>',
    )
    expect(run(nav)).toEqual(['1', '2', '3', '4', '5'])
  })

  test('hides the middle of a long range, keeping both ends and the current run', async () => {
    const nav = await mount(
      '<helix-headless-pagination default-page="7" pages="12"></helix-headless-pagination>',
    )
    expect(run(nav)).toEqual(['1', '…', '6', '7', '8', '…', '12'])
  })

  test('the number of slots does not change as you page', async () => {
    // The claim the truncation is built around: every arrangement that lets the
    // count vary moves the buttons under the pointer between one click and the
    // next. The run around the current page absorbs a gap slot when it meets a
    // boundary, which is what holds it still.
    const widths = new Set<number>()
    for (let page = 1; page <= 20; page += 1) {
      const nav = await mount(
        `<helix-headless-pagination default-page="${page}" pages="20"></helix-headless-pagination>`,
      )
      widths.add(run(nav).length)
    }
    expect([...widths]).toEqual([7])
  })

  test('never draws a gap over a single page', async () => {
    // An ellipsis standing in for one number costs the same space as the number
    // and tells the reader less.
    for (let page = 1; page <= 20; page += 1) {
      const nav = await mount(
        `<helix-headless-pagination default-page="${page}" pages="20"></helix-headless-pagination>`,
      )
      const shown = run(nav)
      for (const [index, slot] of shown.entries()) {
        if (slot !== '…') {
          continue
        }
        const before = Number(shown[index - 1])
        const after = Number(shown[index + 1])
        expect(after - before).toBeGreaterThan(2)
      }
    }
  })

  test('the window widens with `siblings` and the ends with `boundaries`', async () => {
    const nav = await mount(
      '<helix-headless-pagination boundaries="2" default-page="9" pages="20" siblings="2"></helix-headless-pagination>',
    )
    expect(run(nav)).toEqual(['1', '2', '…', '7', '8', '9', '10', '11', '…', '19', '20'])
  })

  test('the page you are on is marked, and is still a control', async () => {
    // A reader who tabs into the run and finds the current page missing from it
    // has lost the only landmark in the row.
    const nav = await mount(
      '<helix-headless-pagination default-page="4" pages="12"></helix-headless-pagination>',
    )
    const current = pages(nav).filter((one) => one.getAttribute('aria-current') === 'page')
    expect(current).toHaveLength(1)
    expect(current[0]?.textContent?.trim()).toBe('4')
    expect(current[0]?.tagName).toBe('BUTTON')
  })

  test('a gap goes to the middle of what it hides, and its label says so', async () => {
    // The binary-search step. `1 … 96 97 98 … 128` hides 2 to 95 on the left and
    // 99 to 127 on the right, so the two gaps land on 49 and 113 and an
    // arbitrary page in a set of any size is a handful of presses.
    const nav = await mount(
      '<helix-headless-pagination default-page="97" pages="128"></helix-headless-pagination>',
    )
    const gaps = [...(nav.shadowRoot?.querySelectorAll('[part="gap"]') ?? [])]
    expect(gaps.map((gap) => gap.getAttribute('aria-label'))).toEqual([
      'Skip to page 49',
      'Skip to page 113',
    ])
  })

  test('pressing a gap lands on the page its label named', async () => {
    const nav = await mount(
      '<helix-headless-pagination default-page="97" pages="128"></helix-headless-pagination>',
    )
    nav.shadowRoot
      ?.querySelector('[part="gap"]')
      ?.dispatchEvent(new Event('click', { bubbles: true }))
    await (nav as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete
    expect((nav as HTMLElement & { page: number }).page).toBe(49)
  })

  test('a gap is announced, because a reader can reach it', async () => {
    // It was `aria-hidden` while it was a decoration. A control cannot be.
    const nav = await mount(
      '<helix-headless-pagination default-page="7" pages="12"></helix-headless-pagination>',
    )
    const items = [...(nav.shadowRoot?.querySelectorAll('[part="item"]') ?? [])]
    expect(items).toHaveLength(7)
    expect(items.filter((one) => one.hasAttribute('aria-hidden'))).toEqual([])
  })

  test('the step pointing off the end is spent, and stays in the row', async () => {
    // Inert rather than absent: a control that disappears at the first page
    // takes the row's width with it and moves everything else under the pointer.
    const first = await mount(
      '<helix-headless-pagination default-page="1" pages="4"></helix-headless-pagination>',
    )
    expect((part(first, 'previous') as HTMLButtonElement).disabled).toBe(true)
    expect((part(first, 'next') as HTMLButtonElement).disabled).toBe(false)

    const last = await mount(
      '<helix-headless-pagination default-page="4" pages="4"></helix-headless-pagination>',
    )
    expect((part(last, 'previous') as HTMLButtonElement).disabled).toBe(false)
    expect((part(last, 'next') as HTMLButtonElement).disabled).toBe(true)
  })
})

describe('pagination state', () => {
  test('moves itself when nothing declared the page', async () => {
    const nav = await mount(
      '<helix-headless-pagination default-page="2" pages="12"></helix-headless-pagination>',
    )
    part(nav, 'next')?.dispatchEvent(new Event('click', { bubbles: true }))
    await (nav as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete
    expect((nav as HTMLElement & { page: number }).page).toBe(3)
  })

  test('announces before it moves, so a listener can refuse', async () => {
    const nav = await mount(
      '<helix-headless-pagination default-page="2" pages="12"></helix-headless-pagination>',
    )
    let announced: string | undefined
    nav.addEventListener('helix-navigate', (event) => {
      announced = (event as CustomEvent<{ value: string }>).detail.value
      // Read from inside the handler: nothing has moved yet, which is what
      // makes `preventDefault()` a refusal rather than an undo.
      expect((nav as HTMLElement & { page: number }).page).toBe(2)
      event.preventDefault()
    })
    part(nav, 'next')?.dispatchEvent(new Event('click', { bubbles: true, cancelable: true }))
    await (nav as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete
    expect(announced).toBe('3')
    expect((nav as HTMLElement & { page: number }).page).toBe(2)
  })

  test('declaring `page` seeds it, and the element still moves', async () => {
    /* Asserted the opposite until 26 Aug 2026, when declaring the property was a
       claim of ownership and the element announced without moving. Control is
       an action now: it applies, and a consumer refuses to take the decision.
       See 294. */
    const nav = await mount(
      '<helix-headless-pagination page="2" pages="12"></helix-headless-pagination>',
    )
    let announced = ''
    nav.addEventListener('helix-navigate', (event) => {
      announced = (event as CustomEvent<{ value: string }>).detail.value
    })
    part(nav, 'next')?.dispatchEvent(new Event('click', { bubbles: true }))
    await (nav as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete
    expect(announced).toBe('3')
    expect((nav as HTMLElement & { page: number }).page).toBe(3)
  })

  test('a step off either end asks for nothing', async () => {
    const nav = await mount(
      '<helix-headless-pagination default-page="1" pages="3"></helix-headless-pagination>',
    )
    let announced = false
    nav.addEventListener('helix-navigate', () => {
      announced = true
    })
    part(nav, 'previous')?.dispatchEvent(new Event('click', { bubbles: true }))
    expect(announced).toBe(false)
  })
})

describe('pagination links', () => {
  test('`href` makes every page a real link, with the number filled in', async () => {
    // The server's output is crawlable, a middle click opens a tab, and the
    // address bar is the state. None of that is reachable from a button.
    const nav = await mount(
      '<helix-headless-pagination default-page="2" href="/results?p={page}" pages="6"></helix-headless-pagination>',
    )
    const shown = pages(nav)
    expect(shown[0]?.tagName).toBe('A')
    expect(shown.map((one) => one.getAttribute('href'))).toEqual([
      '/results?p=1',
      '/results?p=2',
      '/results?p=3',
      '/results?p=4',
      '/results?p=5',
      '/results?p=6',
    ])
  })

  test('the spent step is an anchor with no href, which is not a link at all', async () => {
    const nav = await mount(
      '<helix-headless-pagination default-page="1" href="/p/{page}" pages="6"></helix-headless-pagination>',
    )
    const back = part(nav, 'previous') as HTMLElement
    expect(back.tagName).toBe('A')
    expect(back.hasAttribute('href')).toBe(false)
    expect(back.getAttribute('aria-disabled')).toBe('true')
  })

  test('refusing the change refuses the navigation with it', async () => {
    // Or a router that cancels the event still loses the document underneath
    // it. This is the whole reason the click handler reports back.
    const nav = await mount(
      '<helix-headless-pagination default-page="2" href="/p/{page}" pages="6"></helix-headless-pagination>',
    )
    nav.addEventListener('helix-navigate', (event) => event.preventDefault())
    const click = new Event('click', { bubbles: true, cancelable: true })
    part(nav, 'next')?.dispatchEvent(click)
    expect(click.defaultPrevented).toBe(true)
  })

  test('a change nobody refused leaves the link to follow itself', async () => {
    const nav = await mount(
      '<helix-headless-pagination default-page="2" href="/p/{page}" pages="6"></helix-headless-pagination>',
    )
    const click = new Event('click', { bubbles: true, cancelable: true })
    part(nav, 'next')?.dispatchEvent(click)
    expect(click.defaultPrevented).toBe(false)
  })
})

describe('pagination compact', () => {
  test('reads the two out instead of listing them', async () => {
    const nav = await mount(
      '<helix-headless-pagination compact default-page="7" pages="24"></helix-headless-pagination>',
    )
    expect(part(nav, 'status')?.textContent?.trim()).toBe('7 of 24')
    expect(part(nav, 'list')).toBeNull()
  })

  test('the reading is a template, so word order is the consumer’s', async () => {
    const nav = await mount(
      '<helix-headless-pagination compact default-page="3" pages="9" status-label="{page} / {pages}"></helix-headless-pagination>',
    )
    expect(part(nav, 'status')?.textContent?.trim()).toBe('3 / 9')
  })

  test('the steps still work, so it is the same control in a narrower row', async () => {
    const nav = await mount(
      '<helix-headless-pagination compact default-page="3" pages="9"></helix-headless-pagination>',
    )
    part(nav, 'next')?.dispatchEvent(new Event('click', { bubbles: true }))
    await (nav as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete
    expect(part(nav, 'status')?.textContent?.trim()).toBe('4 of 9')
  })
})

describe('pagination in another language', () => {
  test('every word is a template, so word order stays the consumer’s', async () => {
    // The whole of the i18n contract on the visible strings: nothing here glues
    // a number onto a prefix, so a language that puts them the other way round
    // is written the other way round.
    const nav = await mount(
      `<helix-headless-pagination
        default-page="2"
        gap-label="Passer à la page {page}"
        next-label="Page suivante"
        page-label="Page {page} sur {pages}"
        pages="40"
        previous-label="Page précédente"
      ></helix-headless-pagination>`,
    )
    const first = nav.shadowRoot?.querySelector('[part="page"]')
    expect(first?.getAttribute('aria-label')).toBe('Page 1 sur 40')
    expect(part(nav, 'previous')?.getAttribute('aria-label')).toBe('Page précédente')
    expect(nav.shadowRoot?.querySelector('[part="gap"]')?.getAttribute('aria-label')).toBe(
      'Passer à la page 23',
    )
  })

  test('and the numbers are local too, not just the words', async () => {
    // A component that lets a consumer translate "Page {page} of {pages}" and
    // then prints Latin digits into it has done half the job.
    const nav = await mount(
      '<helix-headless-pagination compact default-page="1234" locale="de-DE" pages="5678"></helix-headless-pagination>',
    )
    expect(part(nav, 'status')?.textContent?.trim()).toBe('1.234 of 5.678')
  })

  test('the visible page number is formatted, and the address is not', async () => {
    // `?page=1,234` is a different address from `?page=1234`, so `href` keeps
    // the raw number while everything a person reads gets the local one.
    const nav = await mount(
      '<helix-headless-pagination default-page="1234" href="/r?p={page}" locale="en-US" pages="2000"></helix-headless-pagination>',
    )
    const current = nav.shadowRoot?.querySelector('[aria-current="page"]')
    expect(current?.textContent?.trim()).toBe('1,234')
    expect(current?.getAttribute('href')).toBe('/r?p=1234')
  })
})

describe('pagination ends', () => {
  test('no jump to either end unless it is asked for', async () => {
    // The gaps already reach any page in a few presses and the last page is one
    // of the two the run always shows, so on a short set these are two more
    // controls for a move already on screen.
    const nav = await mount(
      '<helix-headless-pagination default-page="4" pages="12"></helix-headless-pagination>',
    )
    expect(part(nav, 'first')).toBeNull()
    expect(part(nav, 'last')).toBeNull()
  })

  test('`ends` adds both, outside the two that step', async () => {
    const nav = await mount(
      '<helix-headless-pagination default-page="4" ends pages="12"></helix-headless-pagination>',
    )
    const order = [...(nav.shadowRoot?.querySelectorAll('[part]') ?? [])]
      .map((one) => one.getAttribute('part'))
      .filter((one) => one === 'first' || one === 'previous' || one === 'next' || one === 'last')
    expect(order).toEqual(['first', 'previous', 'next', 'last'])
  })

  test('the jump goes to the end, not one step toward it', async () => {
    const nav = await mount(
      '<helix-headless-pagination default-page="4" ends pages="12"></helix-headless-pagination>',
    )
    part(nav, 'last')?.dispatchEvent(new Event('click', { bubbles: true }))
    await (nav as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete
    expect((nav as HTMLElement & { page: number }).page).toBe(12)
  })

  test('both ends are spent at the end they point at', async () => {
    const first = await mount(
      '<helix-headless-pagination default-page="1" ends pages="6"></helix-headless-pagination>',
    )
    expect((part(first, 'first') as HTMLButtonElement).disabled).toBe(true)
    expect((part(first, 'last') as HTMLButtonElement).disabled).toBe(false)

    const last = await mount(
      '<helix-headless-pagination default-page="6" ends pages="6"></helix-headless-pagination>',
    )
    expect((part(last, 'first') as HTMLButtonElement).disabled).toBe(false)
    expect((part(last, 'last') as HTMLButtonElement).disabled).toBe(true)
  })
})

describe('pagination count', () => {
  /* The count itself moved to `Pagination.Summary`, so what is left to hold the
     root to is the arithmetic it kept: `total` and `page-size` are still how a
     consumer who holds a result set states the page total. */
  test('the page count falls back to the two, so `pages` need not be given', async () => {
    const nav = await mount(
      '<helix-headless-pagination default-page="1" page-size="25" total="248"></helix-headless-pagination>',
    )
    const shown = [...(nav.shadowRoot?.querySelectorAll('[part="page"]') ?? [])]
    expect(shown.at(-1)?.textContent?.trim()).toBe('10')
  })

  test('and `pages` wins where both are given, so there is one current answer', async () => {
    const nav = await mount(
      '<helix-headless-pagination default-page="1" page-size="25" pages="4" total="248"></helix-headless-pagination>',
    )
    const shown = [...(nav.shadowRoot?.querySelectorAll('[part="page"]') ?? [])]
    expect(shown.at(-1)?.textContent?.trim()).toBe('4')
  })

  test('the root reads nothing out, because that is the summary’s job', async () => {
    // It was a part in here and a pair of slots, and a slot can only offer one
    // place: at one end of one row, in one order, on one axis.
    const nav = await mount(
      '<helix-headless-pagination default-page="4" page-size="25" total="248"></helix-headless-pagination>',
    )
    expect(part(nav, 'count')).toBeNull()
    expect(nav.shadowRoot?.querySelector('slot')).toBeNull()
  })
})

describe('pagination out of range', () => {
  test('`page` reports the page on show, not the one it was handed', async () => {
    /* It returned whatever had been written, so a ten-page result rendered page
       10, marked page 10, and reported 99: a consumer syncing their query from
       it read a page that does not exist while the control said otherwise. Not
       a far-fetched value, either. It is a bookmarked link after the result
       shrank. */
    const nav = await mount(
      '<helix-headless-pagination default-page="99" page-size="25" total="248"></helix-headless-pagination>',
    )
    expect((nav as HTMLElement & { page: number }).page).toBe(10)
    expect(nav.shadowRoot?.querySelector('[aria-current="page"]')?.textContent?.trim()).toBe('10')
  })

  test('and rounds, so a fractional page reads as the one it renders', async () => {
    const nav = await mount(
      '<helix-headless-pagination default-page="2.7" pages="10"></helix-headless-pagination>',
    )
    expect((nav as HTMLElement & { page: number }).page).toBe(2)
  })

  test('a page below the first reads as the first', async () => {
    const nav = await mount(
      '<helix-headless-pagination default-page="-4" pages="10"></helix-headless-pagination>',
    )
    expect((nav as HTMLElement & { page: number }).page).toBe(1)
  })
})

describe('pagination with nowhere to go', () => {
  const states = (host: HTMLElement): Set<string> =>
    (host as unknown as { internals: { states: Set<string> } }).internals.states

  test('a single page reports itself empty, so the stylesheet can close over it', async () => {
    /* A control offering one page offers no navigation, and the row it sits in
       should close over it rather than hold a space for a thing that cannot be
       used. Reported through `ElementInternals.states` rather than an attribute,
       because an attribute written at upgrade is markup a server's output never
       had. Whether the rule matched is a browser's question, and is measured
       there. */
    const nav = await mount('<helix-headless-pagination pages="1"></helix-headless-pagination>')
    expect(states(nav).has('empty')).toBe(true)
  })

  test('and stops reporting it the moment there is somewhere to go', async () => {
    const nav = await mount('<helix-headless-pagination pages="1"></helix-headless-pagination>')
    ;(nav as HTMLElement & { pages: number }).pages = 4
    await (nav as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete
    expect(states(nav).has('empty')).toBe(false)
  })

  test('a total that has not loaded is one page, not none', async () => {
    // A result mid-flight renders a single page rather than an empty control
    // that appears later and pushes the layout down.
    const nav = await mount('<helix-headless-pagination></helix-headless-pagination>')
    expect(states(nav).has('empty')).toBe(true)
  })
})

describe('pagination announcements', () => {
  const live = (host: HTMLElement): Element | null =>
    host.shadowRoot?.querySelector('[part="live"]') ?? null

  test('the region is there from the start and says nothing', async () => {
    // A live region populated at the moment it enters the document announces
    // itself on arrival, which for an element that upgrades on load is every
    // page load.
    const nav = await mount(
      '<helix-headless-pagination default-page="4" pages="12"></helix-headless-pagination>',
    )
    expect(live(nav)?.getAttribute('role')).toBe('status')
    expect(live(nav)?.textContent).toBe('')
  })

  test('says where the reader now is, once they have moved', async () => {
    /* Nothing did: moving the page moves `aria-current` onto a different
       element, and a screen reader does not announce that, so a reader who
       pressed 5 heard the word from the button they were on and nothing about
       having arrived. */
    const nav = await mount(
      '<helix-headless-pagination default-page="4" pages="12"></helix-headless-pagination>',
    )
    nav.shadowRoot
      ?.querySelectorAll('[part="page"]')[4]
      ?.dispatchEvent(new Event('click', { bubbles: true }))
    await (nav as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete
    await (nav as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete
    expect(live(nav)?.textContent?.trim()).toBe('Page 5')
  })

  test('and says it for a consumer who moved it themselves', async () => {
    // A controlled consumer assigns `page` and never goes through the request
    // path, and a reader who got there that way deserves the same sentence.
    const nav = await mount(
      '<helix-headless-pagination page="4" pages="12"></helix-headless-pagination>',
    )
    ;(nav as HTMLElement & { page: number }).page = 9
    await (nav as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete
    await (nav as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete
    expect(live(nav)?.textContent?.trim()).toBe('Page 9')
  })
})

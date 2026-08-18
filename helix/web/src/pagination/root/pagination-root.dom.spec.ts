import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom, role, slotted } from '@fusion-io/testing/dom'

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
    const nav = await mount('<helix-pagination pages="4"></helix-pagination>')
    expect(role(nav)).toBe('navigation')
    // On internals, so a consumer's own `aria-label` beats it without the
    // element having written an attribute their server output never had.
    expect(nav.getAttributeNames()).toEqual(['pages'])
  })

  test('shows the whole range while there is nothing to hide', async () => {
    const nav = await mount('<helix-pagination default-page="3" pages="5"></helix-pagination>')
    expect(run(nav)).toEqual(['1', '2', '3', '4', '5'])
  })

  test('hides the middle of a long range, keeping both ends and the current run', async () => {
    const nav = await mount('<helix-pagination default-page="7" pages="12"></helix-pagination>')
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
        `<helix-pagination default-page="${page}" pages="20"></helix-pagination>`,
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
        `<helix-pagination default-page="${page}" pages="20"></helix-pagination>`,
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
      '<helix-pagination boundaries="2" default-page="9" pages="20" siblings="2"></helix-pagination>',
    )
    expect(run(nav)).toEqual(['1', '2', '…', '7', '8', '9', '10', '11', '…', '19', '20'])
  })

  test('the page you are on is marked, and is still a control', async () => {
    // A reader who tabs into the run and finds the current page missing from it
    // has lost the only landmark in the row.
    const nav = await mount('<helix-pagination default-page="4" pages="12"></helix-pagination>')
    const current = pages(nav).filter((one) => one.getAttribute('aria-current') === 'page')
    expect(current).toHaveLength(1)
    expect(current[0]?.textContent?.trim()).toBe('4')
    expect(current[0]?.tagName).toBe('BUTTON')
  })

  test('a gap goes to the middle of what it hides, and its label says so', async () => {
    // The binary-search step. `1 … 96 97 98 … 128` hides 2 to 95 on the left and
    // 99 to 127 on the right, so the two gaps land on 49 and 113 and an
    // arbitrary page in a set of any size is a handful of presses.
    const nav = await mount('<helix-pagination default-page="97" pages="128"></helix-pagination>')
    const gaps = [...(nav.shadowRoot?.querySelectorAll('[part="gap"]') ?? [])]
    expect(gaps.map((gap) => gap.getAttribute('aria-label'))).toEqual([
      'Skip to page 49',
      'Skip to page 113',
    ])
  })

  test('pressing a gap lands on the page its label named', async () => {
    const nav = await mount('<helix-pagination default-page="97" pages="128"></helix-pagination>')
    nav.shadowRoot
      ?.querySelector('[part="gap"]')
      ?.dispatchEvent(new Event('click', { bubbles: true }))
    await (nav as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete
    expect((nav as HTMLElement & { page: number }).page).toBe(49)
  })

  test('a gap is announced, because a reader can reach it', async () => {
    // It was `aria-hidden` while it was a decoration. A control cannot be.
    const nav = await mount('<helix-pagination default-page="7" pages="12"></helix-pagination>')
    const items = [...(nav.shadowRoot?.querySelectorAll('[part="item"]') ?? [])]
    expect(items).toHaveLength(7)
    expect(items.filter((one) => one.hasAttribute('aria-hidden'))).toEqual([])
  })

  test('the step pointing off the end is spent, and stays in the row', async () => {
    // Inert rather than absent: a control that disappears at the first page
    // takes the row's width with it and moves everything else under the pointer.
    const first = await mount('<helix-pagination default-page="1" pages="4"></helix-pagination>')
    expect((part(first, 'previous') as HTMLButtonElement).disabled).toBe(true)
    expect((part(first, 'next') as HTMLButtonElement).disabled).toBe(false)

    const last = await mount('<helix-pagination default-page="4" pages="4"></helix-pagination>')
    expect((part(last, 'previous') as HTMLButtonElement).disabled).toBe(false)
    expect((part(last, 'next') as HTMLButtonElement).disabled).toBe(true)
  })
})

describe('pagination state', () => {
  test('moves itself when nothing declared the page', async () => {
    const nav = await mount('<helix-pagination default-page="2" pages="12"></helix-pagination>')
    part(nav, 'next')?.dispatchEvent(new Event('click', { bubbles: true }))
    await (nav as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete
    expect((nav as HTMLElement & { page: number }).page).toBe(3)
  })

  test('announces before it moves, so a listener can refuse', async () => {
    const nav = await mount('<helix-pagination default-page="2" pages="12"></helix-pagination>')
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

  test('declaring `page` hands it over: it announces and applies nothing', async () => {
    const nav = await mount('<helix-pagination page="2" pages="12"></helix-pagination>')
    let announced = ''
    nav.addEventListener('helix-navigate', (event) => {
      announced = (event as CustomEvent<{ value: string }>).detail.value
    })
    part(nav, 'next')?.dispatchEvent(new Event('click', { bubbles: true }))
    await (nav as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete
    expect(announced).toBe('3')
    expect((nav as HTMLElement & { page: number }).page).toBe(2)
  })

  test('a step off either end asks for nothing', async () => {
    const nav = await mount('<helix-pagination default-page="1" pages="3"></helix-pagination>')
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
      '<helix-pagination default-page="2" href="/results?p={page}" pages="6"></helix-pagination>',
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
      '<helix-pagination default-page="1" href="/p/{page}" pages="6"></helix-pagination>',
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
      '<helix-pagination default-page="2" href="/p/{page}" pages="6"></helix-pagination>',
    )
    nav.addEventListener('helix-navigate', (event) => event.preventDefault())
    const click = new Event('click', { bubbles: true, cancelable: true })
    part(nav, 'next')?.dispatchEvent(click)
    expect(click.defaultPrevented).toBe(true)
  })

  test('a change nobody refused leaves the link to follow itself', async () => {
    const nav = await mount(
      '<helix-pagination default-page="2" href="/p/{page}" pages="6"></helix-pagination>',
    )
    const click = new Event('click', { bubbles: true, cancelable: true })
    part(nav, 'next')?.dispatchEvent(click)
    expect(click.defaultPrevented).toBe(false)
  })
})

describe('pagination compact', () => {
  test('reads the two out instead of listing them', async () => {
    const nav = await mount(
      '<helix-pagination compact default-page="7" pages="24"></helix-pagination>',
    )
    expect(part(nav, 'status')?.textContent?.trim()).toBe('7 of 24')
    expect(part(nav, 'list')).toBeNull()
  })

  test('the reading is a template, so word order is the consumer’s', async () => {
    const nav = await mount(
      '<helix-pagination compact default-page="3" pages="9" status-label="{page} / {pages}"></helix-pagination>',
    )
    expect(part(nav, 'status')?.textContent?.trim()).toBe('3 / 9')
  })

  test('the steps still work, so it is the same control in a narrower row', async () => {
    const nav = await mount(
      '<helix-pagination compact default-page="3" pages="9"></helix-pagination>',
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
      `<helix-pagination
        default-page="2"
        gap-label="Passer à la page {page}"
        next-label="Page suivante"
        page-label="Page {page} sur {pages}"
        pages="40"
        previous-label="Page précédente"
      ></helix-pagination>`,
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
      '<helix-pagination compact default-page="1234" locale="de-DE" pages="5678"></helix-pagination>',
    )
    expect(part(nav, 'status')?.textContent?.trim()).toBe('1.234 of 5.678')
  })

  test('the visible page number is formatted, and the address is not', async () => {
    // `?page=1,234` is a different address from `?page=1234`, so `href` keeps
    // the raw number while everything a person reads gets the local one.
    const nav = await mount(
      '<helix-pagination default-page="1234" href="/r?p={page}" locale="en-US" pages="2000"></helix-pagination>',
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
    const nav = await mount('<helix-pagination default-page="4" pages="12"></helix-pagination>')
    expect(part(nav, 'first')).toBeNull()
    expect(part(nav, 'last')).toBeNull()
  })

  test('`ends` adds both, outside the two that step', async () => {
    const nav = await mount(
      '<helix-pagination default-page="4" ends pages="12"></helix-pagination>',
    )
    const order = [...(nav.shadowRoot?.querySelectorAll('[part]') ?? [])]
      .map((one) => one.getAttribute('part'))
      .filter((one) => one === 'first' || one === 'previous' || one === 'next' || one === 'last')
    expect(order).toEqual(['first', 'previous', 'next', 'last'])
  })

  test('the jump goes to the end, not one step toward it', async () => {
    const nav = await mount(
      '<helix-pagination default-page="4" ends pages="12"></helix-pagination>',
    )
    part(nav, 'last')?.dispatchEvent(new Event('click', { bubbles: true }))
    await (nav as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete
    expect((nav as HTMLElement & { page: number }).page).toBe(12)
  })

  test('both ends are spent at the end they point at', async () => {
    const first = await mount(
      '<helix-pagination default-page="1" ends pages="6"></helix-pagination>',
    )
    expect((part(first, 'first') as HTMLButtonElement).disabled).toBe(true)
    expect((part(first, 'last') as HTMLButtonElement).disabled).toBe(false)

    const last = await mount(
      '<helix-pagination default-page="6" ends pages="6"></helix-pagination>',
    )
    expect((part(last, 'first') as HTMLButtonElement).disabled).toBe(false)
    expect((part(last, 'last') as HTMLButtonElement).disabled).toBe(true)
  })
})

describe('pagination count', () => {
  test('no count unless it has been told enough to say one', async () => {
    // A wrong count is worse than none: it is the one number here a reader
    // cannot check against anything else on screen.
    const nav = await mount('<helix-pagination default-page="2" pages="12"></helix-pagination>')
    expect(part(nav, 'count')).toBeNull()
  })

  test('reads which items are on show', async () => {
    const nav = await mount(
      '<helix-pagination default-page="4" page-size="25" total="248"></helix-pagination>',
    )
    expect(part(nav, 'count')?.textContent?.trim()).toBe('76-100 of 248')
  })

  test('the last page is clamped to the total, because it is rarely full', async () => {
    const nav = await mount(
      '<helix-pagination default-page="10" page-size="25" total="248"></helix-pagination>',
    )
    expect(part(nav, 'count')?.textContent?.trim()).toBe('226-248 of 248')
  })

  test('the page count falls back to the two, so `pages` need not be given', async () => {
    const nav = await mount(
      '<helix-pagination default-page="1" page-size="25" total="248"></helix-pagination>',
    )
    const shown = [...(nav.shadowRoot?.querySelectorAll('[part="page"]') ?? [])]
    expect(shown.at(-1)?.textContent?.trim()).toBe('10')
  })

  test('and `pages` wins where both are given, so there is one current answer', async () => {
    const nav = await mount(
      '<helix-pagination default-page="1" page-size="25" pages="4" total="248"></helix-pagination>',
    )
    const shown = [...(nav.shadowRoot?.querySelectorAll('[part="page"]') ?? [])]
    expect(shown.at(-1)?.textContent?.trim()).toBe('4')
  })

  test('the count is a template too', async () => {
    const nav = await mount(
      '<helix-pagination count-label="Zeige {from} bis {to} von {total}" default-page="2" locale="de-DE" page-size="10" total="1500"></helix-pagination>',
    )
    expect(part(nav, 'count')?.textContent?.trim()).toBe('Zeige 11 bis 20 von 1.500')
  })
})

describe('pagination slots', () => {
  test('a page-size select composes into the row rather than being owned', async () => {
    // A select is a second control with a second piece of state, whose options
    // are the consumer's and whose change means "go and re-query".
    const nav = await mount(
      `<helix-pagination default-page="1" page-size="10" total="90">
        <span slot="start">size</span>
      </helix-pagination>`,
    )
    const slots = [...(nav.shadowRoot?.querySelectorAll('slot') ?? [])].map((one) => one.name)
    expect(slots).toEqual(['start', 'end'])
    expect(slotted(nav, 'start').map((one) => one.textContent)).toEqual(['size'])
  })
})

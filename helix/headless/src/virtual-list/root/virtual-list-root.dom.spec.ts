import { beforeAll, describe, expect, test } from 'bun:test'
import {
  hasLayout,
  mount,
  part,
  registerDom,
  settle,
  type Updatable,
} from '@fusion.dev/helix-testing/dom'

/* Browser only: happy-dom lays nothing out. */
const inBrowser = hasLayout() ? test : (): void => {}

/**
 * The height the headless tier does not choose, and the list cannot work
 * without.
 *
 * **A block size and nothing else, which is the whole of what a headless
 * consumer owes this component.** The `overflow` used to be here too and is not
 * any more: the viewport carries `data-scroller` and `core` ships
 * `[data-scroller] { overflow: auto }` into every shadow root, so the mechanism
 * arrives with the element. The geometry block below asserts that directly
 * rather than trusting this fixture's absence to mean anything.
 *
 * Without a bounded box the family cannot run in a browser at all: measuring
 * moves what is being measured, the two settle into a 378/379 oscillation, and
 * the loop runs on microtasks so no timer can interrupt it.
 *
 * `::part()` because it is the published door into a shadow root, and a
 * document rule beats a shadow one, so nothing here is fighting the component.
 *
 * Each row is the `estimate` tall, so a browser lays the rows out where the
 * arithmetic below expects them, as happy-dom's estimate does.
 */
const VIEWPORT = `helix-headless-virtual-list::part(viewport) {
  block-size: 12rem;
}
helix-headless-virtual-list > [data-index] {
  block-size: 2rem;
}`

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  const sheet = document.createElement('style')
  sheet.textContent = VIEWPORT
  document.head.append(sheet)
})

/** A list of `count` rows, with the data as JSON the way a consumer writes it. */
const list = async (count: number, extra = ''): Promise<Updatable> => {
  const rows = Array.from({ length: count }, (_, at) => ({ name: `Row ${at + 1}` }))
  document.body.innerHTML = `<helix-headless-virtual-list for="rows" estimate="32" label="Rows" ${extra}>
      <template><div class="row"><span data-field="name"></span></div></template>
    </helix-headless-virtual-list>
    <script id="rows" type="application/json">${JSON.stringify(rows)}</script>`
  const host = document.body.firstElementChild as Updatable
  await settle(host)
  return host
}

/** The cloned rows, which are light DOM and are not the template. */
const drawn = (host: Updatable): Element[] =>
  [...host.children].filter((child) => child.tagName !== 'TEMPLATE')

describe('virtual list', () => {
  test('reads its rows from JSON, which is what survives hydration', async () => {
    /* The whole reason for the shape. A property cannot cross React's hydration
       and light-DOM children are the cost being avoided; text in the document
       is neither, and is one node whatever the count. */
    const host = await list(500)
    expect(drawn(host).length).toBeGreaterThan(0)
    expect(drawn(host)[0]?.textContent?.trim()).toBe('Row 1')
  })

  /* Resolved through `getRootNode()`, not `ownerDocument`. Read against the
     document, a list inside another component's shadow root looked in the page,
     found nothing, and drew the empty state this tolerates on purpose when data
     has not arrived, so the wrong tree and the ordinary miss looked the same. */
  test('finds its source in the tree it sits in, not the page', async () => {
    const holder = document.createElement('div')
    document.body.append(holder)
    const root = holder.attachShadow({ mode: 'open' })
    root.innerHTML = `<helix-headless-virtual-list for="rows" estimate="32" label="Rows">
        <template><div>Row</div></template>
      </helix-headless-virtual-list>
      <script id="rows" type="application/json">${JSON.stringify([{ name: 'Inside' }])}</script>`
    const host = root.querySelector('helix-headless-virtual-list') as HTMLElement & Updatable
    await settle(host)
    expect(drawn(host).length).toBe(1)
    holder.remove()
  })

  test('draws a window rather than the set, which is the entire claim', async () => {
    const host = await list(2000)
    expect(drawn(host).length).toBeLessThan(100)
  })

  test('a row says where it is in the set, not where it is in the window', async () => {
    /* `aria-setsize` and `aria-posinset` are what make this honest to a screen
       reader: "one of two thousand" rather than "one of twenty". */
    const host = await list(2000)
    const first = drawn(host)[0]
    expect(first?.getAttribute('aria-setsize')).toBe('2000')
    expect(first?.getAttribute('aria-posinset')).toBe('1')
    expect(first?.getAttribute('role')).toBe('listitem')
  })

  test('rows are light DOM, so a document rule can reach them', async () => {
    // Cloned into the shadow root they would be markup the consumer wrote and
    // could not style, which is the one thing a row template must not be.
    const host = await list(50)
    expect(drawn(host)[0]?.getRootNode()).toBe(document)
  })

  test('a source that is missing or malformed draws nothing rather than throwing', async () => {
    document.body.innerHTML = `<helix-headless-virtual-list for="absent" label="Rows">
        <template><div data-field="name"></div></template>
      </helix-headless-virtual-list>`
    const host = document.body.firstElementChild as Updatable
    await settle(host)
    expect(drawn(host)).toHaveLength(0)

    document.body.innerHTML = `<helix-headless-virtual-list for="bad" label="Rows">
        <template><div data-field="name"></div></template>
      </helix-headless-virtual-list>
      <script id="bad" type="application/json">{ not json</script>`
    const broken = document.body.firstElementChild as Updatable
    await settle(broken)
    expect(drawn(broken)).toHaveLength(0)
  })

  test('the list is named on the viewport, which is what a reader is in', async () => {
    const host = await list(10)
    expect(part(host, 'viewport')?.getAttribute('role')).toBe('list')
    expect(part(host, 'viewport')?.getAttribute('aria-label')).toBe('Rows')
  })

  /* A heading beside the list named a generic wrapper, and the list kept the
     name in `label`. */
  test('takes a name written on the host', async () => {
    const host = await list(10, 'aria-label="Recent files"')
    expect(part(host, 'viewport')?.getAttribute('aria-label')).toBe('Recent files')
  })

  /* Every window move cleared the rows and cloned them again, so a link a
     reader had focused was replaced while its row was still on screen. */
  test('keeps the element of a row that stays in the window', async () => {
    const host = await list(500)
    const row = host.querySelector('[data-index="6"]')
    const viewport = part(host, 'viewport') as HTMLElement
    viewport.scrollTop = 192
    viewport.dispatchEvent(new Event('scroll'))
    await settle(host)
    expect(host.querySelector('[data-index="0"]')).toBeNull()
    expect(host.querySelector('[data-index="6"]')).toBe(row)
    expect(row?.isConnected).toBe(true)
    expect(drawn(host).map((one) => one.getAttribute('data-index'))).toEqual(
      drawn(host).map((_, at) => String(Number(drawn(host)[0]?.getAttribute('data-index')) + at)),
    )
  })

  test('keeps the row holding focus drawn when it scrolls out of the window', async () => {
    const rows = Array.from({ length: 500 }, (_, at) => ({ name: `Row ${at + 1}` }))
    document.body.innerHTML = `<helix-headless-virtual-list for="rows" estimate="32" label="Rows">
        <template><div><a href="#" data-field="name"></a></div></template>
      </helix-headless-virtual-list>
      <script id="rows" type="application/json">${JSON.stringify(rows)}</script>`
    const host = document.body.firstElementChild as Updatable
    await settle(host)
    const link = host.querySelector('[data-index="1"] a') as HTMLElement
    link.focus()
    const viewport = part(host, 'viewport') as HTMLElement
    viewport.scrollTop = 3_200
    viewport.dispatchEvent(new Event('scroll'))
    await settle(host)
    expect(host.querySelector('[data-index="100"]')).not.toBeNull()
    expect(link.isConnected).toBe(true)
    expect(document.activeElement).toBe(link)
  })

  /* The source was read once per `for`, so new JSON written into the script,
     which is how a framework updates a text child, left the old rows drawn. */
  test('draws the rows again when the source is edited', async () => {
    const host = await list(500)
    const source = document.getElementById('rows') as HTMLScriptElement
    source.textContent = JSON.stringify([{ name: 'Only' }])
    await new Promise((resolve) => setTimeout(resolve, 0))
    await settle(host)
    expect(drawn(host)).toHaveLength(1)
    expect(drawn(host)[0]?.textContent?.trim()).toBe('Only')
    expect(drawn(host)[0]?.getAttribute('aria-setsize')).toBe('1')
  })
})

if (hasLayout()) {
  describe('virtual list geometry', () => {
    test('the spacers carry the room the absent rows would have taken', async () => {
      /* Without them a box that scrolls for twenty rows while claiming two
         thousand gives a thumb the size of the track, and dragging it means
         nothing. The two spacers plus the drawn rows are the real length. */
      const host = await mount(`<helix-headless-virtual-list for="tall" estimate="32" label="Rows">
          <template><div style="block-size: 32px"></div></template>
        </helix-headless-virtual-list>
        <script id="tall" type="application/json">${JSON.stringify(
          Array.from({ length: 1000 }, (_, at) => ({ name: String(at) })),
        )}</script>`)
      await settle(host as Updatable)
      const viewport = part(host, 'viewport') as HTMLElement
      expect(viewport.scrollHeight).toBeGreaterThan(1000 * 32 * 0.9)
    })

    test('the scrollport comes with the element, and not from a consumer rule', async () => {
      /* What #175 settled. `overflow` is what makes `scrollTop` exist at all,
         and this component reads `scrollTop` to decide which rows to draw, so
         it is the mechanism rather than a decision and `core` ships it into
         every shadow root against `data-scroller`. The fixture above gives a
         height and no `overflow`, so if that rule stopped arriving this is the
         test that says so.

         Asserted by assigning: a box that is not a scrollport takes a
         `scrollTop` and reports zero back, which `scrollHeight` alone would
         never distinguish, since it counts overflowing content either way. */
      const host = await mount(`<helix-headless-virtual-list for="deep" estimate="32" label="Rows">
          <template><div style="block-size: 32px"></div></template>
        </helix-headless-virtual-list>
        <script id="deep" type="application/json">${JSON.stringify(
          Array.from({ length: 1000 }, (_, at) => ({ name: String(at) })),
        )}</script>`)
      await settle(host as Updatable)
      const viewport = part(host, 'viewport') as HTMLElement
      expect(getComputedStyle(viewport).overflowY).not.toBe('visible')
      viewport.scrollTop = 400
      expect(viewport.scrollTop).toBeGreaterThan(0)
    })
  })
}

describe('placing rows by what they came to', () => {
  test('stamps each row with the item it drew, not its place in the window', async () => {
    /* The controller reads this rather than counting from `window.first`,
       because `hostUpdated` runs before `updated`: what is in the tree when it
       asks is what the previous pass appended. Counting would record the right
       heights against the wrong items every time the window moved. */
    const host = (await mount(
      `<helix-headless-virtual-list for="rows" measured>
         <template><div><span data-field="name"></span></div></template>
       </helix-headless-virtual-list>
       <script id="rows" type="application/json">
         [{"name":"a"},{"name":"b"},{"name":"c"}]
       </script>`,
    )) as HTMLElement

    await (host as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete
    const stamped = [...host.querySelectorAll('[data-index]')]
    expect(stamped.length).toBeGreaterThan(0)
    expect(stamped.map((row) => row.getAttribute('data-index'))).toEqual(
      stamped.map((_, at) => String(at)),
    )
  })
})

/** A list fed through `items`, with the template given, or none. */
const fed = async (
  items: unknown[],
  template = '<template><div><span data-field="name"></span></div></template>',
): Promise<HTMLElement & Updatable & Record<string, unknown>> => {
  document.body.innerHTML = `<helix-headless-virtual-list estimate="32" label="Rows">${template}</helix-headless-virtual-list>`
  const host = document.body.firstElementChild as HTMLElement & Updatable & Record<string, unknown>
  host.items = items
  await settle(host)
  return host
}

const named = (count: number) =>
  Array.from({ length: count }, (_, at) => ({ name: `Row ${at + 1}` }))

describe('items given as a property', () => {
  test('draws the rows from the array, with no script', async () => {
    const host = await fed(named(500))
    expect(drawn(host)[0]?.textContent?.trim()).toBe('Row 1')
    expect(drawn(host)[0]?.getAttribute('aria-setsize')).toBe('500')
  })

  test('draws a new array when it is replaced', async () => {
    const host = await fed(named(500))
    host.items = [{ name: 'Only' }]
    await settle(host)
    expect(drawn(host)).toHaveLength(1)
    expect(drawn(host)[0]?.textContent?.trim()).toBe('Only')
    expect(drawn(host)[0]?.getAttribute('aria-setsize')).toBe('1')
  })

  test('wins over a script named by for', async () => {
    document.body.innerHTML = `<helix-headless-virtual-list for="rows" label="Rows">
        <template><div data-field="name"></div></template>
      </helix-headless-virtual-list>
      <script id="rows" type="application/json">[{"name":"From the script"}]</script>`
    const host = document.body.firstElementChild as HTMLElement &
      Updatable &
      Record<string, unknown>
    host.items = [{ name: 'From the property' }]
    await settle(host)
    expect(drawn(host).map((row) => row.textContent?.trim())).toEqual(['From the property'])
  })

  test('writes attributes from fields, and follows a path of keys', async () => {
    const host = await fed(
      [
        { author: { name: 'Ada' }, open: true, url: '/a' },
        { author: { name: 'Grace' }, open: false },
      ],
      `<template><a data-field="author.name" data-field-href="url" data-field-data-open="open"></a></template>`,
    )
    const [first, second] = drawn(host)
    expect(first?.textContent).toBe('Ada')
    expect(first?.getAttribute('href')).toBe('/a')
    expect(first?.getAttribute('data-open')).toBe('')
    expect(second?.textContent).toBe('Grace')
    expect(second?.hasAttribute('href')).toBe(false)
    expect(second?.hasAttribute('data-open')).toBe(false)
  })
})

describe('items drawn by a function', () => {
  test('draws what renderItem returns into a row of its own', async () => {
    document.body.innerHTML =
      '<helix-headless-virtual-list label="Rows"></helix-headless-virtual-list>'
    const host = document.body.firstElementChild as HTMLElement &
      Updatable &
      Record<string, unknown>
    host.renderItem = (item: { name: string }, index: number) => `${index + 1}. ${item.name}`
    host.items = named(300)
    await settle(host)
    const first = drawn(host)[0]
    expect(first?.tagName).toBe('DIV')
    expect(first?.textContent).toContain('1. Row 1')
    expect(first?.getAttribute('role')).toBe('listitem')
    expect(first?.getAttribute('aria-posinset')).toBe('1')
    expect(first?.getAttribute('aria-setsize')).toBe('300')
  })

  test('draws again with a new function, and takes a DOM node', async () => {
    document.body.innerHTML =
      '<helix-headless-virtual-list label="Rows"></helix-headless-virtual-list>'
    const host = document.body.firstElementChild as HTMLElement &
      Updatable &
      Record<string, unknown>
    host.items = named(3)
    host.renderItem = (item: { name: string }) => item.name
    await settle(host)
    host.renderItem = (item: { name: string }) => {
      const strong = document.createElement('strong')
      strong.textContent = item.name.toUpperCase()
      return strong
    }
    await settle(host)
    expect(drawn(host)[0]?.querySelector('strong')?.textContent).toBe('ROW 1')
    expect(drawn(host)).toHaveLength(3)
  })

  test('wins over a row template', async () => {
    const host = await fed(named(2))
    host.renderItem = () => 'drawn'
    await settle(host)
    expect(drawn(host).map((row) => row.textContent)).toEqual(['drawn', 'drawn'])
  })
})

describe('the keyboard', () => {
  const press = async (host: Updatable, key: string): Promise<void> => {
    ;(document.activeElement as HTMLElement).dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key }),
    )
    await settle(host)
  }

  test('one row holds the tab stop', async () => {
    const host = await fed(named(50))
    const stops = drawn(host).map((row) => row.getAttribute('tabindex'))
    expect(stops[0]).toBe('0')
    expect(stops.slice(1).every((stop) => stop === '-1')).toBe(true)
  })

  test('reaches an item that is not drawn, and focuses it', async () => {
    const host = await fed(named(5000))
    ;(host.querySelector('[data-index="0"]') as HTMLElement).focus()
    expect(host.querySelector('[data-index="4999"]')).toBeNull()
    await press(host, 'End')
    expect((document.activeElement as HTMLElement).dataset.index).toBe('4999')
    expect(document.activeElement?.getAttribute('tabindex')).toBe('0')
    await press(host, 'ArrowUp')
    expect((document.activeElement as HTMLElement).dataset.index).toBe('4998')
    await press(host, 'Home')
    expect((document.activeElement as HTMLElement).dataset.index).toBe('0')
    await press(host, 'ArrowDown')
    expect((document.activeElement as HTMLElement).dataset.index).toBe('1')
  })

  test("leaves keys pressed in a row's own controls alone", async () => {
    const host = await fed(
      named(50),
      '<template><div><input data-field-value="name"></div></template>',
    )
    const field = host.querySelector('[data-index="3"] input') as HTMLInputElement
    field.focus()
    const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Home' })
    field.dispatchEvent(event)
    await settle(host)
    expect(event.defaultPrevented).toBe(false)
    expect(document.activeElement).toBe(field)
    // Focus inside the row moved the tab stop to it.
    expect(host.querySelector('[data-index="3"]')?.getAttribute('tabindex')).toBe('0')
  })

  test("takes the other rows' links out of the tab order, and gives them back", async () => {
    const host = await fed(
      named(50),
      '<template><div><a href="#" data-field="name"></a></div></template>',
    )
    const link = (at: number) => host.querySelector(`[data-index="${at}"] a`) as HTMLElement
    expect(link(0).hasAttribute('tabindex')).toBe(false)
    expect(link(1).getAttribute('tabindex')).toBe('-1')
    link(1).focus()
    await settle(host)
    expect(link(1).hasAttribute('tabindex')).toBe(false)
    expect(link(0).getAttribute('tabindex')).toBe('-1')
    expect(host.querySelector('[data-index="1"]')?.getAttribute('tabindex')).toBe('0')
  })

  test('moves to the item whose text starts with the letters typed', async () => {
    const host = await fed(
      ['Apple', 'Banana', 'Blueberry', 'Cherry', 'Bilberry'].map((name) => ({ name })),
    )
    ;(host.querySelector('[data-index="0"]') as HTMLElement).focus()
    await press(host, 'b')
    expect((document.activeElement as HTMLElement).dataset.index).toBe('1')
    // "bi" is a word, which starts the search on the item it is on.
    await press(host, 'i')
    expect((document.activeElement as HTMLElement).dataset.index).toBe('4')
    const again = await fed(['Banana', 'Blueberry'].map((name) => ({ name })))
    ;(again.querySelector('[data-index="0"]') as HTMLElement).focus()
    // The same letter again moves on to the next item that starts with it.
    await press(again, 'b')
    await press(again, 'b')
    expect((document.activeElement as HTMLElement).dataset.index).toBe('0')
  })

  test('types against text-field, or a string item itself, and reaches an undrawn item', async () => {
    const host = await fed(
      [...named(4000), { name: 'Zed' }].map((item) => ({ person: item })),
      '<template><div><span data-field="person.name"></span></div></template>',
    )
    ;(host.querySelector('[data-index="0"]') as HTMLElement).focus()
    await press(host, 'z')
    expect((document.activeElement as HTMLElement).dataset.index).toBe('4000')
    const drawnBy = await fed([{ person: { name: 'Ada' } }, { person: { name: 'Grace' } }], '')
    drawnBy.textField = 'person.name'
    drawnBy.renderItem = (item: { person: { name: string } }) => item.person.name
    await settle(drawnBy)
    ;(drawnBy.querySelector('[data-index="0"]') as HTMLElement).focus()
    await press(drawnBy, 'g')
    expect((document.activeElement as HTMLElement).dataset.index).toBe('1')
    const plain = await fed(['one', 'two', 'three'], '')
    plain.renderItem = (item: string) => item
    await settle(plain)
    ;(plain.querySelector('[data-index="0"]') as HTMLElement).focus()
    await press(plain, 't')
    expect((document.activeElement as HTMLElement).dataset.index).toBe('1')
  })

  test('moves the tab stop to the first row on screen when its row scrolls away', async () => {
    const host = await fed(named(500))
    const viewport = part(host, 'viewport') as HTMLElement
    viewport.scrollTop = 3_200
    viewport.dispatchEvent(new Event('scroll'))
    await settle(host)
    expect(host.querySelector('[tabindex="0"]')?.getAttribute('data-index')).toBe('100')
  })
})

describe('taking a reader to an item', () => {
  test('scrollToIndex scrolls the item into view and draws it', async () => {
    const host = await fed(named(5000))
    ;(host as unknown as { scrollToIndex: (at: number, options?: object) => void }).scrollToIndex(
      300,
      { align: 'start' },
    )
    await settle(host)
    expect((part(host, 'viewport') as HTMLElement).scrollTop).toBe(300 * 32)
    expect(host.querySelector('[data-index="300"]')).not.toBeNull()
  })
})

describe('what is on screen, and the end of the set', () => {
  /* happy-dom lays nothing out, so the box is given the height a stylesheet
     would give it. */
  const tall = (host: HTMLElement): HTMLElement => {
    const viewport = part(host, 'viewport') as HTMLElement
    Object.defineProperty(viewport, 'clientHeight', { configurable: true, value: 192 })
    return viewport
  }

  const scrollTo = async (host: Updatable, viewport: HTMLElement, top: number): Promise<void> => {
    viewport.scrollTop = top
    viewport.dispatchEvent(new Event('scroll'))
    await settle(host)
  }

  /* Chromium's scroll anchoring moved the offset to 138, 522 and back to 330
     on one scroll, as the window swapped the rows above what was on screen. */
  test('takes its box out of the browser’s scroll anchoring', async () => {
    const host = await fed(named(500))
    expect(part(host, 'viewport')?.hasAttribute('data-virtual')).toBe(true)
    if (hasLayout()) {
      expect(getComputedStyle(part(host, 'viewport') as HTMLElement).overflowAnchor).toBe('none')
    }
  })

  test('reports the items on screen as they change', async () => {
    const host = await fed(named(500))
    const viewport = tall(host)
    let heard = 0
    let said: unknown
    host.addEventListener('helix-range-change', (event) => {
      heard += 1
      said = (event as CustomEvent).detail
    })
    await scrollTo(host, viewport, 330)
    expect(heard).toBe(1)
    expect(said).toEqual({ first: 10, last: 17 })
    // Row 10 at the top, and row 16 cut by the bottom edge.
    expect((host as unknown as { range: unknown }).range).toEqual({ first: 10, last: 17 })
    // The same rows at either edge: nothing moved.
    await scrollTo(host, viewport, 340)
    expect(heard).toBe(1)
  })

  test('asks for more within a screen of the end, once for each length', async () => {
    const host = await fed(named(20))
    const viewport = tall(host)
    let asked = 0
    host.addEventListener('helix-load-more', () => {
      asked += 1
    })
    await scrollTo(host, viewport, 0)
    expect(asked).toBe(0)
    // 640 of rows, 192 on screen: from 256 down, less than a screen is left.
    await scrollTo(host, viewport, 300)
    expect(asked).toBe(1)
    await scrollTo(host, viewport, 400)
    expect(asked).toBe(1)
    host.items = named(40)
    await settle(host)
    await scrollTo(host, viewport, 1_000)
    expect(asked).toBe(2)
  })
})

describe('loading more', () => {
  test('marks the list busy and draws a row after the last item while loading', async () => {
    const host = await fed(named(3))
    expect(part(host, 'loading')).toBeNull()
    expect(part(host, 'viewport')?.hasAttribute('aria-busy')).toBe(false)
    host.loading = true
    await settle(host)
    const row = part(host, 'loading') as HTMLElement
    expect(row.getAttribute('role')).toBe('listitem')
    expect(row.hasAttribute('aria-posinset')).toBe(false)
    expect(row.textContent?.trim()).toBe('Loading more')
    expect(part(host, 'viewport')?.getAttribute('aria-busy')).toBe('true')
    // After the room the undrawn rows stand for, so it closes the list.
    expect(row.previousElementSibling?.getAttribute('part')).toBe('after')
    host.loadingLabel = 'Fetching files'
    await settle(host)
    expect(row.textContent?.trim()).toBe('Fetching files')
  })

  test('keeps a slotted loading row of your own out of the rows it draws', async () => {
    const host = await fed(named(3))
    const own = document.createElement('span')
    own.slot = 'loading'
    own.textContent = 'One moment'
    host.append(own)
    host.loading = true
    await settle(host)
    expect(own.isConnected).toBe(true)
    expect(own.hasAttribute('data-index')).toBe(false)
    expect(drawn(host).filter((row) => row !== own)).toHaveLength(3)
  })

  test('asks for nothing while loading', async () => {
    const host = await fed(named(20))
    const viewport = part(host, 'viewport') as HTMLElement
    Object.defineProperty(viewport, 'clientHeight', { configurable: true, value: 192 })
    let asked = 0
    host.addEventListener('helix-load-more', () => {
      asked += 1
    })
    host.loading = true
    await settle(host)
    viewport.scrollTop = 400
    viewport.dispatchEvent(new Event('scroll'))
    await settle(host)
    expect(asked).toBe(0)
    host.loading = false
    await settle(host)
    expect(asked).toBe(1)
  })
})

describe('rows shorter than the estimate', () => {
  /* Chromium only: the height is read from what was laid out. Rows of 21
     pixels against the estimate's 32 left the last rows undrawn at the end of
     the scroll, with a blank spacer under the window. */
  inBrowser('reaches the last row by scrollToIndex', async () => {
    document.body.innerHTML = `<helix-headless-virtual-list class="short" label="Rows"></helix-headless-virtual-list>`
    const host = document.body.firstElementChild as HTMLElement &
      Updatable &
      Record<string, unknown>
    const sheet = document.createElement('style')
    sheet.textContent = 'helix-headless-virtual-list.short > [data-index] { block-size: 21px }'
    document.head.append(sheet)
    try {
      host.renderItem = (item: { name: string }) => item.name
      host.items = named(5000)
      await settle(host)
      ;(host as unknown as { scrollToIndex: (at: number) => void }).scrollToIndex(4999)
      await settle(host)
      await new Promise((resolve) => requestAnimationFrame(resolve))
      await settle(host)
      const last = host.querySelector('[data-index="4999"]') as HTMLElement | null
      expect(last).not.toBeNull()
      const viewport = part(host, 'viewport') as HTMLElement
      expect(
        Math.abs(
          (last as HTMLElement).getBoundingClientRect().bottom -
            viewport.getBoundingClientRect().bottom,
        ),
      ).toBeLessThan(2)
    } finally {
      sheet.remove()
    }
  })
})

describe('choosing items', () => {
  const press = async (host: Updatable, key: string, init: KeyboardEventInit = {}) => {
    ;(document.activeElement as HTMLElement).dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key, ...init }),
    )
    await settle(host)
  }
  const row = (host: HTMLElement, at: number) =>
    host.querySelector(`[data-index="${at}"]`) as HTMLElement

  test('is a list box of options, each saying whether it is chosen', async () => {
    const host = await fed(named(50))
    host.selectionMode = 'multiple'
    host.keyField = 'name'
    host.value = 'Row 2'
    await settle(host)
    const viewport = part(host, 'viewport') as HTMLElement
    expect(viewport.getAttribute('role')).toBe('listbox')
    expect(viewport.getAttribute('aria-multiselectable')).toBe('true')
    expect(row(host, 0).getAttribute('role')).toBe('option')
    expect([0, 1].map((at) => row(host, at).getAttribute('aria-selected'))).toEqual([
      'false',
      'true',
    ])
    host.selectionMode = undefined
    await settle(host)
    expect(viewport.getAttribute('role')).toBe('list')
    expect(row(host, 0).getAttribute('role')).toBe('listitem')
    expect(row(host, 1).hasAttribute('aria-selected')).toBe(false)
  })

  test('selects with Space or a press, asking first, and keeps the keys in order', async () => {
    const host = await fed(named(50))
    host.selectionMode = 'multiple'
    host.keyField = 'name'
    await settle(host)
    const asked: string[] = []
    let changed = 0
    host.addEventListener('helix-before-change', (event) =>
      asked.push((event as CustomEvent<{ value: string }>).detail.value),
    )
    host.addEventListener('change', () => {
      changed += 1
    })
    row(host, 2).click()
    await settle(host)
    row(host, 0).focus()
    await press(host, ' ')
    expect(host.value).toBe('Row 1,Row 3')
    expect(asked).toEqual(['Row 3', 'Row 1,Row 3'])
    expect(changed).toBe(2)
    host.addEventListener('helix-before-change', (event) => event.preventDefault(), { once: true })
    await press(host, ' ')
    expect(host.value).toBe('Row 1,Row 3')
  })

  test('takes in a range with Shift, and every item with Control or Command and A', async () => {
    const host = await fed(named(5000))
    host.selectionMode = 'multiple'
    host.keyField = 'name'
    await settle(host)
    row(host, 0).focus()
    await press(host, ' ')
    await press(host, 'ArrowDown', { shiftKey: true })
    await press(host, 'ArrowDown', { shiftKey: true })
    expect(host.value).toBe('Row 1,Row 2,Row 3')
    expect((document.activeElement as HTMLElement).dataset.index).toBe('2')
    await press(host, 'a', { ctrlKey: true })
    expect(String(host.value).split(',')).toHaveLength(5000)
  })

  test('chooses one item at a time in single, and lets it go on a second press', async () => {
    const host = await fed(['alpha', 'bravo', 'charlie'], '')
    host.renderItem = (item: string) => item
    host.selectionMode = 'single'
    await settle(host)
    row(host, 1).click()
    await settle(host)
    expect(host.value).toBe('bravo')
    row(host, 2).click()
    await settle(host)
    expect(host.value).toBe('charlie')
    row(host, 2).click()
    await settle(host)
    expect(host.value).toBe('')
    expect(part(host, 'viewport')?.hasAttribute('aria-multiselectable')).toBe(false)
  })
})

describe('a grid', () => {
  const press = async (host: Updatable, key: string, init: KeyboardEventInit = {}) => {
    ;(document.activeElement as HTMLElement).dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key, ...init }),
    )
    await settle(host)
  }
  const focusedAt = (): string | undefined => (document.activeElement as HTMLElement).dataset.index

  test('lays the items out in equal columns, and a list in none', async () => {
    const host = await fed(named(10))
    const slot = (): HTMLSlotElement =>
      part(host, 'viewport')?.querySelector('slot:not([name])') as HTMLSlotElement
    expect(slot().getAttribute('style')).toBe(null)
    host.columns = 4
    await settle(host)
    expect(slot().style.display).toBe('grid')
    /* A browser writes the zero back with its unit. */
    expect(slot().style.gridTemplateColumns.replace('0px', '0')).toBe('repeat(4, minmax(0, 1fr))')
    // Every item still says its place in the whole set.
    expect(drawn(host).map((row) => row.getAttribute('aria-posinset'))).toEqual(
      Array.from({ length: 10 }, (_, at) => String(at + 1)),
    )
  })

  test('windows the set a line at a time, and reports the items on screen', async () => {
    const host = await fed(named(4000))
    host.columns = 4
    await settle(host)
    const viewport = part(host, 'viewport') as HTMLElement
    Object.defineProperty(viewport, 'clientHeight', { configurable: true, value: 192 })
    viewport.scrollTop = 320
    viewport.dispatchEvent(new Event('scroll'))
    await settle(host)
    // Line 10 at the top, six lines on screen at 32 pixels a line.
    expect((host as unknown as { range: unknown }).range).toEqual({ first: 40, last: 64 })
    const indices = drawn(host).map((row) => Number((row as HTMLElement).dataset.index))
    expect(indices[0]).toBe((indices[0] as number) - ((indices[0] as number) % 4))
    expect(indices.length % 4).toBe(0)
    expect(indices.length).toBeLessThan(4000)
  })

  test('moves along a line with Left and Right, and down a column with Down', async () => {
    const host = await fed(named(4000))
    host.columns = 4
    await settle(host)
    ;(host.querySelector('[data-index="0"]') as HTMLElement).focus()
    await press(host, 'ArrowRight')
    expect(focusedAt()).toBe('1')
    await press(host, 'ArrowDown')
    expect(focusedAt()).toBe('5')
    await press(host, 'ArrowLeft')
    expect(focusedAt()).toBe('4')
    await press(host, 'End')
    expect(focusedAt()).toBe('3999')
    await press(host, 'ArrowUp')
    expect(focusedAt()).toBe('3995')
  })

  test('takes in a range along the line with Shift, in a list that selects', async () => {
    const host = await fed(named(40))
    host.columns = 4
    host.selectionMode = 'multiple'
    host.keyField = 'name'
    await settle(host)
    ;(host.querySelector('[data-index="0"]') as HTMLElement).focus()
    await press(host, ' ')
    await press(host, 'ArrowRight', { shiftKey: true })
    await press(host, 'ArrowDown', { shiftKey: true })
    expect(host.value).toBe('Row 1,Row 2,Row 3,Row 4,Row 5,Row 6')
  })
})

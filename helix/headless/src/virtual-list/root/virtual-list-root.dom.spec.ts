import { beforeAll, describe, expect, test } from 'bun:test'
import {
  hasLayout,
  mount,
  part,
  registerDom,
  settle,
  type Updatable,
} from '@fusion.dev/helix-testing/dom'

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
 */
const VIEWPORT = `helix-headless-virtual-list::part(viewport) {
  block-size: 12rem;
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

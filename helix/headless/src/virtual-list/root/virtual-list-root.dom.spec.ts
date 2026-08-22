import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom, type Updatable } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const settle = async (host: Updatable): Promise<void> => {
  while ((await host.updateComplete) === false) {
    // Reading the source takes a second pass, the way validity does elsewhere.
  }
}

/** A list of `count` rows, with the data as JSON the way a consumer writes it. */
const list = async (count: number, extra = ''): Promise<Updatable> => {
  const rows = Array.from({ length: count }, (_, at) => ({ name: `Row ${at + 1}` }))
  document.body.innerHTML = `<helix-base-virtual-list for="rows" estimate="32" label="Rows" ${extra}>
      <template><div class="row"><span data-field="name"></span></div></template>
    </helix-base-virtual-list>
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
    document.body.innerHTML = `<helix-base-virtual-list for="absent" label="Rows">
        <template><div data-field="name"></div></template>
      </helix-base-virtual-list>`
    const host = document.body.firstElementChild as Updatable
    await settle(host)
    expect(drawn(host)).toHaveLength(0)

    document.body.innerHTML = `<helix-base-virtual-list for="bad" label="Rows">
        <template><div data-field="name"></div></template>
      </helix-base-virtual-list>
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
})

if (hasLayout()) {
  describe('virtual list geometry', () => {
    test('the spacers carry the room the absent rows would have taken', async () => {
      /* Without them a box that scrolls for twenty rows while claiming two
         thousand gives a thumb the size of the track, and dragging it means
         nothing. The two spacers plus the drawn rows are the real length. */
      const host = await mount(`<helix-base-virtual-list for="tall" estimate="32" label="Rows">
          <template><div style="block-size: 32px"></div></template>
        </helix-base-virtual-list>
        <script id="tall" type="application/json">${JSON.stringify(
          Array.from({ length: 1000 }, (_, at) => ({ name: String(at) })),
        )}</script>`)
      await settle(host as Updatable)
      const viewport = part(host, 'viewport') as HTMLElement
      expect(viewport.scrollHeight).toBeGreaterThan(1000 * 32 * 0.9)
    })
  })
}

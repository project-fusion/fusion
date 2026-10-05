import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Inspector = HTMLElement & {
  defaultDepth: number
  updateComplete: Promise<unknown>
  value: unknown
}

const VALUE = {
  meta: { branch: 'main' },
  name: 'dpl',
  ok: true,
  size: 42,
  tags: ['a', 'b'],
  target: null,
}

const inspector = async (attrs = '', value: unknown = VALUE): Promise<Inspector> => {
  const host = (await mount(
    `<helix-headless-object-inspector ${attrs}></helix-headless-object-inspector>`,
  )) as Inspector
  host.value = value
  await host.updateComplete
  return host
}

const rows = (host: HTMLElement): HTMLElement[] => [
  ...(host.shadowRoot?.querySelectorAll<HTMLElement>('[part~="row"]') ?? []),
]
const tree = (host: HTMLElement): HTMLElement =>
  host.shadowRoot?.querySelector('[part="tree"]') as HTMLElement
const press = async (host: Inspector, key: string, init: KeyboardEventInit = {}): Promise<void> => {
  tree(host).dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key, ...init }))
  await host.updateComplete
}
/* By the part's second name, which is the one a consumer can reach: nothing
   follows `::part()` with an attribute selector. */
const active = (host: HTMLElement): HTMLElement | undefined =>
  rows(host).find((row) => row.getAttribute('part')?.split(' ').includes('row-active'))

describe('an object inspector', () => {
  test('opens the root and nothing under it, so the shape shows before the contents', async () => {
    const host = await inspector()
    expect(rows(host)).toHaveLength(7)
    expect(rows(host)[0]?.getAttribute('aria-expanded')).toBe('true')
    const meta = rows(host).find((row) => row.textContent?.includes('meta'))
    expect(meta?.getAttribute('aria-expanded')).toBe('false')
  })

  test('draws each type as its own part, and a string keeps its quotes', async () => {
    const host = await inspector()
    const part = (name: string): string | undefined =>
      host.shadowRoot?.querySelector(`[part="${name}"]`)?.textContent ?? undefined
    expect([part('string'), part('number'), part('boolean'), part('null')]).toEqual([
      '"dpl"',
      '42',
      'true',
      'null',
    ])
  })

  test('says how many entries a branch holds, open or closed', async () => {
    const host = await inspector()
    const counts = [...(host.shadowRoot?.querySelectorAll('[part="count"]') ?? [])].map((count) =>
      count.textContent?.trim(),
    )
    expect(counts).toEqual(['6 keys', '1 key', '2 items'])
  })

  test('is a tree grid whose rows say their real level, position and set size', async () => {
    const host = await inspector()
    expect(tree(host).getAttribute('role')).toBe('treegrid')
    const name = rows(host)[2]
    expect([
      name?.getAttribute('role'),
      name?.getAttribute('aria-level'),
      name?.getAttribute('aria-posinset'),
      name?.getAttribute('aria-setsize'),
      [...(name?.children ?? [])].map((cell) => cell.getAttribute('role')).join(),
    ]).toEqual(['row', '2', '2', '6', 'gridcell'])
  })

  test('the row the keys are on holds the one tab stop and takes focus as they move', async () => {
    const host = await inspector()
    const stops = () => rows(host).map((row) => row.getAttribute('tabindex'))
    expect(stops()).toEqual(['0', '-1', '-1', '-1', '-1', '-1', '-1'])
    expect(tree(host).hasAttribute('tabindex')).toBe(false)
    expect(tree(host).hasAttribute('aria-activedescendant')).toBe(false)
    await press(host, 'ArrowDown')
    expect(host.shadowRoot?.activeElement === active(host)).toBe(true)
    expect(stops()).toEqual(['-1', '0', '-1', '-1', '-1', '-1', '-1'])
    await press(host, 'ArrowDown')
    expect(active(host)?.textContent).toContain('name')
    await press(host, 'End')
    expect(active(host)?.textContent).toContain('target')
    await press(host, 'Home')
    expect(active(host)).toBe(rows(host)[0])
  })

  test('the row the keys are on is a part of its own, and the name moves with it', async () => {
    const host = await inspector()
    const named = (): HTMLElement[] =>
      rows(host).filter((row) => (row.getAttribute('part') ?? '').split(' ').includes('row-active'))
    expect(named()).toEqual([active(host) as HTMLElement])
    await press(host, 'ArrowDown')
    expect(named()).toEqual([rows(host)[1] as HTMLElement])
  })

  test('opens a branch with Right, enters it with Right, and goes back up with Left', async () => {
    const host = await inspector()
    await press(host, 'ArrowDown')
    await press(host, 'ArrowRight')
    expect(active(host)?.getAttribute('aria-expanded')).toBe('true')
    await press(host, 'ArrowRight')
    expect(active(host)?.textContent).toContain('branch')
    await press(host, 'ArrowLeft')
    expect(active(host)?.textContent).toContain('meta')
    await press(host, 'ArrowLeft')
    expect(active(host)?.getAttribute('aria-expanded')).toBe('false')
  })

  /* A shut row's caret points along the line, so on a right-to-left page it
     points left and the left arrow is the one that opens. The right arrow had
     opened a row whose caret pointed away from it. */
  describe('on a right-to-left page', () => {
    afterEach(() => {
      document.documentElement.removeAttribute('dir')
    })

    test('opens and enters with Left, and goes back up with Right', async () => {
      document.documentElement.dir = 'rtl'
      const host = await inspector()
      await press(host, 'ArrowDown')
      await press(host, 'ArrowLeft')
      expect(active(host)?.getAttribute('aria-expanded')).toBe('true')
      await press(host, 'ArrowLeft')
      expect(active(host)?.textContent).toContain('branch')
      await press(host, 'ArrowRight')
      expect(active(host)?.textContent).toContain('meta')
      await press(host, 'ArrowRight')
      expect(active(host)?.getAttribute('aria-expanded')).toBe('false')
      await press(host, 'ArrowRight')
      expect(active(host)).toBe(rows(host)[0])
    })

    /* A row was one bidirectional run, so the closing quote of a string went
       to the far end of the row, `"name: "dpl`, and a row holding a number
       read left to right beside one holding a string that read right to left.
       Each piece is isolated now: the key is at the start of the line, and a
       value, being code, reads left to right inside its quotes. */
    if (hasLayout()) {
      test('keeps a string inside its quotes, and its key at the start of the line', async () => {
        document.documentElement.dir = 'rtl'
        const host = await inspector()
        for (const [name, kind] of [
          ['name', 'string'],
          ['size', 'number'],
        ] as const) {
          const row = rows(host).find(
            (one) => one.querySelector('[part="key"]')?.textContent === name,
          ) as HTMLElement
          const key = (row.querySelector('[part="key"]') as HTMLElement).getBoundingClientRect()
          const value = row.querySelector(`[part="${kind}"]`) as HTMLElement
          expect(key.left).toBeGreaterThan(value.getBoundingClientRect().right)
          const text = [...value.childNodes].find((one) => one.nodeType === Node.TEXT_NODE) as Text
          const glyph = (index: number): DOMRect => {
            const range = document.createRange()
            range.setStart(text, index)
            range.setEnd(text, index + 1)
            return range.getBoundingClientRect()
          }
          expect(glyph(0).left).toBeLessThan(glyph(text.length - 1).left)
        }
      })
    }
  })

  test('copies the active row: a branch as JSON, a string as itself', async () => {
    const written: string[] = []
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async (text: string) => void written.push(text) },
    })
    const host = await inspector()
    await press(host, 'ArrowDown')
    await press(host, 'c', { metaKey: true })
    await press(host, 'ArrowDown')
    await press(host, 'c', { ctrlKey: true })
    await Promise.resolve()
    expect(written).toEqual([JSON.stringify({ branch: 'main' }, null, 2), 'dpl'])
  })

  test('opens as many levels as it is asked to', async () => {
    const host = await inspector('default-depth="2"')
    expect(rows(host)).toHaveLength(10)
  })

  test('reads its value from the JSON a page holds, by id', async () => {
    const host = (await mount(`<div>
      <script type="application/json" id="source">{"a": [1, 2]}</script>
      <helix-headless-object-inspector for="source"></helix-headless-object-inspector>
    </div>`)) as HTMLElement
    const element = host.querySelector('helix-headless-object-inspector') as Inspector
    await element.updateComplete
    await element.updateComplete
    expect(rows(element).map((row) => row.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      '{…} 1 key',
      'a: […] 2 items',
    ])
  })

  test('leaves a source that does not parse empty rather than throwing', async () => {
    const host = (await mount(`<div>
      <script type="application/json" id="broken">{"a": </script>
      <helix-headless-object-inspector for="broken"></helix-headless-object-inspector>
    </div>`)) as HTMLElement
    const element = host.querySelector('helix-headless-object-inspector') as Inspector
    await element.updateComplete
    expect(rows(element)).toHaveLength(0)
  })
})

describe('an object inspector given a new value', () => {
  /* An inspector showing live data, a polled response or a debug panel, closed
     every branch and went back to the root on each update. */
  test('keeps the branches a reader opened and the row the keys were on', async () => {
    const host = await inspector()
    await press(host, 'ArrowDown')
    await press(host, 'ArrowRight')
    expect(rows(host)).toHaveLength(8)
    await press(host, 'ArrowDown')
    expect(active(host)?.textContent).toContain('branch')
    host.value = { ...VALUE, meta: { branch: 'next' } }
    await host.updateComplete
    expect(rows(host)).toHaveLength(8)
    expect(active(host)?.textContent).toContain('"next"')
  })

  test('opens a branch the old value did not have to the default depth', async () => {
    const host = await inspector('', { a: 1 })
    host.value = { a: 1, added: { inner: true } }
    await host.updateComplete
    const added = rows(host).find((row) => row.textContent?.includes('added'))
    expect(added?.getAttribute('aria-expanded')).toBe('false')
    expect(rows(host)[0]?.getAttribute('aria-expanded')).toBe('true')
  })
})

describe('an object inspector read by its keys', () => {
  test('moves to the next key that starts with what was typed', async () => {
    const host = await inspector()
    await press(host, 't')
    expect(active(host)?.textContent).toContain('tags')
    await press(host, 't')
    expect(active(host)?.textContent).toContain('target')
  })

  test('opens every branch beside the active row with `*`', async () => {
    const host = await inspector()
    await press(host, 'ArrowDown')
    await press(host, '*')
    const opened = rows(host)
      .filter((row) => row.getAttribute('aria-level') === '2')
      .filter((row) => row.getAttribute('aria-expanded') === 'true')
    expect(opened.map((row) => row.querySelector('[part="key"]')?.textContent)).toEqual([
      'meta',
      'tags',
    ])
  })
})

describe('an object inspector in another language', () => {
  test('counts and names its tree in the words it is given', async () => {
    const host = await inspector(
      'item-label="{count} Eintrag" items-label="{count} Einträge" key-label="{count} Schlüssel" keys-label="{count} Schlüssel" tree-label="Wert"',
    )
    const counts = [...(host.shadowRoot?.querySelectorAll('[part="count"]') ?? [])].map((count) =>
      count.textContent?.trim(),
    )
    expect(counts).toEqual(['6 Schlüssel', '1 Schlüssel', '2 Einträge'])
    expect(tree(host).getAttribute('aria-label')).toBe('Wert')
  })

  /* A heading beside the inspector named a generic wrapper, and the tree was
     announced as "Value". */
  test('takes a name written on the host onto the tree', async () => {
    const host = await inspector('aria-label="Response"')
    expect(tree(host).getAttribute('aria-label')).toBe('Response')
  })
})

/* Nothing in an inspector is chosen. Chromium takes the active descendant of a
   single-selection tree as selected unless a row says otherwise, so every
   arrow press was also announced as a selection. */
describe('an object inspector that selects nothing', () => {
  test('says nothing about being selected on any row, the focused one included', async () => {
    const host = await inspector()
    await press(host, 'ArrowDown')
    expect(rows(host).some((row) => row.hasAttribute('aria-selected'))).toBe(false)
  })

  test('a row focused some other way becomes the active row, and says so', async () => {
    const host = (await inspector()) as Inspector & { active: string }
    const heard: string[] = []
    host.addEventListener('helix-activate', (event) =>
      heard.push((event as CustomEvent<{ value: string }>).detail.value),
    )
    rows(host)[3]?.focus()
    await host.updateComplete
    expect(host.active).toBe('/ok')
    expect(heard).toEqual(['/ok'])
    expect(rows(host)[3]?.getAttribute('tabindex')).toBe('0')
  })

  test('a script writing active moves the row and leaves focus where it is', async () => {
    const host = (await inspector()) as Inspector & { active: string }
    const outside = document.createElement('button')
    document.body.append(outside)
    outside.focus()
    host.active = '/name'
    await host.updateComplete
    expect(active(host)?.textContent).toContain('name')
    expect(document.activeElement === outside).toBe(true)
    outside.remove()
  })
})

describe('a branch opened or closed by a reader', () => {
  const listen = (host: HTMLElement): string[] => {
    const heard: string[] = []
    for (const name of ['helix-before-open', 'helix-before-close']) {
      host.addEventListener(name, (event) => heard.push(event.type))
    }
    host.addEventListener('toggle', (event) => {
      const { newState, oldState } = event as Event & { newState: string; oldState: string }
      heard.push(`toggle ${oldState} ${newState}`)
    })
    return heard
  }

  test('asks first, then says so with toggle, and expanded holds it', async () => {
    const host = (await inspector()) as Inspector & { expanded: string[] }
    const heard = listen(host)
    await press(host, 'ArrowDown')
    await press(host, 'ArrowRight')
    expect(heard).toEqual(['helix-before-open', 'toggle closed open'])
    expect(host.expanded.sort()).toEqual(['', '/meta'])
    await press(host, 'Enter')
    expect(heard.slice(2)).toEqual(['helix-before-close', 'toggle open closed'])
    expect(host.expanded).toEqual([''])
  })

  test('stays closed when the request is refused, and says nothing after', async () => {
    const host = (await inspector()) as Inspector & { expanded: string[] }
    const heard = listen(host)
    host.addEventListener('helix-before-open', (event) => event.preventDefault())
    await press(host, 'ArrowDown')
    await press(host, 'ArrowRight')
    expect(heard).toEqual(['helix-before-open'])
    expect(rows(host)[1]?.getAttribute('aria-expanded')).toBe('false')
  })

  test('asks once for every branch `*` opens', async () => {
    const host = (await inspector()) as Inspector & { expanded: string[] }
    const heard = listen(host)
    await press(host, 'ArrowDown')
    await press(host, '*')
    expect(heard).toEqual(['helix-before-open', 'toggle closed open'])
    expect(host.expanded.sort()).toEqual(['', '/meta', '/tags'])
    await press(host, '*')
    // Nothing left to open, so nothing is asked.
    expect(heard).toHaveLength(2)
  })

  test('a script writing expanded sends nothing', async () => {
    const host = (await inspector()) as Inspector & { expanded: string[] }
    const heard = listen(host)
    host.expanded = ['', '/meta']
    await host.updateComplete
    expect(heard).toEqual([])
  })
})

type Pathed = Inspector & { active: string; expanded: string[]; filter: string }

describe('the active row as a path', () => {
  test('reads as a JSON Pointer, and a move asks first and then says where it went', async () => {
    const host = (await inspector()) as Pathed
    expect(host.active).toBe('')
    const heard: string[] = []
    host.addEventListener('helix-before-activate', (event) =>
      heard.push(`before ${(event as CustomEvent<{ value: string }>).detail.value} ${host.active}`),
    )
    host.addEventListener('helix-activate', (event) =>
      heard.push(`after ${(event as CustomEvent<{ value: string }>).detail.value} ${host.active}`),
    )
    await press(host, 'ArrowDown')
    expect(heard).toEqual(['before /meta ', 'after /meta /meta'])
  })

  test('stays where it is when the move is refused', async () => {
    const host = (await inspector()) as Pathed
    host.addEventListener('helix-before-activate', (event) => event.preventDefault())
    let told = 0
    host.addEventListener('helix-activate', () => told++)
    await press(host, 'ArrowDown')
    expect([host.active, told, active(host)]).toEqual(['', 0, rows(host)[0]])
  })

  test('written, moves to the path and opens the branches around it, and sends nothing', async () => {
    const host = (await inspector()) as Pathed
    let told = 0
    host.addEventListener('helix-activate', () => told++)
    host.active = '/meta/branch'
    await host.updateComplete
    expect(active(host)?.textContent).toContain('branch')
    expect(host.active).toBe('/meta/branch')
    expect(host.expanded.sort()).toEqual(['', '/meta'])
    expect(told).toBe(0)
  })

  test('a path the value does not hold moves to the nearest branch above it', async () => {
    const host = (await inspector()) as Pathed
    host.active = '/meta/missing'
    await host.updateComplete
    expect(host.active).toBe('/meta')
  })
})

describe('the open branches as paths', () => {
  test('read as the branches a reader opened', async () => {
    const host = (await inspector()) as Pathed
    await press(host, 'ArrowDown')
    await press(host, 'ArrowRight')
    expect(host.expanded.sort()).toEqual(['', '/meta'])
  })

  test('written, open exactly those, and keep the active row', async () => {
    const host = (await inspector()) as Pathed
    host.active = '/size'
    await host.updateComplete
    host.expanded = ['', '/tags']
    await host.updateComplete
    expect(rows(host).filter((row) => row.getAttribute('aria-expanded') === 'true')).toHaveLength(2)
    expect(host.active).toBe('/size')
  })

  test('a branch closed around the active row hands it to that branch', async () => {
    const host = (await inspector()) as Pathed
    host.active = '/meta/branch'
    await host.updateComplete
    host.expanded = ['']
    await host.updateComplete
    expect(host.active).toBe('/meta')
  })

  test('a new value keeps the branches written before it arrived', async () => {
    const host = (await mount(
      '<helix-headless-object-inspector></helix-headless-object-inspector>',
    )) as Pathed
    host.expanded = ['', '/meta']
    host.value = VALUE
    await host.updateComplete
    expect(rows(host).some((row) => row.textContent?.includes('branch'))).toBe(true)
  })
})

const live = (host: HTMLElement): string | undefined =>
  host.shadowRoot?.querySelector('[part="live"]')?.textContent ?? undefined

describe('a filtered object inspector', () => {
  test('shows the entries that match, by key or by value, and the branches that lead to them, open', async () => {
    const host = await inspector('filter="MAIN"')
    expect(rows(host).map((row) => row.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      '{…} 6 keys',
      'meta: {…} 1 key',
      'branch: "main"',
    ])
    const matched = rows(host).filter((row) =>
      (row.getAttribute('part') ?? '').split(' ').includes('row-match'),
    )
    expect(matched.map((row) => row.getAttribute('aria-level'))).toEqual(['3'])
  })

  test('counts each set among the entries it shows', async () => {
    const host = await inspector('filter="ta"')
    const tags = rows(host).find((row) => row.textContent?.includes('tags'))
    expect([tags?.getAttribute('aria-posinset'), tags?.getAttribute('aria-setsize')]).toEqual([
      '2',
      '3',
    ])
  })

  test('keeps everything under a branch whose key matches', async () => {
    const host = await inspector('filter="tags"')
    await press(host, 'End')
    expect(active(host)?.textContent).toContain('tags')
    await press(host, 'ArrowRight')
    expect(rows(host)).toHaveLength(4)
  })

  test('says how many entries matched, and moves off a row the filter hid', async () => {
    const host = (await inspector()) as Pathed
    host.active = '/size'
    await host.updateComplete
    host.filter = 'a'
    await host.updateComplete
    await new Promise((done) => requestAnimationFrame(done))
    await host.updateComplete
    expect(live(host)).toBe('6 results')
    expect(active(host)?.getAttribute('part')).toContain('row-match')
    host.filter = 'branch'
    await host.updateComplete
    await new Promise((done) => requestAnimationFrame(done))
    await host.updateComplete
    expect(live(host)).toBe('1 result')
  })

  test('shows no row where nothing matches', async () => {
    const host = await inspector('filter="nowhere"')
    expect(rows(host)).toHaveLength(0)
    expect(tree(host).hasAttribute('aria-activedescendant')).toBe(false)
  })
})

describe('an object inspector with a filter field', () => {
  const field = (host: HTMLElement): HTMLInputElement =>
    host.shadowRoot?.querySelector('[part="search-field"]') as HTMLInputElement

  test('draws no field without filterable', async () => {
    const host = await inspector()
    expect(field(host)).toBeNull()
  })

  test('filters as it is typed in, asking first and saying so after', async () => {
    const host = await inspector('filterable filter-label="Find"')
    expect(field(host).getAttribute('aria-label')).toBe('Find')
    const heard: string[] = []
    host.addEventListener('helix-filter', (event) =>
      heard.push(`filter ${(event as CustomEvent<{ value: string }>).detail.value}`),
    )
    host.addEventListener('helix-filtered', (event) =>
      heard.push(`filtered ${(event as CustomEvent<{ value: string }>).detail.value}`),
    )
    field(host).value = 'dpl'
    field(host).dispatchEvent(new Event('input', { bubbles: true }))
    await host.updateComplete
    expect(heard).toEqual(['filter dpl', 'filtered dpl'])
    expect(rows(host)).toHaveLength(2)
  })

  test('keeps the filter it had when the request is refused', async () => {
    const host = await inspector('filterable')
    host.addEventListener('helix-filter', (event) => event.preventDefault())
    field(host).value = 'dpl'
    field(host).dispatchEvent(new Event('input', { bubbles: true }))
    await host.updateComplete
    expect([field(host).value, rows(host).length]).toEqual(['', 7])
  })

  test('Down moves from the field to the row the keys are on', async () => {
    const host = await inspector('filterable')
    field(host).focus()
    field(host).dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowDown' }))
    await host.updateComplete
    expect(host.shadowRoot?.activeElement === active(host)).toBe(true)
  })
})

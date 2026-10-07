import { beforeAll, describe, expect, test } from 'bun:test'
import {
  hasState,
  mount,
  notYetDefined,
  part,
  registerDom,
  role,
  slotted,
} from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const markup = `
  <helix-headless-list label="Files">
    <helix-headless-list-item><span>One</span></helix-headless-list-item>
    <helix-headless-list-item><span>Two</span></helix-headless-list-item>
  </helix-headless-list>`

describe('list', () => {
  test('is a list, so the rows are counted rather than read as loose passages', async () => {
    const list = await mount(markup)
    expect(role(list)).toBe('list')
    expect(list.hasAttribute('role')).toBe(false)
    for (const item of list.children) {
      expect(role(item as HTMLElement)).toBe('listitem')
    }
  })

  test('a row never becomes a link', async () => {
    // A router renders its own anchor and cannot render it inside this shadow
    // root, so a row that navigated would force a full page load. The label is
    // the target instead.
    const list = await mount(markup)
    const item = list.children[0] as HTMLElement
    expect(item.shadowRoot?.querySelector('a')).toBeNull()
    expect(slotted(item)[0]?.textContent).toBe('One')
  })
})

type Updatable = HTMLElement & { updateComplete: Promise<unknown> }

/** Mounts a list and lets its second render, which reads the children, land. */
const settled = async (markup: string): Promise<Updatable> => {
  const list = (await mount(markup)) as Updatable
  await list.updateComplete
  return list
}

/* An empty list drew nothing at all, so a reader could not tell no rows from a
   broken list, and there was no place for a link to add the first. */
describe('an empty list', () => {
  test('shows the empty row where it was given words, as a list item, and takes the empty state', async () => {
    const list = await settled(
      '<helix-headless-list label="Files" empty-label="No files yet"></helix-headless-list>',
    )
    const row = part(list, 'empty') as HTMLElement
    expect(row.getAttribute('role')).toBe('listitem')
    expect(row.hidden).toBe(false)
    expect(row.textContent?.trim()).toBe('No files yet')
    expect(hasState(list, 'empty')).toBe(true)
  })

  test('shows no row without words or content, and still takes the empty state', async () => {
    const list = await settled('<helix-headless-list label="Files"></helix-headless-list>')
    expect((part(list, 'empty') as HTMLElement).hidden).toBe(true)
    expect(hasState(list, 'empty')).toBe(true)
  })

  test('takes your own content, as one grid cell in a list that selects', async () => {
    const list = await settled(`<helix-headless-list label="Files" selection-mode="single">
        <p slot="empty">Nothing here. <a href="#add">Add a file</a></p>
      </helix-headless-list>`)
    const row = part(list, 'empty') as HTMLElement
    expect(row.getAttribute('role')).toBe('row')
    expect(row.hidden).toBe(false)
    const cell = row.querySelector('[role="gridcell"]') as HTMLElement
    const slot = cell.querySelector('slot') as HTMLSlotElement
    expect(slot.assignedElements()).toEqual([list.querySelector('[slot="empty"]') as Element])
  })

  test('drops the row and the state once a row arrives', async () => {
    const list = await settled(
      '<helix-headless-list label="Files" empty-label="No files yet"></helix-headless-list>',
    )
    list.append(document.createElement('helix-headless-list-item'))
    await new Promise((done) => setTimeout(done, 0))
    await list.updateComplete
    expect(part(list, 'empty')).toBeNull()
    expect(hasState(list, 'empty')).toBe(false)
  })
})

/**
 * What the console was warned while `markup` mounted and settled. The warning
 * is in development builds only, which `test:dom` runs as.
 */
const warnedOn = async (markup: string): Promise<string[]> => {
  const warnings: string[] = []
  const original = console.warn
  console.warn = (message: string) => warnings.push(message)
  try {
    await settled(markup)
    await new Promise((done) => setTimeout(done, 5))
  } finally {
    console.warn = original
  }
  return warnings
}

describe('an interactive list with no name', () => {
  test('is reported once, by its tag', async () => {
    const warnings = await warnedOn(
      '<helix-headless-list selection-mode="single"><helix-headless-list-item>One</helix-headless-list-item></helix-headless-list>',
    )
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('<helix-headless-list> has no accessible name')
  })

  test('and one named by `label` or `aria-label`, or a list a reader only reads, is not', async () => {
    for (const markup of [
      '<helix-headless-list selection-mode="single" label="Files"></helix-headless-list>',
      '<helix-headless-list selection-mode="single" aria-label="Files"></helix-headless-list>',
      '<helix-headless-list><helix-headless-list-item>One</helix-headless-list-item></helix-headless-list>',
    ]) {
      expect([markup, ...(await warnedOn(markup))]).toEqual([markup])
    }
  })
})

/* A list had no way to ask for its next rows, so a long one had to arrive whole
   or be paged by a control of your own. */
describe('a list that loads more', () => {
  type Watched = { callback: IntersectionObserverCallback; target: Element | undefined }
  const watchers: Watched[] = []

  /**
   * Runs `body` with an observer that reports what `reach` tells it, in place
   * of the page's, which happy-dom lacks and a browser answers from layout.
   */
  const watching = async (body: () => Promise<void>): Promise<void> => {
    const original = globalThis.IntersectionObserver
    watchers.length = 0
    globalThis.IntersectionObserver = class {
      private readonly watched: Watched
      constructor(callback: IntersectionObserverCallback) {
        this.watched = { callback, target: undefined }
        watchers.push(this.watched)
      }
      observe(target: Element): void {
        this.watched.target = target
      }
      disconnect(): void {
        this.watched.target = undefined
      }
    } as unknown as typeof IntersectionObserver
    try {
      await body()
    } finally {
      globalThis.IntersectionObserver = original
    }
  }

  /** Tells the list its end is in reach, or out of it. */
  const reach = (inView: boolean): void => {
    for (const watched of watchers) {
      if (watched.target) {
        watched.callback(
          [{ isIntersecting: inView, target: watched.target } as IntersectionObserverEntry],
          {} as IntersectionObserver,
        )
      }
    }
  }

  test('asks once the end is in reach, once for each number of rows, and not while loading', () =>
    watching(async () => {
      const list = await settled(`<helix-headless-list label="Files" load-more>
        <helix-headless-list-item>One</helix-headless-list-item>
      </helix-headless-list>`)
      let asked = 0
      list.addEventListener('helix-load-more', () => {
        asked += 1
      })
      reach(true)
      reach(true)
      expect(asked).toBe(1)

      const busy = list as Updatable & { loading: boolean }
      busy.loading = true
      await busy.updateComplete
      const row = part(list, 'loading') as HTMLElement
      expect(row.getAttribute('role')).toBe('listitem')
      expect(row.textContent?.trim()).toBe('Loading more')
      expect(hasState(list, 'loading')).toBe(true)

      list.append(document.createElement('helix-headless-list-item'))
      await new Promise((done) => setTimeout(done, 0))
      await list.updateComplete
      expect(asked).toBe(1)
      /* The fetch is done and the end is still in reach, so the list asks again. */
      busy.loading = false
      await busy.updateComplete
      expect(asked).toBe(2)
      expect(part(list, 'loading')).toBeNull()
    }))

  test('watches its end again once moved in the page', () =>
    watching(async () => {
      const list = await settled(`<helix-headless-list label="Files" load-more>
          <helix-headless-list-item>One</helix-headless-list-item>
        </helix-headless-list>`)
      list.remove()
      expect(watchers.filter((one) => one.target)).toHaveLength(0)
      document.body.append(list)
      expect(watchers.filter((one) => one.target)).toHaveLength(1)
    }))

  test('watches nothing and asks for nothing without load-more', () =>
    watching(async () => {
      const list = await settled(`<helix-headless-list label="Files">
        <helix-headless-list-item>One</helix-headless-list-item>
      </helix-headless-list>`)
      let asked = 0
      list.addEventListener('helix-load-more', () => {
        asked += 1
      })
      reach(true)
      expect(watchers.filter((one) => one.target)).toHaveLength(0)
      expect(asked).toBe(0)
    }))

  test('shows its loading row as a grid row with one cell in a list that selects, and no empty row', async () => {
    const list = await settled(
      '<helix-headless-list label="Files" selection-mode="single" loading empty-label="None"></helix-headless-list>',
    )
    const row = part(list, 'loading') as HTMLElement
    expect(row.getAttribute('role')).toBe('row')
    expect(row.querySelector('[role="gridcell"]')).not.toBeNull()
    expect(part(list, 'empty')).toBeNull()
  })
})

describe('an item whose definition loads after it was added', () => {
  /* The host hears the definition from `whenDefined`, a microtask after it,
     and both elements then render. */
  const upgraded = async (...elements: Element[]): Promise<void> => {
    for (let round = 0; round < 3; round += 1) {
      await new Promise((done) => setTimeout(done, 0))
      await Promise.all(
        elements.map((one) => (one as Element & { updateComplete?: unknown }).updateComplete),
      )
    }
  }
  test('takes the role the list gives its rows once it upgrades', async () => {
    const list = await mount(
      '<helix-headless-list label="Files" selection-mode="single"><helix-headless-list-item value="a">Alpha</helix-headless-list-item></helix-headless-list>',
    )
    const late = notYetDefined('helix-headless-list-item')
    late.element.textContent = 'Beta'
    list.append(late.element)
    await upgraded(list)
    late.define()
    await upgraded(list, late.element)
    expect(role(late.element)).toBe('row')
  })
})

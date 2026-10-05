import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, registerDom } from '@fusion.dev/helix-testing/dom'

/* Registered before the element is imported, and the import is dynamic for
   exactly that reason: `@customElement` runs on import, static imports are
   hoisted above everything, and an element registered against the global
   `customElements` that happy-dom then replaces never upgrades. It mounts as a
   bare `HTMLElement` with no shadow root and every read comes back undefined,
   which a spec written with `?? ''` reports as a pass. */
beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Grid = HTMLElement & { min?: string | undefined; updateComplete: Promise<boolean> }

const rule = (grid: HTMLElement): string => {
  const sheet = grid.shadowRoot?.querySelector('#template')
  if (!sheet) {
    throw new Error('no #template in the shadow root, so nothing was measured')
  }
  return sheet.textContent ?? ''
}

describe('grid', () => {
  test('a fixed count needs no JavaScript, so nothing is written for it', async () => {
    // `columns` reflects and the stylesheet selects on it. The `<style>` holds
    // no template, which is the point: a server-rendered grid with a fixed
    // count is already correct and has nothing to apply on upgrade.
    const grid = await mount('<helix-grid columns="3"></helix-grid>')
    expect(grid.getAttribute('columns')).toBe('3')
    expect(rule(grid)).not.toContain('repeat')
  })

  test('a minimum width is measured, so it is written as a rule on upgrade', async () => {
    const grid = await mount('<helix-grid min="12rem"></helix-grid>')
    expect(rule(grid)).toContain('12rem')
  })

  test('changing the minimum rewrites the rule rather than adding one', async () => {
    const grid = (await mount('<helix-grid min="12rem"></helix-grid>')) as Grid
    grid.min = '20rem'
    await grid.updateComplete
    expect(rule(grid)).toContain('20rem')
    expect(rule(grid)).not.toContain('12rem')
  })

  test('a minimum beats a count, and clears the rule when it is taken away', async () => {
    // Documented precedence: a grid that both fixes a count and reflows is
    // asking for two things, and reflowing is the one that answers the width.
    const grid = (await mount('<helix-grid columns="3" min="12rem"></helix-grid>')) as Grid
    expect(rule(grid)).toContain('12rem')
    grid.min = undefined
    await grid.updateComplete
    expect(rule(grid)).not.toContain('repeat')
  })

  test('a count past six is written as a rule, where the stylesheet has none', async () => {
    const grid = await mount('<helix-grid columns="8"></helix-grid>')
    expect(rule(grid)).toContain('repeat(8, minmax(0, 1fr))')
  })

  test('a minimum may be a calculation or a variable over lengths', async () => {
    const calc = await mount('<helix-grid min="calc(10rem + 1px)"></helix-grid>')
    expect(rule(calc)).toContain('min(calc(10rem + 1px), 100%)')
    const variable = await mount('<helix-grid min="var(--card-min, 12cqi)"></helix-grid>')
    expect(rule(variable)).toContain('var(--card-min, 12cqi)')
  })

  test('a minimum that could end the rule is refused, and said so', async () => {
    const warnings: string[] = []
    const original = console.warn
    console.warn = (message: string) => warnings.push(message)
    try {
      for (const min of [
        '1px,1fr)} :host{background:url(//elsewhere/?stolen)} @media all{',
        'calc(1px; color: red)',
        'min(1px, 2px',
        'url(x)',
      ]) {
        const grid = (await mount('<helix-grid></helix-grid>')) as Grid
        grid.min = min
        await grid.updateComplete
        expect(rule(grid)).not.toContain('repeat')
      }
    } finally {
      console.warn = original
    }
    expect(warnings.length).toBe(4)
  })

  test('takes no track list from a grid around it', async () => {
    /* The rule is there with or without a minimum, and sets both back. */
    const grid = await mount('<helix-grid columns="3"></helix-grid>')
    expect(rule(grid)).toContain('--_grid-template: initial')
    expect(rule(grid)).toContain('--grid-columns: initial')
    expect(rule(grid)).toContain('--grid-rows: initial')
    expect(rule(grid)).toContain('--grid-areas: initial')
  })

  /* Browser only: happy-dom lays nothing out. */
  const laid = hasLayout() ? test : (): void => {}

  laid('a count inside a grid with a minimum keeps its own columns', async () => {
    const outer = await mount(
      `<helix-grid min="10rem" style="inline-size: 60rem">
        <helix-grid columns="3"><span>A</span><span>B</span><span>C</span></helix-grid>
      </helix-grid>`,
    )
    const inner = outer.querySelector('helix-grid') as Grid
    await inner.updateComplete
    expect(getComputedStyle(inner).gridTemplateColumns.split(' ')).toHaveLength(3)
  })

  laid('a count past six lays out that many columns', async () => {
    const grid = await mount(
      '<helix-grid columns="12" style="inline-size: 60rem"><span>A</span></helix-grid>',
    )
    expect(getComputedStyle(grid).gridTemplateColumns.split(' ')).toHaveLength(12)
  })

  laid('a track list written on the outer grid stays there', async () => {
    const outer = await mount(
      `<helix-grid style="--grid-columns: 7rem 1fr; inline-size: 40rem">
        <helix-grid columns="4"><span>A</span><span>B</span><span>C</span><span>D</span></helix-grid>
      </helix-grid>`,
    )
    const inner = outer.querySelector('helix-grid') as Grid
    await inner.updateComplete
    expect(getComputedStyle(outer).gridTemplateColumns.split(' ')).toHaveLength(2)
    expect(getComputedStyle(inner).gridTemplateColumns.split(' ')).toHaveLength(4)
  })

  laid('each axis takes its own gap, and `gap` fills the axis left unset', async () => {
    const both = await mount('<helix-grid gap="lg"><span>A</span></helix-grid>')
    const lg = getComputedStyle(both).rowGap
    const split = await mount('<helix-grid gap="lg" column-gap="none"><span>A</span></helix-grid>')
    expect(getComputedStyle(split).rowGap).toBe(lg)
    expect(getComputedStyle(split).columnGap).toBe('0px')
    const inner = (
      await mount('<helix-grid row-gap="lg"><helix-grid><span>A</span></helix-grid></helix-grid>')
    ).querySelector('helix-grid') as Grid
    expect(getComputedStyle(inner).rowGap).toBe('0px')
  })

  laid('`auto-flow` and `justify-items` set the properties they are named for', async () => {
    const grid = await mount(
      '<helix-grid auto-flow="column-dense" justify-items="center"><span>A</span></helix-grid>',
    )
    expect(getComputedStyle(grid).gridAutoFlow).toBe('column dense')
    expect(getComputedStyle(grid).justifyItems).toBe('center')
  })

  laid('a child spans the columns its `data-grid-span` names', async () => {
    const grid = await mount(
      `<helix-grid columns="4" style="inline-size: 40rem">
        <h2 data-grid-span="full">Heading</h2><span data-grid-span="2">A</span><span>B</span>
      </helix-grid>`,
    )
    const [heading, wide, narrow] = [...grid.children] as HTMLElement[]
    const width = (element: HTMLElement | undefined): number =>
      Math.round(element?.getBoundingClientRect().width ?? 0)
    expect(width(heading)).toBe(width(grid))
    expect(width(wide)).toBe(width(narrow) * 2)
  })

  /* What the description now says, held so the words stay true: a span the
     grid cannot fit adds empty columns, and `full` always fits. */
  laid('a span wider than a `min` grid adds columns of no width, and `full` fits', async () => {
    const grid = await mount(
      `<helix-grid min="200px" style="inline-size: 300px">
        <span data-grid-span="3">A</span><span data-grid-span="full">B</span>
      </helix-grid>`,
    )
    expect(getComputedStyle(grid).gridTemplateColumns).toBe('300px 0px 0px')
    const [wide, full] = [...grid.children] as HTMLElement[]
    expect(Math.round(full?.getBoundingClientRect().width ?? 0)).toBe(
      Math.round(wide?.getBoundingClientRect().width ?? 0),
    )
  })

  laid(
    'rows and named areas come from their hooks, and stay on the grid that set them',
    async () => {
      const outer = await mount(
        `<helix-grid style="--grid-columns: 5rem 1fr; --grid-rows: 3rem auto; --grid-areas: 'rail head' 'rail main'; inline-size: 30rem">
        <span style="grid-area: rail">R</span><span style="grid-area: head">H</span>
        <helix-grid style="grid-area: main"><span>A</span></helix-grid>
      </helix-grid>`,
      )
      const [rail, head] = [...outer.querySelectorAll('span')] as HTMLElement[]
      const inner = outer.querySelector('helix-grid') as Grid
      await inner.updateComplete
      expect(getComputedStyle(outer).gridTemplateRows.split(' ')[0]).toBe('48px')
      expect(Math.round(head?.getBoundingClientRect().height ?? 0)).toBe(48)
      expect(Math.round(rail?.getBoundingClientRect().width ?? 0)).toBe(80)
      expect(getComputedStyle(inner).gridTemplateAreas).toBe('none')
      /* A grid reports its rows as the sizes it laid out, so a row track list
       taken from the outer grid would start at its 48px. */
      expect(getComputedStyle(inner).gridTemplateRows.split(' ')).toHaveLength(1)
      expect(getComputedStyle(inner).gridTemplateRows).not.toBe('48px')
    },
  )
})

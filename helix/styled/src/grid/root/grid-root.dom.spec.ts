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

  test('takes no track list from a grid around it', async () => {
    /* The rule is there with or without a minimum, and sets both back. */
    const grid = await mount('<helix-grid columns="3"></helix-grid>')
    expect(rule(grid)).toContain('--_grid-template: initial')
    expect(rule(grid)).toContain('--grid-columns: initial')
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
})

import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom } from '@helix-io/testing/dom'

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

type Grid = HTMLElement & { min?: string; updateComplete: Promise<boolean> }

const rule = (grid: HTMLElement): string => {
  const sheet = grid.shadowRoot?.querySelector('#template')
  if (!sheet) {
    throw new Error('no #template in the shadow root, so nothing was measured')
  }
  return sheet.textContent ?? ''
}

describe('grid', () => {
  test('a fixed count needs no JavaScript, so nothing is written for it', async () => {
    // `columns` reflects and the stylesheet selects on it. The `<style>` stays
    // empty, which is the point: a server-rendered grid with a fixed count is
    // already correct and has nothing to apply on upgrade.
    const grid = await mount('<helix-grid columns="3"></helix-grid>')
    expect(grid.getAttribute('columns')).toBe('3')
    expect(rule(grid)).toBe('')
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
    expect(rule(grid)).toBe('')
  })
})

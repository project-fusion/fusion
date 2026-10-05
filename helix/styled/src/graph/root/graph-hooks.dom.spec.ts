import { beforeAll, describe, expect, test } from 'bun:test'
import {
  hasLayout,
  mount,
  registerDom,
  settle,
  type Updatable,
} from '@fusion.dev/helix-testing/dom'

/* What the note list's hooks change, which only a browser computes. Run them
   with `bun run specs:browser graph`. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const geometry = hasLayout() ? test : (): void => {}

describe('graph hooks', () => {
  geometry('the panel and the list take the hooks, and keep their look without them', async () => {
    const plain = (await mount('<helix-graph label="Notes"></helix-graph>')) as HTMLElement &
      Updatable
    await settle(plain)
    const panel = (host: HTMLElement) =>
      host.shadowRoot?.querySelector('[part="panel"]') as HTMLElement
    const before = getComputedStyle(panel(plain)).backgroundColor
    const hooked = (await mount(
      '<helix-graph label="Notes" style="--graph-panel-background-color: rgb(1, 2, 3); --graph-panel-color: rgb(4, 5, 6)"></helix-graph>',
    )) as HTMLElement & Updatable
    await settle(hooked)
    expect(getComputedStyle(panel(hooked)).backgroundColor).toBe('rgb(1, 2, 3)')
    expect(getComputedStyle(panel(hooked)).color).toBe('rgb(4, 5, 6)')
    expect(before).not.toBe('rgb(1, 2, 3)')
  })
})

import { beforeAll, describe, expect, test } from 'bun:test'
import {
  hasLayout,
  mount,
  registerDom,
  settle,
  type Updatable,
} from '@fusion.dev/helix-testing/dom'

/* What the hooks change, which only a browser computes. Run them with
   `bun run specs:browser virtual-list`. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const geometry = hasLayout() ? test : (): void => {}

type List = HTMLElement & Updatable & Record<string, unknown>

const list = async (style = ''): Promise<List> => {
  const host = (await mount(
    `<helix-virtual-list label="People" selection-mode="multiple" value="b" loading style="${style}"></helix-virtual-list>`,
  )) as List
  host.renderItem = (item: string) => item
  host.items = ['a', 'b', 'c']
  await settle(host)
  return host
}

describe('virtual list hooks', () => {
  geometry('a chosen row takes the selected fill, and the hook replaces it', async () => {
    const plain = await list()
    const chosen = plain.querySelector('[aria-selected="true"]') as HTMLElement
    const other = plain.querySelector('[aria-selected="false"]') as HTMLElement
    expect(getComputedStyle(chosen).backgroundColor).not.toBe(
      getComputedStyle(other).backgroundColor,
    )
    const hooked = await list('--virtual-list-selected-background-color: rgb(1, 2, 3)')
    const row = hooked.querySelector('[aria-selected="true"]') as HTMLElement
    expect(getComputedStyle(row).backgroundColor).toBe('rgb(1, 2, 3)')
  })

  geometry('the loading row takes its color and padding from the hooks', async () => {
    const host = await list(
      '--virtual-list-loading-color: rgb(4, 5, 6); --virtual-list-loading-padding: 7px',
    )
    const row = host.shadowRoot?.querySelector('[part="loading"]') as HTMLElement
    expect(getComputedStyle(row).color).toBe('rgb(4, 5, 6)')
    expect(getComputedStyle(row).paddingTop).toBe('7px')
  })
})

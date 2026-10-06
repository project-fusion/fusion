import { beforeAll, describe, expect, test } from 'bun:test'
import {
  hasLayout,
  mount,
  part,
  registerDom,
  settle,
  type Updatable,
} from '@fusion.dev/helix-testing/dom'

/* What the list's hooks change, which only a browser computes. Run them with
   `bun run specs:browser description-list`. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const geometry = hasLayout() ? test : (): void => {}

const list = async (style = ''): Promise<HTMLElement & Updatable> => {
  const host = (await mount(
    `<helix-description-list direction="row" style="${style}"><helix-description-list-item label="Owner">Ada</helix-description-list-item></helix-description-list>`,
  )) as HTMLElement & Updatable
  await settle(host)
  await settle(host.querySelector('helix-description-list-item') as HTMLElement & Updatable)
  return host
}

describe('description list hooks', () => {
  geometry(
    'the labels, the values and the column gap take the hooks, and keep their look without them',
    async () => {
      const plain = await list()
      const plainItem = plain.querySelector('helix-description-list-item') as HTMLElement
      expect(getComputedStyle(part(plainItem, 'label') as HTMLElement).color).not.toBe(
        'rgb(1, 2, 3)',
      )
      const hooked = await list(
        '--description-list-label-color: rgb(1, 2, 3); --description-list-label-font-size: 20px; --description-list-label-weight: 800; --description-list-value-color: rgb(4, 5, 6); --description-list-column-gap: 7px',
      )
      const item = hooked.querySelector('helix-description-list-item') as HTMLElement
      const label = getComputedStyle(part(item, 'label') as HTMLElement)
      expect(label.color).toBe('rgb(1, 2, 3)')
      expect(label.fontSize).toBe('20px')
      expect(label.fontWeight).toBe('800')
      expect(getComputedStyle(part(item, 'value') as HTMLElement).color).toBe('rgb(4, 5, 6)')
      expect(getComputedStyle(part(hooked, 'list') as HTMLElement).columnGap).toBe('7px')
    },
  )

  geometry('divided draws a rule in the middle of the gap, and takes its hooks', async () => {
    const pair = (host: HTMLElement): HTMLElement[] => [...host.children] as HTMLElement[]
    const host = (await mount(
      '<helix-description-list direction="row" divided style="--description-list-gap: 10px"><helix-description-list-item label="Owner">Ada</helix-description-list-item><helix-description-list-item label="Region">us-east</helix-description-list-item></helix-description-list>',
    )) as HTMLElement & Updatable
    await settle(host)
    const [first, second] = pair(host).map((item) => getComputedStyle(item))
    expect(first?.borderTopWidth).toBe('0px')
    expect([second?.borderTopWidth, second?.paddingTop]).toEqual(['1px', '10px'])
    host.style.setProperty('--description-list-divider-color', 'rgb(1, 2, 3)')
    host.style.setProperty('--description-list-divider-width', '3px')
    const hooked = getComputedStyle(pair(host)[1] as HTMLElement)
    expect([hooked.borderTopColor, hooked.borderTopWidth]).toEqual(['rgb(1, 2, 3)', '3px'])
  })

  geometry('the label column takes a width, and a pair lines up by the hook', async () => {
    const host = await list(
      'width: 600px; --description-list-label-width: 160px; --description-list-item-align: center',
    )
    const item = host.querySelector('helix-description-list-item') as HTMLElement
    expect((part(item, 'label') as HTMLElement).getBoundingClientRect().width).toBe(160)
    expect(getComputedStyle(item).alignItems).toBe('center')
  })
})

import { beforeAll, describe, expect, test } from 'bun:test'
import { at, hasLayout, mount, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Group = HTMLElement & { updateComplete: Promise<boolean> }

const LONG = [
  'Searchers back in range within the last hour',
  'Points dropped with no signal since dawn',
  'Hectares marked searched across every team',
]

const group = async (extra: string): Promise<Group> => {
  const host = (await mount(
    `<div style="inline-size: 28rem"><helix-stat-group ${extra}>${LONG.map(
      (label, value) => `<helix-stat><span slot="label">${label}</span>${value + 12}</helix-stat>`,
    ).join('')}</helix-stat-group></div>`,
  )) as HTMLElement
  const stats = host.querySelector('helix-stat-group') as Group
  await stats.updateComplete
  return stats
}

describe('stat group', () => {
  test('a count is served as the attribute its rule selects on', async () => {
    const stats = await group('columns="3"')
    expect(stats.getAttribute('columns')).toBe('3')
  })

  if (hasLayout()) {
    test('with a count, three long stats share one row and their labels wrap', async () => {
      const every = [...(await group('columns="3" divided')).children] as HTMLElement[]
      const tops = every.map((one) => Math.round(one.getBoundingClientRect().top))
      expect(new Set(tops).size).toBe(1)
      const widths = every.map((one) => Math.round(one.getBoundingClientRect().width))
      expect(Math.max(...widths) - Math.min(...widths)).toBeLessThanOrEqual(1)
    })

    test('with a count, the rule stands between the stats and not before the first', async () => {
      const stats = await group('columns="3" divided')
      const box = stats.getBoundingClientRect()
      const every = [...stats.children] as HTMLElement[]
      /* The first rule is pulled out past the start and clipped; the others
         stand inside the group, between two stats. */
      expect(at(every, 0).getBoundingClientRect().left).toBeLessThan(box.left)
      expect(at(every, 1).getBoundingClientRect().left).toBeGreaterThan(box.left)
    })

    test('without a count, the stats keep wrapping as they fit', async () => {
      const every = [...(await group('')).children] as HTMLElement[]
      const tops = every.map((one) => Math.round(one.getBoundingClientRect().top))
      expect(new Set(tops).size).toBeGreaterThan(1)
    })
  }
})

import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom, role, slotted } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../checkbox/index.js')
})

type Group = HTMLElement & {
  value: string
  name: string
  boxes: (HTMLElement & { isChecked: boolean; value: string; name: string })[]
  updateComplete: Promise<unknown>
  internals?: ElementInternals
}

const group = async (attrs = 'label="Verticals" name="verticals" value="design,mind"') =>
  (await mount(`<helix-checkbox-group ${attrs}>
    <helix-checkbox value="design">Design</helix-checkbox>
    <helix-checkbox value="mind">Mind</helix-checkbox>
    <helix-checkbox value="energy">Energy</helix-checkbox>
  </helix-checkbox-group>`)) as Group

const tick = async (g: Group, index: number) => {
  const box = g.boxes[index] as HTMLElement
  const control = box.shadowRoot?.querySelector<HTMLElement>('[part="control"]')
  control?.click()
  await g.updateComplete
  await Promise.all(g.boxes.map((b) => (b as unknown as Group).updateComplete))
}

describe('checkbox group', () => {
  test('is a named group, set on internals rather than on the host', async () => {
    const g = await group()
    expect(role(g)).toBe('group')
    expect(g.internals?.ariaLabel).toBe('Verticals')
    expect(g.getAttributeNames()).toEqual(['label', 'name', 'value'])
  })

  test('the value ticks exactly those boxes', async () => {
    const g = await group()
    expect(g.boxes.map((b) => `${b.value}:${b.isChecked}`)).toEqual([
      'design:true',
      'mind:true',
      'energy:false',
    ])
  })

  test('the name is shared down as a property, not written onto the markup', async () => {
    // An attribute written onto a box is a change to markup the consumer
    // rendered, which a React consumer's hydration reports.
    const g = await group()
    expect(g.boxes.map((b) => b.name)).toEqual(['verticals', 'verticals', 'verticals'])
    expect((g.boxes[0] as HTMLElement).hasAttribute('name')).toBe(false)
  })

  test('a box that names itself keeps its own', async () => {
    const g = (await mount(`<helix-checkbox-group name="shared">
      <helix-checkbox name="its-own" value="a">A</helix-checkbox>
    </helix-checkbox-group>`)) as Group
    expect(g.boxes[0]?.name).toBe('its-own')
  })

  test('ticking and unticking both move the set', async () => {
    const g = await group()
    await tick(g, 2)
    expect(g.value).toBe('design,mind,energy')
    await tick(g, 0)
    expect(g.value).toBe('mind,energy')
  })

  test('the group says the whole set, once, and the box does not say it again', async () => {
    // A consumer of a group is listening for the set. Letting the box's own
    // change through as well would deliver two events for one action, one of
    // them carrying a lone boolean.
    const g = await group()
    const seen: string[] = []
    g.addEventListener('helix-change', (event) => {
      seen.push((event as CustomEvent<{ value: string }>).detail.value)
    })
    await tick(g, 2)
    expect(seen).toEqual(['design,mind,energy'])
  })

  test('the group does not answer its own event', async () => {
    // Its listener is on the host it dispatches from, so without a guard on the
    // target it hears itself and answers until the stack gives out.
    const g = await group()
    let count = 0
    g.addEventListener('helix-change', () => {
      count += 1
    })
    await tick(g, 2)
    expect(count).toBe(1)
  })

  test('the boxes stay the elements the consumer wrote', async () => {
    expect(slotted(await group())).toHaveLength(3)
  })
})

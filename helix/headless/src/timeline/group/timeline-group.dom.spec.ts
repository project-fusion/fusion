import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom, role } from '@fusion.dev/helix-testing/dom'

/* Entries grouped by date: a heading over a list of its own, inside the
   timeline's list. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Updatable = HTMLElement & { updateComplete: Promise<unknown> }

const grouped = async (attributes = 'label="Today"', heading = ''): Promise<Updatable> => {
  const host = (await mount(`<helix-headless-timeline label="History">
    <helix-headless-timeline-group ${attributes}>${heading}
      <helix-headless-timeline-item><span slot="time">09:12</span>Deployed</helix-headless-timeline-item>
      <helix-headless-timeline-item><span slot="time">08:47</span>Rolled back</helix-headless-timeline-item>
    </helix-headless-timeline-group>
  </helix-headless-timeline>`)) as Updatable
  await host.updateComplete
  const group = host.querySelector('helix-headless-timeline-group') as Updatable
  await group.updateComplete
  return group
}

describe('a group of entries', () => {
  test('is an entry of the timeline, holding a list of its own', async () => {
    const group = await grouped()
    expect(role(group)).toBe('listitem')
    expect(part(group, 'entries')?.getAttribute('role')).toBe('list')
  })

  test('has a heading, at level 3 unless it says otherwise', async () => {
    const group = await grouped()
    const heading = part(group, 'heading') as HTMLElement
    expect(heading.getAttribute('role')).toBe('heading')
    expect(heading.getAttribute('aria-level')).toBe('3')
    expect(heading.textContent?.trim()).toBe('Today')
    expect(
      part(await grouped('label="Today" heading-level="2"'), 'heading')?.getAttribute('aria-level'),
    ).toBe('2')
  })

  test('names its list by its heading', async () => {
    const group = await grouped()
    const heading = part(group, 'heading') as HTMLElement
    expect(part(group, 'entries')?.getAttribute('aria-labelledby')).toBe(heading.id)
  })

  test('takes its heading as text, or as content that replaces it', async () => {
    const group = await grouped('label="Today"', '<span slot="heading">Tuesday, August 19</span>')
    const slot = part(group, 'heading')?.querySelector('slot') as HTMLSlotElement
    expect(slot.assignedElements()[0]?.textContent).toBe('Tuesday, August 19')
  })

  test('writes no attribute of its own onto the host', async () => {
    const group = await grouped()
    expect(group.getAttributeNames()).toEqual(['label'])
  })
})

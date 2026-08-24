import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@helix-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const entry = async (
  attributes = '',
  inner = '<span slot="time">March</span>Shipped',
): Promise<HTMLElement> =>
  (await mount(
    `<helix-headless-timeline-item ${attributes}>${inner}</helix-headless-timeline-item>`,
  )) as HTMLElement

/**
 * One entry, and the contract that is the entry's rather than the line's.
 *
 * **The timeline already proves the arrangement**, which is the order of entries
 * and the rail running behind them: it is named 41 times in this family's specs.
 * What one entry decides alone is whether the time it was given is a machine
 * readable stamp or a label, and where that time sits in the box, and neither is
 * visible from the timeline, because both shapes read identically.
 */
describe('one timeline entry', () => {
  /* A `<time>` with no `datetime` is a worse element than a `<span>`: it claims
     to carry a stamp and carries prose. So the tag follows the attribute, and
     the entry decides that from the one property it has. */
  test('is a time element only where it was given a stamp to carry', async () => {
    const stamped = await entry('datetime="2026-03-01"')
    expect(part(stamped, 'time')?.tagName).toBe('TIME')
    expect(part(stamped, 'time')?.getAttribute('datetime')).toBe('2026-03-01')

    const bare = await entry()
    expect(part(bare, 'time')?.tagName).toBe('SPAN')
    expect(part(bare, 'time')?.hasAttribute('datetime')).toBe(false)
  })

  /* The time is a sibling of the content, not the first thing inside it. Nested,
     the mark on the rail could only sit a fixed distance from the top of the
     entry, which is right for a one-line time and wrong for two. */
  test('keeps the time beside the content so the rail can align to it', async () => {
    const host = await entry()
    const time = part(host, 'time')
    const content = part(host, 'content')
    expect(content?.contains(time as Node)).toBe(false)
    expect(time?.parentElement).toBe(content?.parentElement as HTMLElement)
  })

  /* The rail is drawn rather than slotted, and it is decoration: a reader being
     read this entry should hear what happened and when, not that there is a line
     behind it. */
  test('hides the line it draws from anyone reading it', async () => {
    const host = await entry()
    expect(part(host, 'connector')?.getAttribute('aria-hidden')).toBe('true')
    expect(part(host, 'rail')).not.toBeNull()
    expect(part(host, 'marker')).not.toBeNull()
  })
})

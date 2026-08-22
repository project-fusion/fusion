import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom, role } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Entry = HTMLElement & { datetime: string; updateComplete: Promise<boolean> }

const timeline = async (entries: string): Promise<HTMLElement> => {
  const host = (await mount(
    `<helix-base-timeline label="History">${entries}</helix-base-timeline>`,
  )) as HTMLElement & { updateComplete: Promise<boolean> }
  await host.updateComplete
  for (const one of host.querySelectorAll('helix-base-timeline-item')) {
    await (one as Entry).updateComplete
  }
  return host
}

const three = `
  <helix-base-timeline-item datetime="2026-08-19T09:12"><span slot="time">09:12</span>Deployed</helix-base-timeline-item>
  <helix-base-timeline-item datetime="2026-08-19T08:47"><span slot="time">08:47</span>Rolled back</helix-base-timeline-item>
  <helix-base-timeline-item><span slot="time">Yesterday</span>Opened</helix-base-timeline-item>`

describe('a timeline', () => {
  test('is a list of entries, named for a reader arriving out of context', async () => {
    const host = await timeline(three)
    expect(role(host)).toBe('list')
    const entries = [...host.querySelectorAll('helix-base-timeline-item')] as HTMLElement[]
    expect(entries.map((one) => role(one))).toEqual(['listitem', 'listitem', 'listitem'])
  })

  test('a time with an instant behind it is a <time>, and one without is not', async () => {
    /* The machine-readable form travels with the human one, so "yesterday" is a
       word and `2026-08-19T09:12` is a date. A `<time>` with nothing to be
       precise about would be markup pretending, so the entry that has no
       `datetime` gets a span. */
    const host = await timeline(three)
    const entries = [...host.querySelectorAll('helix-base-timeline-item')] as Entry[]

    const dated = part(entries[0], 'time') as HTMLElement
    expect(dated.tagName).toBe('TIME')
    expect(dated.getAttribute('datetime')).toBe('2026-08-19T09:12')

    const undated = part(entries[2], 'time') as HTMLElement
    expect(undated.tagName).toBe('SPAN')
    expect(undated.hasAttribute('datetime')).toBe(false)
  })

  test('the mark is a dot until something is slotted for it', async () => {
    const host = await timeline(
      `<helix-base-timeline-item><helix-base-icon name="check" slot="marker"></helix-base-icon>Done</helix-base-timeline-item>`,
    )
    const entry = host.querySelector('helix-base-timeline-item') as Entry
    const marker = part(entry, 'marker') as HTMLElement
    expect(marker).not.toBeNull()
    expect(marker.querySelector('slot[name="marker"]')).not.toBeNull()
  })
})

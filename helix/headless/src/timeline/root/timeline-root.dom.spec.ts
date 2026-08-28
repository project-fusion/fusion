import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom, role } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Entry = HTMLElement & { datetime: string; updateComplete: Promise<boolean> }

const timeline = async (entries: string): Promise<HTMLElement> => {
  const host = (await mount(
    `<helix-headless-timeline label="History">${entries}</helix-headless-timeline>`,
  )) as HTMLElement & { updateComplete: Promise<boolean> }
  await host.updateComplete
  for (const one of host.querySelectorAll('helix-headless-timeline-item')) {
    await (one as Entry).updateComplete
  }
  return host
}

const three = `
  <helix-headless-timeline-item datetime="2026-08-19T09:12"><span slot="time">09:12</span>Deployed</helix-headless-timeline-item>
  <helix-headless-timeline-item datetime="2026-08-19T08:47"><span slot="time">08:47</span>Rolled back</helix-headless-timeline-item>
  <helix-headless-timeline-item><span slot="time">Yesterday</span>Opened</helix-headless-timeline-item>`

describe('a timeline', () => {
  test('is a list of entries, named for a reader arriving out of context', async () => {
    const host = await timeline(three)
    expect(role(host)).toBe('list')
    const entries = [...host.querySelectorAll('helix-headless-timeline-item')] as HTMLElement[]
    expect(entries.map((one) => role(one))).toEqual(['listitem', 'listitem', 'listitem'])
  })

  test('a time with an instant behind it is a <time>, and one without is not', async () => {
    /* The machine-readable form travels with the human one, so "yesterday" is a
       word and `2026-08-19T09:12` is a date. A `<time>` with nothing to be
       precise about would be markup pretending, so the entry that has no
       `datetime` gets a span. */
    const host = await timeline(three)
    const entries = [...host.querySelectorAll('helix-headless-timeline-item')] as Entry[]

    const dated = part(entries[0], 'time') as HTMLElement
    expect(dated.tagName).toBe('TIME')
    expect(dated.getAttribute('datetime')).toBe('2026-08-19T09:12')

    const undated = part(entries[2], 'time') as HTMLElement
    expect(undated.tagName).toBe('SPAN')
    expect(undated.hasAttribute('datetime')).toBe(false)
  })

  test('the mark is a dot until something is slotted for it', async () => {
    const host = await timeline(
      `<helix-headless-timeline-item><helix-headless-icon name="check" slot="marker"></helix-headless-icon>Done</helix-headless-timeline-item>`,
    )
    const entry = host.querySelector('helix-headless-timeline-item') as Entry
    const marker = part(entry, 'marker') as HTMLElement
    expect(marker).not.toBeNull()
    expect(marker.querySelector('slot[name="marker"]')).not.toBeNull()
  })
})

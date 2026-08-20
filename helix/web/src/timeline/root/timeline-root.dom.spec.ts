import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom, role } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Entry = HTMLElement & { datetime: string; updateComplete: Promise<boolean> }

const timeline = async (entries: string, attrs = ''): Promise<HTMLElement> => {
  const host = (await mount(
    `<helix-timeline label="History"${attrs}>${entries}</helix-timeline>`,
  )) as HTMLElement & { updateComplete: Promise<boolean> }
  await host.updateComplete
  for (const one of host.querySelectorAll('helix-timeline-item')) {
    await (one as Entry).updateComplete
  }
  return host
}

const three = `
  <helix-timeline-item datetime="2026-08-19T09:12"><span slot="time">09:12</span>Deployed</helix-timeline-item>
  <helix-timeline-item datetime="2026-08-19T08:47"><span slot="time">08:47</span>Rolled back</helix-timeline-item>
  <helix-timeline-item><span slot="time">Yesterday</span>Opened</helix-timeline-item>`

describe('a timeline', () => {
  test('is a list of entries, named for a reader arriving out of context', async () => {
    const host = await timeline(three)
    expect(role(host)).toBe('list')
    const entries = [...host.querySelectorAll('helix-timeline-item')] as HTMLElement[]
    expect(entries.map((one) => role(one))).toEqual(['listitem', 'listitem', 'listitem'])
  })

  test('a time with an instant behind it is a <time>, and one without is not', async () => {
    /* The machine-readable form travels with the human one, so "yesterday" is a
       word and `2026-08-19T09:12` is a date. A `<time>` with nothing to be
       precise about would be markup pretending, so the entry that has no
       `datetime` gets a span. */
    const host = await timeline(three)
    const entries = [...host.querySelectorAll('helix-timeline-item')] as Entry[]

    const dated = part(entries[0], 'time') as HTMLElement
    expect(dated.tagName).toBe('TIME')
    expect(dated.getAttribute('datetime')).toBe('2026-08-19T09:12')

    const undated = part(entries[2], 'time') as HTMLElement
    expect(undated.tagName).toBe('SPAN')
    expect(undated.hasAttribute('datetime')).toBe(false)
  })

  test('the mark is a dot until something is slotted for it', async () => {
    const host = await timeline(
      `<helix-timeline-item><helix-icon name="check" slot="marker"></helix-icon>Done</helix-timeline-item>`,
    )
    const entry = host.querySelector('helix-timeline-item') as Entry
    const marker = part(entry, 'marker') as HTMLElement
    expect(marker).not.toBeNull()
    expect(marker.querySelector('slot[name="marker"]')).not.toBeNull()
  })

  if (hasLayout()) {
    test('the first entry has no line arriving at it', async () => {
      /* Each entry draws the line that reaches it, which needs no index and no
         parent that counts: `:host(:first-child)` is the whole of it, and it is
         true in the server's markup before any script runs. */
      const host = await timeline(three)
      const entries = [...host.querySelectorAll('helix-timeline-item')] as Entry[]
      const seen = entries.map((one) => {
        const connector = part(one, 'connector') as HTMLElement
        return getComputedStyle(connector).visibility
      })
      expect(seen).toEqual(['hidden', 'visible', 'visible'])
    })

    test('and the last one has no line leaving it', async () => {
      const host = await timeline(three)
      const entries = [...host.querySelectorAll('helix-timeline-item')] as Entry[]
      const rail = (one: Entry) =>
        getComputedStyle(part(one, 'rail') as HTMLElement, '::after').visibility
      expect(rail(entries[0])).toBe('visible')
      expect(rail(entries[2])).toBe('hidden')
    })

    test('the mark sits on the title, not at the top of the entry', async () => {
      /* The distance between the two is the height of the time, which only the
         browser knows: a consumer writing "Tuesday 19 August" over two lines
         moves it. The rail shares the entry's rows so it is told, rather than
         being given a fixed offset that is right for one line of time and wrong
         for two. Asserted with two lines, which is the case a constant fails. */
      const host = await timeline(`
        <helix-timeline-item datetime="2026-08-19">
          <span slot="time">Tuesday 19 August, in the morning, at some length</span>
          <strong>Deployed</strong>
        </helix-timeline-item>`)
      const entry = host.querySelector('helix-timeline-item') as Entry
      const mark = (part(entry, 'marker') as HTMLElement).getBoundingClientRect()
      const title = (entry.querySelector('strong') as HTMLElement).getBoundingClientRect()
      expect(Math.abs(mark.top + mark.height / 2 - (title.top + title.height / 2))).toBeLessThan(3)
    })

    test('the marks line up however tall the entries are', async () => {
      /* The point of the component: a record is read down its marks, and an
         entry with three lines of text must not push its own mark out of the
         column the others are in. */
      const host = await timeline(`
        <helix-timeline-item><span slot="time">A</span>One line</helix-timeline-item>
        <helix-timeline-item><span slot="time">B</span>
          <strong>Several</strong>
          <span>Lines of content, enough to make this entry taller than the one above it.</span>
          <span>And another.</span>
        </helix-timeline-item>
        <helix-timeline-item><span slot="time">C</span>One line</helix-timeline-item>`)
      const entries = [...host.querySelectorAll('helix-timeline-item')] as Entry[]
      const centres = entries.map((one) => {
        const box = (part(one, 'marker') as HTMLElement).getBoundingClientRect()
        return Math.round(box.left + box.width / 2)
      })
      expect(new Set(centres).size).toBe(1)
    })

    test('turned along the page, the rail turns with it', async () => {
      const host = await timeline(three, ' orientation="horizontal"')
      const entry = host.querySelector('helix-timeline-item') as Entry
      expect(getComputedStyle(host).flexDirection).toBe('row')
      expect(getComputedStyle(part(entry, 'rail') as HTMLElement).flexDirection).toBe('row')
    })

    test('and the line reaches the end of the record', async () => {
      /* Every entry taking an equal share of the width puts each mark at the
         start of its own share, which leaves the last share empty: the line
         stopped a whole track short of the end with a label sitting on its own
         in the gap. Measured at 900 wide, 193 pixels of nothing after the last
         mark. The test is that what is left after the last mark is smaller than
         the space between two marks, which a dead track never is. */
      const host = await timeline(three, ' orientation="horizontal"')
      const entries = [...host.querySelectorAll('helix-timeline-item')] as Entry[]
      const at = (one: Entry) => (part(one, 'marker') as HTMLElement).getBoundingClientRect()
      const spacing = at(entries[1]).left - at(entries[0]).left
      const after = host.getBoundingClientRect().right - at(entries.at(-1) as Entry).right
      expect(after).toBeLessThan(spacing)
    })

    test('and each mark stays over the entry it belongs to', async () => {
      /* The leading run of line is a fixed length in both directions. Letting it
         grow instead, which the first version of this did, pushed every mark to
         the far end of its own entry, so the first entry's label sat under the
         dot belonging to the second. Caught by looking at it, and this is what
         would have caught it without looking. */
      const host = await timeline(three, ' orientation="horizontal"')
      const entries = [...host.querySelectorAll('helix-timeline-item')] as Entry[]
      for (const one of entries) {
        const item = one.getBoundingClientRect()
        const mark = (part(one, 'marker') as HTMLElement).getBoundingClientRect()
        const into = mark.left + mark.width / 2 - item.left
        expect(into).toBeLessThan(item.width / 2)
      }
    })
  }
})

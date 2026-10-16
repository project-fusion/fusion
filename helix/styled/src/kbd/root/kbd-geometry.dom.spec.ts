import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* Browser only: happy-dom lays nothing out. */
const geometry = hasLayout() ? test : (): void => {}

/* An empty block as tall as a capital, set on the baseline: its bottom is the
   baseline of the text it is in, and its top is the top of that text's
   capitals. */
const PROBE =
  '<span data-probe style="block-size: 1cap; display: inline-block; inline-size: 0"></span>'

/** Where a probe says the capitals are: their middle, and their baseline. */
const capitals = (probe: Element): { base: number; middle: number } => {
  const box = probe.getBoundingClientRect()
  return { base: box.bottom, middle: box.bottom - box.height / 2 }
}

/** The middle of a face inside its edges: a border at each end, and the
    pressed pixel along the bottom. */
const inside = (face: Element): number => {
  const box = face.getBoundingClientRect()
  const border = Number.parseFloat(getComputedStyle(face).borderTopWidth)
  return box.top + border + (box.height - 2 * border - 1) / 2
}

const line = (size: number, key: string): string =>
  `<p style="font: ${size}px/1.5 var(--helix-font-sans, sans-serif); margin: 0">Hx${PROBE} ${key} Hx</p>`

type Updatable = HTMLElement & { updateComplete: Promise<unknown> }

/** Mounts a line, and waits for its keys to draw and its faces to load. */
const draw = async (markup: string): Promise<HTMLElement> => {
  const row = await mount(markup)
  await Promise.all(
    [...row.querySelectorAll<Updatable>('helix-kbd')].map((key) => key.updateComplete),
  )
  await document.fonts.ready
  return row
}

/* The owner's report, October 15, 2026: the key sat low against the sentence
   and its label sat off the middle of its face. Each is held to a tenth of a
   pixel of layout, which both engines meet to a hundredth. */
describe('a key in a line of text', () => {
  for (const size of [12, 14, 20]) {
    geometry(
      `at ${size}px, the inside of the face is centered on the capitals beside it`,
      async () => {
        const row = await draw(line(size, `<helix-kbd>K${PROBE}</helix-kbd>`))
        const key = row.querySelector('helix-kbd') as HTMLElement
        const text = capitals(row.querySelector(':scope > [data-probe]') as Element)
        expect(Math.abs(inside(part(key, 'kbd') as Element) - text.middle)).toBeLessThan(0.1)
      },
    )

    geometry(`at ${size}px, the label is centered on its capitals inside the face`, async () => {
      const row = await draw(line(size, `<helix-kbd>K${PROBE}</helix-kbd>`))
      const key = row.querySelector('helix-kbd') as HTMLElement
      const label = capitals(key.querySelector('[data-probe]') as Element)
      expect(Math.abs(label.middle - inside(part(key, 'kbd') as Element))).toBeLessThan(0.1)
    })
  }

  geometry('a lowercase label sits on the baseline a capital one does', async () => {
    const row = await draw(
      line(14, `<helix-kbd>K${PROBE}</helix-kbd> <helix-kbd>esc${PROBE}</helix-kbd>`),
    )
    const [upper, lower] = [...row.querySelectorAll('helix-kbd [data-probe]')].map(capitals)
    expect(Math.abs((upper?.base ?? 0) - (lower?.base ?? 1))).toBeLessThan(0.1)
  })

  geometry('each key under caps is centered on the capitals beside it', async () => {
    const row = await draw(line(14, '<helix-kbd caps keys="ctrl+k"></helix-kbd>'))
    const key = row.querySelector('helix-kbd') as HTMLElement
    const text = capitals(row.querySelector(':scope > [data-probe]') as Element)
    const caps = [...(key.shadowRoot?.querySelectorAll('[part="key"]') ?? [])]
    expect(caps.length).toBe(2)
    for (const cap of caps) {
      expect(Math.abs(inside(cap) - text.middle)).toBeLessThan(0.1)
    }
  })

  geometry('a key adds no height to the line it is in', async () => {
    const plain = (await draw(line(14, ''))).getBoundingClientRect().height
    const row = await draw(
      line(14, '<helix-kbd>K</helix-kbd> <helix-kbd caps keys="ctrl+k"></helix-kbd>'),
    )
    expect(row.getBoundingClientRect().height).toBe(plain)
  })
})

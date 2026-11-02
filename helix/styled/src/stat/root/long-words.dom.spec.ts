import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, registerDom } from '@fusion.dev/helix-testing/dom'

/* A long unbroken word stays inside the column it was given. Measured November 1,
   2026 in 220 wide: Stat's value ran 1,512 past, Empty's heading 262, Card's
   heading 504 under its clip, and Filter Chip's field name 338. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../card/index.js')
  await import('../../empty/index.js')
  await import('../../filter-input/index.js')
})

const run = hasLayout() ? test : (): void => {}

const WORD = 'Pneumonoultramicroscopicsilicovolcanoconiosis_and_some_more_unbroken_text_here'

/** How far the text under a node reaches, leaving what a clipping parent cuts off. */
const reach = (node: Node, clipped: (element: Element) => boolean, most = 0): number => {
  let far = most
  if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
    const range = document.createRange()
    range.selectNodeContents(node)
    return Math.max(far, range.getBoundingClientRect().right)
  }
  if (node instanceof Element) {
    if (clipped(node)) {
      return far
    }
    if (node.shadowRoot) {
      far = reach(node.shadowRoot, clipped, far)
    }
  }
  for (const child of node.childNodes) {
    far = reach(child, clipped, far)
  }
  return far
}

const CASES: Record<string, string> = {
  card: `<helix-card><h3 slot="header">${WORD}</h3><p>${WORD}</p><div slot="footer">${WORD}</div></helix-card>`,
  empty: `<helix-empty heading="${WORD}"><p>${WORD}</p></helix-empty>`,
  stat: `<helix-stat><span slot="label">${WORD}</span>${WORD}<span slot="trend">${WORD}</span></helix-stat>`,
}

describe('a long word stays in its column', () => {
  for (const [name, markup] of Object.entries(CASES)) {
    run(name, async () => {
      const box = await mount(`<div style="inline-size: 220px">${markup}</div>`)
      const host = box.firstElementChild as HTMLElement & { updateComplete: Promise<unknown> }
      await host.updateComplete
      const limit = box.getBoundingClientRect().right
      expect(host.getBoundingClientRect().right).toBeLessThanOrEqual(limit + 1)
      /* A clipped box inside the host is not a word on the page: Empty's live region
         is one, read by a screen reader and drawn nowhere. */
      expect(
        reach(host, (one) => one !== host && getComputedStyle(one).overflowX === 'hidden'),
      ).toBeLessThanOrEqual(limit + 1)
    })
  }

  run('a figure stays whole where the column has room', async () => {
    const box = await mount(
      '<div style="inline-size: 220px"><helix-stat value="99.9"></helix-stat></div>',
    )
    const host = box.firstElementChild as HTMLElement & { updateComplete: Promise<unknown> }
    await host.updateComplete
    const figure = host.shadowRoot?.querySelector('[part="value"]') as Element
    expect(figure.getClientRects().length).toBe(1)
  })

  for (const [name, markup] of Object.entries({
    field: `<helix-filter-chip label="${WORD}">Ada</helix-filter-chip>`,
    values: `<helix-filter-chip dismissible label="Owner">${WORD}</helix-filter-chip>`,
  })) {
    run(`Filter Chip's ${name}`, async () => {
      const box = await mount(`<div style="inline-size: 220px">${markup}</div>`)
      const host = box.firstElementChild as HTMLElement & { updateComplete: Promise<unknown> }
      await host.updateComplete
      const limit = host.getBoundingClientRect().right
      expect(limit).toBeLessThanOrEqual(box.getBoundingClientRect().right + 1)
      for (const part of host.shadowRoot?.querySelectorAll('[part]') ?? []) {
        expect(part.getBoundingClientRect().right).toBeLessThanOrEqual(limit + 1)
      }
    })
  }

  run('Filter Chip stays in an auto grid track', async () => {
    const box = await mount(
      `<div style="display: grid; inline-size: 220px"><helix-filter-chip label="Owner">${WORD}</helix-filter-chip></div>`,
    )
    const host = box.firstElementChild as HTMLElement & { updateComplete: Promise<unknown> }
    await host.updateComplete
    expect(host.getBoundingClientRect().right).toBeLessThanOrEqual(
      box.getBoundingClientRect().right + 1,
    )
  })

  run("Filter Chip's values give way before a short field", async () => {
    const box = await mount(
      `<div style="inline-size: 220px"><helix-filter-chip label="Owner">${WORD}</helix-filter-chip></div>`,
    )
    const host = box.firstElementChild as HTMLElement & { updateComplete: Promise<unknown> }
    await host.updateComplete
    const field = host.shadowRoot?.querySelector('[part="field"]') as HTMLElement
    expect(field.scrollWidth).toBeLessThanOrEqual(field.clientWidth)
  })
})

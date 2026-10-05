import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../text/index.js')
})

type Updatable = HTMLElement & { updateComplete: Promise<boolean> }

/** The color an element would have in the given ink, measured the same way. */
const ink = (token: string): string => {
  const probe = document.createElement('span')
  probe.style.color = `var(${token})`
  document.body.append(probe)
  const color = getComputedStyle(probe).color
  probe.remove()
  return color
}

describe('card body text', () => {
  if (hasLayout()) {
    test('a heading anywhere in the body keeps the heading ink, and the copy around it is muted', async () => {
      const host = await mount(
        `<helix-card><form><helix-text as="h3">Request access</helix-text><helix-text as="p">We answer within a day.</helix-text></form></helix-card>`,
      )
      const [heading, copy] = [...host.querySelectorAll('helix-text')] as Updatable[]
      await heading?.updateComplete
      expect(getComputedStyle(heading as Element).color).toBe(ink('--helix-color-foreground'))
      expect(getComputedStyle(copy as Element).color).toBe(ink('--helix-color-foreground-muted'))
    })

    test('outside a card a heading still takes the color around it', async () => {
      const host = await mount(
        `<div style="color: rgb(255, 255, 255)"><helix-text as="h1">Maps that work</helix-text></div>`,
      )
      const heading = host.querySelector('helix-text') as Updatable
      await heading.updateComplete
      expect(getComputedStyle(heading).color).toBe('rgb(255, 255, 255)')
    })
  }
})

/* The lines that hold actions, and the one gap hook every space in the card
   follows. */
describe('card actions and gap', () => {
  const sheet = (): string => {
    const card = customElements.get('helix-card') as unknown as {
      elementStyles: Array<{ cssText: string }>
    }
    return card.elementStyles.map((style) => style.cssText).join('\n')
  }

  test('a line with actions lays its two ends out side by side', () => {
    expect(sheet()).toMatch(/\[part="header-row"\],\s*\[part="footer-row"\] \{[^}]*display: flex/)
    expect(sheet()).toMatch(
      /\[part="footer-row"\] slot\[name="footer-actions"\]::slotted\(\*\) \{\s*margin-inline-start: auto/,
    )
  })

  test('the gap is a hook that falls back to the step it always was', () => {
    expect(sheet()).toContain('gap: var(--card-gap, var(--helix-space-sm))')
  })

  if (hasLayout()) {
    test('header actions sit at the end of the header line', async () => {
      const card = (await mount(
        '<helix-card style="inline-size: 320px"><h3 slot="header">Storage</h3><button slot="header-actions">Menu</button>Body</helix-card>',
      )) as Updatable
      await card.updateComplete
      const heading = card.querySelector('h3') as Element
      const menu = card.querySelector('button') as Element
      expect(Math.round(menu.getBoundingClientRect().top)).toBeLessThan(
        Math.round(heading.getBoundingClientRect().bottom),
      )
      expect(menu.getBoundingClientRect().left).toBeGreaterThan(
        heading.getBoundingClientRect().left,
      )
    })
  }
})

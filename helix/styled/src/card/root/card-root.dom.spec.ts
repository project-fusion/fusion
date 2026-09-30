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

import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const wait = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms))

type Card = HTMLElement & {
  delay: number
  delayOut: number
  for: string
  open: boolean
  updateComplete: Promise<unknown>
}

/**
 * A link and a card for it, with no delays. Set as properties: happy-dom
 * applies no attribute at upgrade, so `for` written in the markup reads empty.
 */
const setUp = async (): Promise<{ card: Card; inside: HTMLElement; link: HTMLElement }> => {
  const host = (await mount(
    '<div><a href="#ada" id="ada">Ada</a><helix-headless-hover-card><a href="#notes" id="notes">Notes</a></helix-headless-hover-card><button id="away">Away</button></div>',
  )) as HTMLElement
  const card = host.querySelector('helix-headless-hover-card') as Card
  card.delay = 0
  card.delayOut = 0
  card.for = 'ada'
  await card.updateComplete
  return {
    card,
    inside: host.querySelector('#notes') as HTMLElement,
    link: host.querySelector('#ada') as HTMLElement,
  }
}

describe('hover card', () => {
  test('opens once the pointer rests on the link, and closes once it leaves', async () => {
    const { card, link } = await setUp()
    link.dispatchEvent(new PointerEvent('pointerenter'))
    await wait(5)
    expect(card.open).toBe(true)
    link.dispatchEvent(new PointerEvent('pointerleave'))
    await wait(5)
    expect(card.open).toBe(false)
  })

  test('stays open while the pointer crosses from the link onto the card', async () => {
    const { card, link } = await setUp()
    card.delayOut = 50
    link.dispatchEvent(new PointerEvent('pointerenter'))
    await wait(5)
    link.dispatchEvent(new PointerEvent('pointerleave'))
    card.shadowRoot
      ?.querySelector('[part~="surface"]')
      ?.dispatchEvent(new PointerEvent('pointerenter'))
    await wait(80)
    expect(card.open).toBe(true)
  })

  test('stays open while focus moves from the link into the card, and closes when it leaves both', async () => {
    const { card, inside, link } = await setUp()
    card.open = true
    await card.updateComplete
    link.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: inside }))
    inside.dispatchEvent(new FocusEvent('focusin', { bubbles: true, composed: true }))
    await wait(5)
    expect(card.open).toBe(true)
    inside.dispatchEvent(
      new FocusEvent('focusout', { bubbles: true, relatedTarget: document.getElementById('away') }),
    )
    await wait(5)
    expect(card.open).toBe(false)
  })

  test('names nothing on the link', async () => {
    const { link } = await setUp()
    link.dispatchEvent(new PointerEvent('pointerenter'))
    await wait(5)
    expect(link.hasAttribute('aria-describedby')).toBe(false)
    expect(link.hasAttribute('aria-expanded')).toBe(false)
  })
})

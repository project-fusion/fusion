import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { pauseMotion } from '@fusion.dev/helix-core'
import { hasState, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

afterEach(() => {
  pauseMotion(false)
})

const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

type Marquee = HTMLElement & { updateComplete: Promise<unknown> }

describe('marquee', () => {
  test('draws the items a second time, hidden from screen readers and out of the tab order', async () => {
    const marquee = (await mount(
      '<helix-marquee><span>Northwind</span><a href="#c">Contoso</a></helix-marquee>',
    )) as Marquee
    await settle()
    const copy = part(marquee, 'copy') as HTMLElement
    expect(copy.getAttribute('aria-hidden')).toBe('true')
    expect(copy.hasAttribute('inert')).toBe(true)
    expect([...copy.children].map((one) => one.textContent)).toEqual(['Northwind', 'Contoso'])
  })

  test('draws the copy again when the items change', async () => {
    const marquee = (await mount('<helix-marquee><span>One</span></helix-marquee>')) as Marquee
    await settle()
    const added = document.createElement('span')
    added.textContent = 'Two'
    marquee.append(added)
    await settle()
    await marquee.updateComplete
    expect((part(marquee, 'copy') as HTMLElement).textContent).toBe('OneTwo')
  })

  test('holds while the page has paused its motion', async () => {
    const marquee = (await mount('<helix-marquee><span>One</span></helix-marquee>')) as Marquee
    expect(hasState(marquee, 'paused')).toBe(false)
    pauseMotion()
    await settle()
    expect(hasState(marquee, 'paused')).toBe(true)
  })
})

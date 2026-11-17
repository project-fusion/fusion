import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/**
 * A bar and, beside it, a box of 100 pixels holding 500, scrolled to `top`.
 * happy-dom lays out nothing, so the box says so itself. `for` is set as a
 * property: happy-dom applies no attribute at upgrade.
 */
const following = async (
  id: string,
  top: number,
): Promise<{ bar: HTMLElement; scroller: HTMLElement & { scrollTop: number } }> => {
  const host = (await mount(
    `<div><div id="${id}"></div><helix-scroll-progress></helix-scroll-progress></div>`,
  )) as HTMLElement
  const scroller = host.querySelector(`#${id}`) as HTMLElement & { scrollTop: number }
  Object.defineProperty(scroller, 'clientHeight', { get: () => 100 })
  Object.defineProperty(scroller, 'scrollHeight', { get: () => 500 })
  Object.defineProperty(scroller, 'scrollTop', { configurable: true, value: top, writable: true })
  const bar = host.querySelector('helix-scroll-progress') as HTMLElement & {
    for: string
    updateComplete: Promise<unknown>
  }
  bar.for = id
  await bar.updateComplete
  return { bar, scroller }
}

const frame = () => new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))

describe('scroll progress', () => {
  test('writes the share of the box scrolled, and follows the box as it scrolls', async () => {
    const { bar, scroller } = await following('article', 100)
    expect(bar.style.getPropertyValue('--scroll-progress-value')).toBe('0.25')
    scroller.scrollTop = 400
    scroller.dispatchEvent(new Event('scroll'))
    await frame()
    expect(bar.style.getPropertyValue('--scroll-progress-value')).toBe('1')
  })

  test('is hidden from screen readers', async () => {
    const { bar } = await following('quiet', 0)
    expect(part(bar, 'track')?.getAttribute('aria-hidden')).toBe('true')
  })

  test('stops following a box once it leaves the page', async () => {
    const { bar, scroller } = await following('gone', 0)
    bar.remove()
    scroller.scrollTop = 200
    scroller.dispatchEvent(new Event('scroll'))
    await frame()
    expect(bar.style.getPropertyValue('--scroll-progress-value')).toBe('0')
  })
})

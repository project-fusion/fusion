import '@fusion.dev/helix-testing/dom/register'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import { trackIndicator } from './track-indicator.js'

const realResizeObserver = globalThis.ResizeObserver

beforeAll(() => {
  registerDom()
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
})

afterAll(() => {
  globalThis.ResizeObserver = realResizeObserver
})

afterEach(() => {
  document.body.replaceChildren()
})

const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

/** A row of three links 80 wide, and a mark, laid out by hand since happy-dom lays out nothing. */
const nav = () => {
  const element = document.createElement('nav')
  element.getBoundingClientRect = () =>
    ({ bottom: 40, height: 40, left: 0, right: 240, top: 0, width: 240 }) as DOMRect
  Object.defineProperty(element, 'offsetWidth', { get: () => 240 })
  Object.defineProperty(element, 'offsetHeight', { get: () => 40 })
  const links = ['Home', 'Docs', 'Blog'].map((name, at) => {
    const link = document.createElement('a')
    link.textContent = name
    link.getBoundingClientRect = () =>
      ({ bottom: 40, height: 40, left: at * 80, right: at * 80 + 80, top: 0, width: 80 }) as DOMRect
    return link
  })
  const mark = document.createElement('span')
  element.append(...links, mark)
  document.body.append(element)
  return { element, links, mark }
}

describe('tracking the marked item of a plain element', () => {
  test('places the mark on the marked item, and again where the mark moves to another', async () => {
    const { element, links, mark } = nav()
    links[0]?.setAttribute('aria-current', 'page')
    const tracked = trackIndicator(element, {
      active: '[aria-current="page"]',
      indicator: mark,
      surface: element,
    })
    expect(mark.style.getPropertyValue('--indicator-x')).toBe('0px')
    expect(mark.style.getPropertyValue('--indicator-inline-size')).toBe('80px')
    expect(mark.hasAttribute('data-placed')).toBe(true)
    links[0]?.removeAttribute('aria-current')
    links[2]?.setAttribute('aria-current', 'page')
    await settle()
    expect(mark.style.getPropertyValue('--indicator-x')).toBe('160px')
    expect(mark.hasAttribute('data-moving')).toBe(true)
    tracked.stop()
    links[2]?.removeAttribute('aria-current')
    links[1]?.setAttribute('aria-current', 'page')
    await settle()
    expect(mark.style.getPropertyValue('--indicator-x')).toBe('160px')
  })

  test('takes the mark away while nothing is marked', async () => {
    const { element, links, mark } = nav()
    links[1]?.setAttribute('aria-current', 'page')
    const tracked = trackIndicator(element, { active: '[aria-current]', indicator: mark })
    expect(mark.hasAttribute('data-placed')).toBe(true)
    links[1]?.removeAttribute('aria-current')
    await settle()
    expect(mark.hasAttribute('data-placed')).toBe(false)
    tracked.stop()
  })
})

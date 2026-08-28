import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Nav = HTMLElement & {
  behavior: ScrollBehavior
  current: string
  offset: number
  updateComplete: Promise<boolean>
}

describe('page nav', () => {
  test('a link pointing at nothing is skipped rather than throwing', async () => {
    /* Fragments go stale: a heading is renamed and the contents page still
       points at the old id. Marking nothing is right; failing to render is
       not. */
    const nav = (await mount(
      `<helix-headless-outline label="On this page"><a href="#gone">Gone</a></helix-headless-outline>`,
    )) as Nav
    await nav.updateComplete
    expect(nav.querySelector('a')?.hasAttribute('aria-current')).toBe(false)
  })

  test('nothing is marked before anything has been measured', async () => {
    const nav = (await mount('<helix-headless-outline></helix-headless-outline>')) as Nav
    await nav.updateComplete
    expect(nav.current).toBe('')
  })
})
describe('outline scrolling', () => {
  const page = async (attrs = '') => {
    const nav = (await mount(
      `<div><helix-headless-outline ${attrs} label="On this page">` +
        '<a href="#one">One</a><a href="#two">Two</a>' +
        '</helix-headless-outline>' +
        '<section id="one"><h2>One</h2></section><section id="two"><h2>Two</h2></section></div>',
    )) as HTMLElement
    const outline = nav.querySelector('helix-headless-outline') as Nav
    await outline.updateComplete
    return { outline, root: nav }
  }

  const press = (root: HTMLElement, href: string) => {
    const event = new MouseEvent('click', { bubbles: true, button: 0, cancelable: true })
    root.querySelector<HTMLAnchorElement>(`a[href="${href}"]`)?.dispatchEvent(event)
    return event
  }

  test('offset reaches the sections, not only the marker', async () => {
    /* It described where the top of the readable area is and exactly one thing
       read it. Click a link and the browser put the heading against the very
       top of the window, under the masthead whose height the consumer had just
       measured for us. */
    const { outline, root } = await page('offset="64"')
    await outline.updateComplete
    expect((root.querySelector('#two') as HTMLElement).style.scrollMarginBlockStart).toBe('64px')
  })

  test('no offset leaves no style attribute behind', async () => {
    const { root } = await page()
    expect((root.querySelector('#two') as HTMLElement).style.scrollMarginBlockStart).toBe('')
  })

  test('the offset is cleared when it goes back to zero', async () => {
    const { outline, root } = await page('offset="64"')
    outline.offset = 0
    await outline.updateComplete
    expect((root.querySelector('#two') as HTMLElement).style.scrollMarginBlockStart).toBe('')
  })

  test('auto leaves the navigation to the browser', async () => {
    /* The whole point of the default: four things happen on a fragment click
       and the platform does all four. Taking the click to do one of them is
       what makes the other three this component's problem. */
    const { root } = await page()
    expect(press(root, '#two').defaultPrevented).toBe(false)
  })

  test('a chosen behavior takes the click, and puts focus where the anchor would have', async () => {
    const { root } = await page('behavior="smooth"')
    expect(press(root, '#two').defaultPrevented).toBe(true)
    const target = root.querySelector('#two') as HTMLElement
    expect(target.getAttribute('tabindex')).toBe('-1')
    expect(document.activeElement).toBe(target)
  })

  test('a modified click is left alone, being a new tab rather than a jump', async () => {
    const { root } = await page('behavior="smooth"')
    const event = new MouseEvent('click', {
      bubbles: true,
      button: 0,
      cancelable: true,
      metaKey: true,
    })
    root.querySelector<HTMLAnchorElement>('a[href="#two"]')?.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
  })

  test('a link pointing at nothing is not taken over', async () => {
    const { root } = await page('behavior="smooth"')
    const stale = document.createElement('a')
    stale.setAttribute('href', '#gone')
    root.querySelector('helix-headless-outline')?.append(stale)
    await (root.querySelector('helix-headless-outline') as Nav).updateComplete
    const event = new MouseEvent('click', { bubbles: true, button: 0, cancelable: true })
    stale.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
  })
})

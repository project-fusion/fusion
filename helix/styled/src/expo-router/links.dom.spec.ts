import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'
import { routedBy } from './links.js'

beforeAll(async () => {
  registerDom()
  /* The page the app shows, under the base URL `/app`. */
  ;(window as unknown as { happyDOM: { setURL: (url: string) => void } }).happyDOM.setURL(
    'https://fusion.test/app/projects',
  )
  await import('../index.js')
})

/** The route a click on `target` goes to, as the document hears the click once it has passed every handler on the way. */
const routeOfClick = (
  target: Element,
  init: MouseEventInit = {},
  base: string | undefined = '/app',
): string | undefined => {
  let route: string | undefined
  const hear = (event: Event) => {
    route = routedBy(event as MouseEvent, window.location, base)
    event.preventDefault()
  }
  document.addEventListener('click', hear)
  target.dispatchEvent(
    new MouseEvent('click', {
      bubbles: true,
      button: 0,
      cancelable: true,
      composed: true,
      ...init,
    }),
  )
  document.removeEventListener('click', hear)
  return route
}

const link = async (href: string, attributes = ''): Promise<HTMLAnchorElement> =>
  (await mount(`<a href="${href}" ${attributes}>Go</a>`)) as HTMLAnchorElement

describe('routedBy', () => {
  test('follows a plain press on a link to a route under the base URL', async () => {
    expect(routeOfClick(await link('/app/projects/website'))).toBe('/projects/website')
    expect(routeOfClick(await link('/app/projects?sort=due'))).toBe('/projects?sort=due')
    expect(routeOfClick(await link('/pricing'), {}, '')).toBe('/pricing')
  })

  test('leaves a modified press, another button, a new window, and a download to the browser', async () => {
    expect(routeOfClick(await link('/app/projects'), { metaKey: true })).toBeUndefined()
    expect(routeOfClick(await link('/app/projects'), { ctrlKey: true })).toBeUndefined()
    expect(routeOfClick(await link('/app/projects'), { shiftKey: true })).toBeUndefined()
    expect(routeOfClick(await link('/app/projects'), { button: 1 })).toBeUndefined()
    expect(routeOfClick(await link('/app/projects', 'target="_blank"'))).toBeUndefined()
    expect(routeOfClick(await link('/app/projects', 'download'))).toBeUndefined()
  })

  test('leaves another origin, an address outside the base URL, and a fragment of the page to the browser', async () => {
    expect(routeOfClick(await link('https://example.com/app/projects'))).toBeUndefined()
    expect(routeOfClick(await link('/pricing'))).toBeUndefined()
    expect(routeOfClick(await link(`${window.location.pathname}#archive`))).toBeUndefined()
  })

  test('follows the anchor a Helix element draws in its shadow root', async () => {
    const item = (await mount(
      '<helix-navigation-item href="/app/activity">Activity</helix-navigation-item>',
    )) as HTMLElement & { updateComplete: Promise<unknown> }
    await item.updateComplete
    const anchor = part(item, 'link') as Element
    expect(routeOfClick(anchor)).toBe('/activity')
  })

  test('leaves a press whose request a handler refused where it is', async () => {
    const item = (await mount(
      '<helix-navigation-item href="/app/activity">Activity</helix-navigation-item>',
    )) as HTMLElement & { updateComplete: Promise<unknown> }
    await item.updateComplete
    item.addEventListener('helix-before-select', (event) => event.preventDefault())
    expect(routeOfClick(part(item, 'link') as Element)).toBeUndefined()
  })
})

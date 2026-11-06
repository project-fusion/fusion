import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Updating = HTMLElement & { updateComplete: Promise<boolean> }

/** Lets the sections tell the outline, and the outline draw. */
const settle = async (root: Element): Promise<void> => {
  for (const element of root.querySelectorAll<Updating>('*')) {
    await element.updateComplete
  }
  await Promise.resolve()
  await Promise.resolve()
}

const links = (outline: Element) =>
  [...outline.querySelectorAll('a')].map((link) => [
    link.getAttribute('href'),
    link.textContent,
    link.getAttribute('data-level'),
  ])

describe('outline section', () => {
  test('takes its anchor as its id, which a link finds', async () => {
    const section = (await mount(
      '<helix-headless-outline-section anchor="install" label="Install"></helix-headless-outline-section>',
    )) as Updating
    await section.updateComplete
    expect(section.id).toBe('install')
  })

  test('an outline with no links draws one for each section, in page order', async () => {
    const root = await mount(
      '<div><helix-headless-outline></helix-headless-outline>' +
        '<helix-headless-outline-section anchor="install" label="Install"></helix-headless-outline-section>' +
        '<helix-headless-outline-section anchor="props" label="Props" level="2"></helix-headless-outline-section>' +
        '<helix-headless-outline-section anchor="events"></helix-headless-outline-section></div>',
    )
    await settle(root)
    const outline = root.querySelector('helix-headless-outline') as Element
    expect(links(outline)).toEqual([
      ['#install', 'Install', null],
      ['#props', 'Props', '2'],
      ['#events', 'events', null],
    ])
    root.querySelector('[anchor="props"]')?.remove()
    await settle(root)
    expect(links(outline).map(([href]) => href)).toEqual(['#install', '#events'])
  })

  test('an outline with links of yours draws none', async () => {
    const root = await mount(
      '<div><helix-headless-outline><a href="#install">Setup</a></helix-headless-outline>' +
        '<helix-headless-outline-section anchor="install" label="Install"></helix-headless-outline-section></div>',
    )
    await settle(root)
    expect(links(root.querySelector('helix-headless-outline') as Element)).toEqual([
      ['#install', 'Setup', null],
    ])
  })
})

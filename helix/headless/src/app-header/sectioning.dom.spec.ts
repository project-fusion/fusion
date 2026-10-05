import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

let inSectioningContent: (element: Element) => boolean

beforeAll(async () => {
  registerDom()
  ;({ inSectioningContent } = await import('./sectioning.js'))
})

describe('inSectioningContent', () => {
  test('is false for a header whose nearest sectioning ancestor is the body', () => {
    document.body.innerHTML = '<div><span id="here"></span></div>'
    expect(inSectioningContent(document.getElementById('here') as Element)).toBe(false)
  })

  test('is true inside main, article, aside, nav or section', () => {
    for (const tag of ['main', 'article', 'aside', 'nav', 'section']) {
      document.body.innerHTML = `<${tag}><div><span id="here"></span></div></${tag}>`
      expect(inSectioningContent(document.getElementById('here') as Element)).toBe(true)
    }
  })

  test('counts the explicit role of a sectioning element', () => {
    document.body.innerHTML = '<div role="main"><span id="here"></span></div>'
    expect(inSectioningContent(document.getElementById('here') as Element)).toBe(true)
  })

  test('reads across a shadow boundary', () => {
    document.body.innerHTML = '<main><div id="host"></div></main>'
    const host = document.getElementById('host') as HTMLElement
    const root = host.attachShadow({ mode: 'open' })
    root.innerHTML = '<span id="inside"></span>'
    expect(inSectioningContent(root.getElementById('inside') as Element)).toBe(true)
  })

  /* A header slotted into a component that draws a `<nav>` around its slot is
     inside that `<nav>`, as the accessibility tree reads it. Walking the light
     DOM went from the header to the component's host and past the `<nav>`. */
  test('reads through the slot an element is assigned to', () => {
    document.body.innerHTML = '<div id="host"><span id="here"></span></div>'
    const host = document.getElementById('host') as HTMLElement
    const root = host.attachShadow({ mode: 'open' })
    root.innerHTML = '<nav><slot></slot></nav>'
    const here = document.getElementById('here') as Element
    /* happy-dom assigns no slots, so `assignedSlot` is supplied here: the half
       under test is the walk through it. */
    Object.defineProperty(here, 'assignedSlot', { value: root.querySelector('slot') })
    expect(inSectioningContent(here)).toBe(true)
  })
})

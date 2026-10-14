import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

/* A container does not register another family's children, so a page that
   writes an option inside a select and imports only the select is told which
   entry to add, or on a tier of its own which tag to define. */

let auditChildren: typeof import('./audit-children.js').auditChildren
let QUIET: number
let customElement: typeof import('../custom-element/custom-element.js').customElement

beforeAll(async () => {
  registerDom()
  ;({ auditChildren, QUIET } = await import('./audit-children.js'))
  ;({ customElement } = await import('../custom-element/custom-element.js'))
})

const warn = console.warn
afterEach(() => {
  console.warn = warn
  document.body.innerHTML = ''
})

const frames = (): Promise<void> =>
  new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

/** Once the page has painted and Helix has registered nothing for the quiet period. */
const painted = async (): Promise<void> => {
  await frames()
  await wait(QUIET + 50)
}

/** A container of `tier`, holding `markup`. */
const container = (tag: string, tier: string, markup: string): HTMLElement => {
  if (!customElements.get(tag)) {
    customElements.define(
      tag,
      class extends HTMLElement {
        static tier = tier
      },
    )
  }
  document.body.innerHTML = `<${tag}>${markup}</${tag}>`
  return document.body.firstElementChild as HTMLElement
}

describe('the unregistered-child audit', () => {
  test('reports an undefined child once, with the import to add', async () => {
    const warnings: string[] = []
    console.warn = (message: string) => warnings.push(message)
    const host = container(
      'x-select',
      'helix-headless-',
      '<helix-headless-option>One</helix-headless-option><helix-headless-option>Two</helix-headless-option>',
    )
    auditChildren(host, 'option', 'option', 'it offers no choices')
    auditChildren(host, 'option', 'option', 'it offers no choices')
    await painted()
    auditChildren(host, 'option', 'option', 'it offers no choices')
    await painted()
    expect(warnings).toEqual([
      "<helix-headless-option> in <x-select> is not registered, so it offers no choices. Import '@fusion.dev/helix-headless/option'.",
    ])
  })

  test('names the styled entry for the styled tier', async () => {
    const warnings: string[] = []
    console.warn = (message: string) => warnings.push(message)
    const host = container('x-combobox', 'helix-', '<helix-option>One</helix-option>')
    auditChildren(host, 'option', 'option', 'it offers no choices')
    await painted()
    expect(warnings[0]).toContain("Import '@fusion.dev/helix/option'.")
  })

  test('reports a child the host draws from data, with none in its light DOM', async () => {
    const warnings: string[] = []
    console.warn = (message: string) => warnings.push(message)
    auditChildren(
      container('w-listbox', 'helix-headless-', ''),
      'option',
      'option',
      'the items draw nothing',
      true,
    )
    await painted()
    expect(warnings).toEqual([
      "<helix-headless-option> in <w-listbox> is not registered, so the items draw nothing. Import '@fusion.dev/helix-headless/option'.",
    ])
  })

  /* No entry of ours registers `acme-option`: the page that subclassed the
     container defines its children too. */
  test('names the tag to define on a tier of your own', async () => {
    const warnings: string[] = []
    console.warn = (message: string) => warnings.push(message)
    const host = container('acme-select', 'acme-', '<acme-option>One</acme-option>')
    auditChildren(host, 'option', 'option', 'it offers no choices')
    await painted()
    expect(warnings).toEqual([
      '<acme-option> in <acme-select> is not registered, so it offers no choices. Define <acme-option> as you defined <acme-select>.',
    ])
  })

  /* An app importing its families with `import()` registers each as its
     chunk lands, after the page has painted: the child is defined late,
     and is not missing. */
  test('says nothing for a child defined after the page painted', async () => {
    const warnings: string[] = []
    console.warn = (message: string) => warnings.push(message)
    auditChildren(container('l-select', 'l-', '<l-option>One</l-option>'), 'option', 'option', 'x')
    await frames()
    await wait(QUIET / 2)
    customElements.define('l-option', class extends HTMLElement {})
    await wait(QUIET + 50)
    expect(warnings).toEqual([])
  })

  /* Each family Helix registers while the child is missing starts the quiet
     period again, so a child whose chunk lands last is still not reported. */
  test('waits while Helix is still registering families', async () => {
    const warnings: string[] = []
    console.warn = (message: string) => warnings.push(message)
    auditChildren(container('m-select', 'm-', '<m-option>One</m-option>'), 'option', 'option', 'x')
    await frames()
    await wait(QUIET * 0.7)
    customElement('m-other')(class extends HTMLElement {})
    await wait(QUIET * 0.7)
    expect(warnings).toEqual([])
    customElements.define('m-option', class extends HTMLElement {})
    await wait(QUIET + 50)
    expect(warnings).toEqual([])
  })

  test('says nothing for a registered child, or for none', async () => {
    const warnings: string[] = []
    console.warn = (message: string) => warnings.push(message)
    customElements.define('y-option', class extends HTMLElement {})
    auditChildren(container('y-select', 'y-', '<y-option>One</y-option>'), 'option', 'option', 'x')
    await painted()
    auditChildren(container('z-select', 'z-', 'Empty'), 'option', 'option', 'x')
    await painted()
    expect(warnings).toEqual([])
  })
})

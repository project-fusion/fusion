import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

/* A container does not register another family's children, so a page that
   writes an option inside a select and imports only the select is told which
   entry to add. */

let auditChildren: typeof import('./audit-children.js').auditChildren

beforeAll(async () => {
  registerDom()
  ;({ auditChildren } = await import('./audit-children.js'))
})

const warn = console.warn
afterEach(() => {
  console.warn = warn
  document.body.innerHTML = ''
})

const painted = (): Promise<void> =>
  new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))

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
    const host = container('x-select', 'x-', '<x-option>One</x-option><x-option>Two</x-option>')
    auditChildren(host, 'option', 'option', 'it offers no choices')
    auditChildren(host, 'option', 'option', 'it offers no choices')
    await painted()
    auditChildren(host, 'option', 'option', 'it offers no choices')
    await painted()
    expect(warnings).toEqual([
      "<x-option> in <x-select> is not registered, so it offers no choices. Import '@fusion.dev/helix-headless/option'.",
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

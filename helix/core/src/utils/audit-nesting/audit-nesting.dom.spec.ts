import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

/* A tree item nested without `slot="children"` was read as words in its
   parent's label, and nothing said so. */

let auditNesting: typeof import('./audit-nesting.js').auditNesting

beforeAll(async () => {
  registerDom()
  ;({ auditNesting } = await import('./audit-nesting.js'))
})

const warn = console.warn
afterEach(() => {
  console.warn = warn
  document.body.innerHTML = ''
})

const item = (markup: string): HTMLElement => {
  document.body.innerHTML = markup
  return document.body.firstElementChild as HTMLElement
}

describe('the unslotted-item audit', () => {
  test('reports an item nested in the default slot, once', () => {
    const warnings: string[] = []
    console.warn = (message: string) => warnings.push(message)
    const host = item('<x-item>src<x-item>app.ts</x-item></x-item>')
    auditNesting(host, 'children')
    auditNesting(host, 'children')
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('slot="children"')
  })

  test('says nothing for an item nested in its slot, or for other content', () => {
    const warnings: string[] = []
    console.warn = (message: string) => warnings.push(message)
    auditNesting(item('<x-item>src<x-item slot="children">app.ts</x-item></x-item>'), 'children')
    auditNesting(item('<x-item>src <b>bold</b></x-item>'), 'children')
    expect(warnings).toEqual([])
  })
})

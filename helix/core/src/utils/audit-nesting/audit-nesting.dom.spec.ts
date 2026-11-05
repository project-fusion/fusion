import '@fusion.dev/helix-testing/dom/register'
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

/* A menu row inside a `<div>` was skipped by the keys, and its submenu opened
   on an empty page, with nothing said. */
describe('the wrapped-row audit', () => {
  let auditWrapped: typeof import('./audit-nesting.js').auditWrapped

  beforeAll(async () => {
    ;({ auditWrapped } = await import('./audit-nesting.js'))
  })

  /** The direct children of a host that are rows, which is what the spec's host reads. */
  const direct = (host: HTMLElement) => () =>
    [...host.children].filter((each) => each.localName === 'x-row')

  test('reports a row inside an element of the page, once, naming the wrapper and the fix', () => {
    const warnings: string[] = []
    console.warn = (message: string) => warnings.push(message)
    const host = item('<x-menu><x-row>Copy</x-row><div><x-row>Pin</x-row></div></x-menu>')
    auditWrapped(host, 'x-row', direct(host), () => 'the keys skip it', 'Move it.')
    auditWrapped(host, 'x-row', direct(host), () => 'the keys skip it', 'Move it.')
    expect(warnings).toEqual([
      '<x-row> sits inside a <div> in <x-menu>, so the keys skip it. Move it.',
    ])
  })

  test('says nothing for rows the host reads, or for a row of a menu nested in it', () => {
    const warnings: string[] = []
    console.warn = (message: string) => warnings.push(message)
    const host = item(
      '<x-menu><x-row>Copy</x-row><x-row>More<x-menu><x-row>Inner</x-row></x-menu></x-row></x-menu>',
    )
    auditWrapped(host, 'x-row', direct(host), () => 'the keys skip it', 'Move it.')
    expect(warnings).toEqual([])
  })
})

import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

/* The row a reader is on: `aria-current` for the accessibility tree and a part
   name for a stylesheet, since nothing can follow `::part()` with an
   attribute. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Row = HTMLElement & { internals?: ElementInternals; updateComplete: Promise<unknown> }

describe('current', () => {
  test('a linked row says it on its link, and names the row part for it', async () => {
    const row = (await mount(
      '<helix-headless-list-item href="/a" current="page">Home</helix-headless-list-item>',
    )) as Row
    expect(part(row, 'link')?.getAttribute('aria-current')).toBe('page')
    expect(part(row, 'row')?.getAttribute('part')).toBe('row row-current')
    expect(row.internals?.ariaCurrent ?? null).toBeNull()
  })

  test('a row with no link says it on the row, and bare means the current one of a set', async () => {
    const row = (await mount(
      '<helix-headless-list-item current>Home</helix-headless-list-item>',
    )) as Row
    expect(row.internals?.ariaCurrent).toBe('true')
  })

  test('a row that is not current says nothing, and is not written onto the host', async () => {
    const row = (await mount(
      '<helix-headless-list-item href="/a">Home</helix-headless-list-item>',
    )) as Row
    expect(part(row, 'link')?.hasAttribute('aria-current')).toBe(false)
    expect(part(row, 'row')?.getAttribute('part')).toBe('row')
    expect(row.internals?.ariaCurrent ?? null).toBeNull()
  })

  test('false is not current', async () => {
    const row = (await mount(
      '<helix-headless-list-item current="false">Home</helix-headless-list-item>',
    )) as Row
    expect(row.internals?.ariaCurrent ?? null).toBeNull()
  })
})

import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Cursor = HTMLElement & {
  name: string
  series: number
  updateComplete: Promise<unknown>
  x: number
  y: number
}

describe('cursor', () => {
  test('moves the pointer to its place, in the color its series names', async () => {
    const cursor = (await mount('<helix-cursor></helix-cursor>')) as Cursor
    cursor.x = 120
    cursor.y = 48
    cursor.series = 23
    cursor.name = 'Ada'
    await cursor.updateComplete
    const pointer = part(cursor, 'pointer') as HTMLElement
    expect(pointer.style.getPropertyValue('--_cursor-x')).toBe('120px')
    expect(pointer.style.getPropertyValue('--_cursor-y')).toBe('48px')
    expect(pointer.style.getPropertyValue('--_cursor-series')).toBe('var(--helix-color-series-3)')
    expect(part(cursor, 'label')?.textContent).toBe('Ada')
  })

  test('is nothing to a screen reader, and draws no label without a name', async () => {
    const cursor = (await mount('<helix-cursor></helix-cursor>')) as Cursor
    expect(part(cursor, 'pointer')?.getAttribute('aria-hidden')).toBe('true')
    expect(part(cursor, 'label')).toBe(null)
  })
})

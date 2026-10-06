import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

let options: typeof import('./data-options.js')

beforeAll(async () => {
  registerDom()
  options = await import('./data-options.js')
})

type Row = HTMLElement & {
  active?: boolean
  disabled?: boolean
  selected?: boolean
  value?: string
}

describe('drawing a window of options', () => {
  const rows = (): ReturnType<typeof options.dataOptions> => {
    const all = options.dataOptions(['Alpha', 'Beta', { disabled: true, value: 'Gamma' }, 'Delta'])
    ;(all[1] as { selected: boolean }).selected = true
    ;(all[3] as { active: boolean }).active = true
    return all
  }

  test('one element of the tag for each position, with its words, state and place in the set', () => {
    const box = document.createElement('div')
    const drawn = options.drawOptions(box, 'x-option', rows(), [1, 2], false) as Row[]
    expect(drawn.map((row) => row.localName)).toEqual(['x-option', 'x-option'])
    expect(drawn.map((row) => row.textContent)).toEqual(['Beta', 'Gamma'])
    expect(drawn.map((row) => [row.value, row.selected, row.disabled])).toEqual([
      ['Beta', true, false],
      ['Gamma', false, true],
    ])
    expect(drawn.map((row) => row.getAttribute('aria-posinset'))).toEqual(['2', '3'])
    expect(drawn.map((row) => row.getAttribute('aria-setsize'))).toEqual(['4', '4'])
  })

  test('reuses the elements it drew by position, and removes the ones left over', () => {
    const box = document.createElement('div')
    const [first] = options.drawOptions(box, 'x-option', rows(), [0, 1, 2], false)
    const again = options.drawOptions(box, 'x-option', rows(), [3], false) as Row[]
    expect(again[0]).toBe(first as Row)
    expect(box.children.length).toBe(1)
    expect([again[0]?.textContent, again[0]?.active]).toEqual(['Delta', true])
  })

  test('holds every row down in a disabled list', () => {
    const box = document.createElement('div')
    const drawn = options.drawOptions(box, 'x-option', rows(), [0, 1], true) as Row[]
    expect(drawn.map((row) => row.disabled)).toEqual([true, true])
  })
})

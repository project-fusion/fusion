import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

/* Imported once the DOM is registered: lit reads `document` as it is
   evaluated, and a static import finds none. */
let render: typeof import('lit').render
let drawValueAxis: typeof import('./draw-value-axis.js').drawValueAxis

beforeAll(async () => {
  registerDom()
  ;({ render } = await import('lit'))
  ;({ drawValueAxis } = await import('./draw-value-axis.js'))
})

describe('a value axis', () => {
  test('writes a tick at each level, placed down the plot, with the widest number as its width', () => {
    const box = document.createElement('div')
    render(
      drawValueAxis(
        [0, 1000],
        (value) => 100 - value / 10,
        (value) => `${value}`,
        '--x-axis',
      ),
      box,
    )
    const ticks = [...box.querySelectorAll('[part="tick"]')]
    expect(ticks.map((one) => one.textContent)).toEqual(['0', '200', '400', '600', '800', '1000'])
    expect((ticks[1] as HTMLElement).getAttribute('style')).toBe('inset-block-start: 80%')
    const axis = box.querySelector('[part="axis"]') as HTMLElement
    expect(axis.getAttribute('aria-hidden')).toBe('true')
    expect(axis.getAttribute('style')).toBe('--x-axis: 4ch')
  })
})

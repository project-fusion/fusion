import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

let tabStops: (root: Element) => HTMLElement[]

beforeAll(async () => {
  registerDom()
  ;({ tabStops } = await import('./tab-stops.js'))
})

describe('tabStops', () => {
  test('walks into shadow roots and slots in the order Tab reaches them', () => {
    document.body.innerHTML = `<div id="root">
      <button id="a">A</button>
      <div id="host"><button id="slotted">Slotted</button></div>
      <button id="z">Z</button>
    </div>`
    const host = document.getElementById('host') as HTMLElement
    const shadow = host.attachShadow({ mode: 'open' })
    shadow.innerHTML =
      '<button id="inner">Inner</button><slot></slot><span tabindex="0" id="span">S</span>'
    const ids = tabStops(document.getElementById('root') as Element).map((one) => one.id)
    expect(ids).toEqual(['a', 'inner', 'slotted', 'span', 'z'])
  })

  test('leaves out what Tab passes over', () => {
    document.body.innerHTML = `<div id="root">
      <button disabled>Off</button>
      <div hidden><button>Hidden</button></div>
      <span tabindex="-1">Roving</span>
      <div inert><button>Inert</button></div>
      <button id="on">On</button>
    </div>`
    expect(tabStops(document.getElementById('root') as Element).map((one) => one.id)).toEqual([
      'on',
    ])
  })
})

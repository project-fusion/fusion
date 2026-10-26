import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import { Scrim } from './scrim.js'

/* The presses a sheet's scrim takes: a press beside the sheet closes it and
   reaches nothing under it, from its `pointerdown` to its `click`. */

beforeAll(() => {
  registerDom()
})

const scrims: Scrim[] = []
afterEach(() => {
  for (const one of scrims.splice(0)) {
    one.uncover()
    window.dispatchEvent(new Event('pointerdown'))
  }
  document.body.innerHTML = ''
})

const scene = () => {
  document.body.innerHTML =
    '<button id="page">page</button><div id="surface"><button id="row">row</button></div>'
  const page = document.getElementById('page') as HTMLElement
  const row = document.getElementById('row') as HTMLElement
  const surface = document.getElementById('surface') as HTMLElement
  const heard: string[] = []
  for (const type of ['pointerdown', 'pointerup', 'click']) {
    page.addEventListener(type, () => heard.push(`page ${type}`))
    row.addEventListener(type, () => heard.push(`row ${type}`))
  }
  let pressed = 0
  const scrim = new Scrim({
    holds: () => false,
    onPress: () => {
      pressed += 1
    },
    surface: () => surface,
  })
  scrims.push(scrim)
  return { heard, page, pressed: () => pressed, row, scrim }
}

const press = (target: HTMLElement, detail = 1) => {
  const init = { bubbles: true, cancelable: true, composed: true }
  const down = new MouseEvent('pointerdown', init)
  target.dispatchEvent(down)
  target.dispatchEvent(new MouseEvent('pointerup', init))
  target.dispatchEvent(new MouseEvent('click', { ...init, detail }))
  return down
}

describe('a sheet’s scrim', () => {
  test('takes a press beside the sheet, which closes it and reaches nothing under it', () => {
    const one = scene()
    one.scrim.cover()
    const down = press(one.page)
    expect(one.pressed()).toBe(1)
    expect(one.heard).toEqual([])
    expect(down.defaultPrevented).toBe(true)
  })

  test('stops the rest of the press once the sheet has closed on its pointerdown', () => {
    const one = scene()
    one.scrim.cover()
    const init = { bubbles: true, cancelable: true, composed: true }
    one.page.dispatchEvent(new MouseEvent('pointerdown', init))
    one.scrim.uncover()
    one.page.dispatchEvent(new MouseEvent('click', { ...init, detail: 1 }))
    expect(one.heard).toEqual([])
    press(one.page)
    expect(one.heard).toEqual(['page pointerdown', 'page pointerup', 'page click'])
    expect(one.pressed()).toBe(1)
  })

  test('leaves a press inside the sheet to the sheet', () => {
    const one = scene()
    one.scrim.cover()
    press(one.row)
    expect(one.pressed()).toBe(0)
    expect(one.heard).toEqual(['row pointerdown', 'row pointerup', 'row click'])
  })

  test('leaves a click the keyboard sent to the page', () => {
    const one = scene()
    one.scrim.cover()
    one.page.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true, detail: 0 }))
    expect(one.heard).toEqual(['page click'])
  })

  test('takes nothing while the sheet is not showing', () => {
    const one = scene()
    press(one.page)
    expect(one.pressed()).toBe(0)
    expect(one.heard).toEqual(['page pointerdown', 'page pointerup', 'page click'])
  })
})

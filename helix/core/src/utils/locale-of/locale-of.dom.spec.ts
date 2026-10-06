import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

let localeOf: typeof import('./locale-of.js').localeOf

beforeAll(async () => {
  registerDom()
  ;({ localeOf } = await import('./locale-of.js'))
})

describe('the locale an element speaks', () => {
  test('is its own where one is set', () => {
    document.body.innerHTML = '<div lang="de"><span id="at"></span></div>'
    expect(localeOf(document.querySelector('#at') as Element, 'fr')).toBe('fr')
  })

  test('is otherwise the nearest `lang`, its own or an ancestor’s', () => {
    document.body.innerHTML = '<div lang="de"><p><span id="at"></span></p></div>'
    expect(localeOf(document.querySelector('#at') as Element)).toBe('de')
    document.body.innerHTML = '<div lang="de"><span id="at" lang="ja"></span></div>'
    expect(localeOf(document.querySelector('#at') as Element)).toBe('ja')
  })

  test('is read out through the shadow root it is drawn in', () => {
    document.body.innerHTML = '<div lang="de"><div id="host"></div></div>'
    const root = (document.querySelector('#host') as HTMLElement).attachShadow({ mode: 'open' })
    root.innerHTML = '<span id="inside"></span>'
    expect(localeOf(root.querySelector('#inside') as Element)).toBe('de')
  })

  test('is empty where nothing says, or the page says it does not know', () => {
    document.body.innerHTML = '<span id="at"></span>'
    expect(localeOf(document.querySelector('#at') as Element)).toBe('')
    document.body.innerHTML = '<div lang=""><span id="at"></span></div>'
    expect(localeOf(document.querySelector('#at') as Element)).toBe('')
  })
})

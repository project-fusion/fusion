import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

/*
 * The handlers React holds and never bound after hydrating, bound by the
 * element as it sends: on the element, and on the ancestors a bubbling event
 * of ours reaches, as a list hears its items' `helix-action`.
 */

let bind: typeof import('./react-bridge.js').bindReactHandler

beforeAll(async () => {
  registerDom()
  bind = (await import('./react-bridge.js')).bindReactHandler
})

/** Gives `node` the props bag React stashes on a node it owns. */
const held = (node: Element, props: Record<string, unknown>): void => {
  Object.assign(node, { __reactProps$probe: props })
}

const sent = (bubbles: boolean, composed = false): Event =>
  new Event('helix-action', { bubbles, composed })

describe('a handler React holds above the element that sends', () => {
  test('hears a bubbling event once, on the first dispatch', () => {
    document.body.innerHTML = '<div id="list"><span id="item"></span></div>'
    const list = document.getElementById('list') as HTMLElement
    const item = document.getElementById('item') as HTMLElement
    const heard: string[] = []
    held(list, { 'onhelix-action': () => heard.push('list') })
    held(item, {})
    for (let time = 0; time < 2; time += 1) {
      const event = sent(true)
      bind(item, event)
      item.dispatchEvent(event)
    }
    expect(heard).toEqual(['list', 'list'])
  })

  test('is left alone for an event that does not bubble', () => {
    document.body.innerHTML = '<div id="list"><span id="item"></span></div>'
    const list = document.getElementById('list') as HTMLElement
    const item = document.getElementById('item') as HTMLElement
    const heard: string[] = []
    held(list, { 'onhelix-action': () => heard.push('list') })
    held(item, {})
    const event = sent(false)
    bind(item, event)
    item.dispatchEvent(event)
    expect(heard).toEqual([])
  })

  test('is reached past a shadow root only for a composed event', () => {
    document.body.innerHTML = '<div id="host"></div>'
    const host = document.getElementById('host') as HTMLElement
    const inner = document.createElement('span')
    host.attachShadow({ mode: 'open' }).append(inner)
    const heard: string[] = []
    held(host, { 'onhelix-action': () => heard.push('host') })
    held(inner, {})
    const closed = sent(true)
    bind(inner, closed)
    inner.dispatchEvent(closed)
    expect(heard).toEqual([])
    const open = sent(true, true)
    bind(inner, open)
    inner.dispatchEvent(open)
    expect(heard).toEqual(['host'])
  })
})

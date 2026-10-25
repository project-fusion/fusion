import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import type { KeyPress, Stop } from '../types.generated.js'
import { webKeys } from './web.js'

beforeAll(() => {
  registerDom()
})

/* A listener anywhere stays on the window, so a spec that leaves one taking
   Escape would keep that key from every later spec. */
const anywhere: Stop[] = []

afterEach(() => {
  for (const stop of anywhere.splice(0)) {
    stop()
  }
  document.body.replaceChildren()
})

/** Hears the keys anywhere through `webKeys`, until the spec ends. */
const listenAnywhere = (node: HTMLElement, heard: (press: KeyPress) => boolean): Stop => {
  const stop = webKeys.listenAnywhere(node, heard)
  anywhere.push(stop)
  return stop
}

/** A focusable part in the document, removed after each spec. */
const part = (): HTMLElement => {
  const made = document.createElement('div')
  made.tabIndex = 0
  document.body.append(made)
  return made
}

/** Dispatches a `keydown` on `node`, and returns it to read whether its default was prevented. */
const keydown = (node: HTMLElement, init: KeyboardEventInit): KeyboardEvent => {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init })
  node.dispatchEvent(event)
  return event
}

describe('webKeys', () => {
  test('hands the listener each `keydown` as a press, with the modifiers held', () => {
    const node = part()
    const heard: KeyPress[] = []
    webKeys.listen(node, (press) => {
      heard.push(press)
      return false
    })
    keydown(node, { altKey: true, key: 'ArrowDown', metaKey: true, repeat: true })
    keydown(node, { ctrlKey: true, key: 'a', shiftKey: true })
    expect(heard).toEqual([
      {
        alt: true,
        claimed: false,
        control: false,
        key: 'ArrowDown',
        meta: true,
        repeat: true,
        shift: false,
      },
      {
        alt: false,
        claimed: false,
        control: true,
        key: 'a',
        meta: false,
        repeat: false,
        shift: true,
      },
    ])
  })

  test('prevents the default of a press the listener takes, and only that press', () => {
    const node = part()
    webKeys.listen(node, (press) => press.key === 'ArrowDown')
    expect(keydown(node, { key: 'ArrowDown' }).defaultPrevented).toBe(true)
    expect(keydown(node, { key: 'Tab' }).defaultPrevented).toBe(false)
  })

  test('hears nothing once stopped', () => {
    const node = part()
    let heard = 0
    const stop = webKeys.listen(node, () => {
      heard += 1
      return true
    })
    stop()
    expect(keydown(node, { key: 'Enter' }).defaultPrevented).toBe(false)
    expect(heard).toBe(0)
  })

  test('says a press is claimed where a listener nearer the key prevented its default', () => {
    const node = part()
    const field = document.createElement('input')
    node.append(field)
    field.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault()
      }
    })
    const claimed: boolean[] = []
    webKeys.listen(node, (press) => {
      claimed.push(press.claimed)
      return false
    })
    keydown(field, { key: 'ArrowDown' })
    keydown(field, { key: 'ArrowUp' })
    expect(claimed).toEqual([true, false])
  })

  test('leaves a press an input method is composing to it', () => {
    const node = part()
    let heard = 0
    webKeys.listen(node, () => {
      heard += 1
      return true
    })
    listenAnywhere(node, () => {
      heard += 1
      return true
    })
    expect(keydown(node, { isComposing: true, key: 'Enter' }).defaultPrevented).toBe(false)
    expect(heard).toBe(0)
  })
})

describe('webKeys anywhere', () => {
  test('hears a key pressed on another part before that part, and keeps a press it takes from it', () => {
    const node = part()
    const other = part()
    const heard: string[] = []
    other.addEventListener('keydown', (event) => heard.push(`other ${event.key}`))
    listenAnywhere(node, (press) => {
      heard.push(`anywhere ${press.key}`)
      return press.key === 'Escape'
    })
    expect(keydown(other, { key: 'Escape' }).defaultPrevented).toBe(true)
    expect(keydown(other, { key: 'a' }).defaultPrevented).toBe(false)
    expect(heard).toEqual(['anywhere Escape', 'anywhere a', 'other a'])
  })

  test('hears nothing once stopped', () => {
    const node = part()
    let heard = 0
    listenAnywhere(node, () => {
      heard += 1
      return true
    })()
    expect(keydown(part(), { key: 'Escape' }).defaultPrevented).toBe(false)
    expect(heard).toBe(0)
  })
})

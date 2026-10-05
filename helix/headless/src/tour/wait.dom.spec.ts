import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import { onPage, waitFor } from './wait.js'

beforeAll(() => {
  registerDom()
})

const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

describe('waiting for something to be on the page', () => {
  test('goes on at once when it already is', () => {
    let went = 0
    waitFor(
      document.body,
      () => true,
      () => {
        went += 1
      },
    )
    expect(went).toBe(1)
  })

  test('goes on once, when a change brings it', async () => {
    const root = document.createElement('div')
    document.body.append(root)
    let went = 0
    waitFor(
      root,
      () => root.querySelector('#menu') !== null,
      () => {
        went += 1
      },
    )
    root.append(document.createElement('span'))
    await tick()
    expect(went).toBe(0)
    const menu = document.createElement('div')
    menu.id = 'menu'
    root.append(menu)
    await tick()
    root.append(document.createElement('span'))
    await tick()
    expect(went).toBe(1)
  })

  test('stops when asked to', async () => {
    const root = document.createElement('div')
    document.body.append(root)
    let went = 0
    const stop = waitFor(
      root,
      () => root.childElementCount > 0,
      () => {
        went += 1
      },
    )
    stop()
    root.append(document.createElement('span'))
    await tick()
    expect(went).toBe(0)
  })

  test('an element is on the page once it is connected', () => {
    const element = document.createElement('div')
    expect(onPage(element)).toBe(false)
    expect(onPage(null)).toBe(false)
    document.body.append(element)
    expect(onPage(element)).toBe(true)
  })
})

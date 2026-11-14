import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import { webTimers } from './web.js'

beforeAll(() => {
  registerDom()
})

/* happy-dom's page is always showing, so a spec that hides it lays its own
   `visibilityState` over the document's, and takes it off again after. */
const showing = (state: DocumentVisibilityState): void => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: state })
  document.dispatchEvent(new Event('visibilitychange'))
}

afterEach(() => {
  Reflect.deleteProperty(document, 'visibilityState')
})

/* Each wait below is for a callback, never for a length of time: a spec that
   waits 30ms for a 5ms timeout measures how loaded the runner is. A stopped
   timeout or frame is judged once a later one has run. */

describe('webTimers', () => {
  test('reads the clock from `performance.now()`', () => {
    const before = performance.now()
    const read = webTimers.now()
    expect(read).toBeGreaterThanOrEqual(before)
    expect(read).toBeLessThanOrEqual(performance.now())
  })

  test('runs a timeout after the call that started it', async () => {
    let ran = false
    const done = new Promise<void>((resolve) => {
      webTimers.timeout(5, () => {
        ran = true
        resolve()
      })
    })
    expect(ran).toBe(false)
    await done
    expect(ran).toBe(true)
  })

  test('never runs a stopped timeout', async () => {
    let ran = false
    const stop = webTimers.timeout(5, () => {
      ran = true
    })
    stop()
    await new Promise<void>((resolve) => {
      webTimers.timeout(10, resolve)
    })
    expect(ran).toBe(false)
  })

  test('runs a frame with the frame’s time', async () => {
    const time = await new Promise<number>((resolve) => {
      webTimers.frame(resolve)
    })
    expect(typeof time).toBe('number')
  })

  test('never runs a stopped frame', async () => {
    let ran = false
    const stop = webTimers.frame(() => {
      ran = true
    })
    stop()
    await new Promise<number>((resolve) => {
      webTimers.frame(resolve)
    })
    expect(ran).toBe(false)
  })

  test('reads whether the page is in front from `visibilityState`', () => {
    expect(webTimers.visible()).toBe(true)
    showing('hidden')
    expect(webTimers.visible()).toBe(false)
  })

  test('tells an observer each time the page leaves the front and comes back, until stopped', () => {
    const heard: boolean[] = []
    const stop = webTimers.observeVisible((visible) => heard.push(visible))
    showing('hidden')
    showing('visible')
    stop()
    showing('hidden')
    expect(heard).toEqual([false, true])
  })
})

import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import { motionPaused, onMotionChange, pauseMotion } from './page-motion.js'

beforeAll(() => {
  registerDom()
})

afterEach(() => {
  pauseMotion(false)
})

const settle = () => new Promise((done) => setTimeout(done, 0))

describe('the page’s motion', () => {
  test('runs until the page pauses it, on the document element', () => {
    expect(motionPaused()).toBe(false)
    pauseMotion()
    expect(document.documentElement.getAttribute('data-helix-motion')).toBe('paused')
    expect(motionPaused()).toBe(true)
    pauseMotion(false)
    expect(motionPaused()).toBe(false)
  })

  test('a listener hears each change, however it was made, until it stops listening', async () => {
    const heard: boolean[] = []
    const stop = onMotionChange((paused) => heard.push(paused))
    pauseMotion()
    await settle()
    document.documentElement.removeAttribute('data-helix-motion')
    await settle()
    stop()
    pauseMotion()
    await settle()
    expect(heard).toEqual([true, false])
  })
})

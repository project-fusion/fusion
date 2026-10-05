import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

let lock: typeof import('./scroll-lock.js')

beforeAll(async () => {
  registerDom()
  lock = await import('./scroll-lock.js')
})

describe('the scroll lock', () => {
  /* Dialog, Drawer and Lightbox each kept a copy of this, sharing the record
     on `globalThis`. One copy now, and the same count. */
  test('holds the page while any surface holds it, and gives back what it found', () => {
    const root = document.documentElement
    root.style.overflow = 'auto'
    const dialog = document.createElement('div')
    const drawer = document.createElement('div')

    lock.lockScroll(dialog)
    lock.lockScroll(drawer)
    lock.lockScroll(dialog)
    expect(root.style.overflow).toBe('hidden')
    expect(lock.scrollHolders()).toEqual([dialog, drawer])

    lock.unlockScroll(dialog)
    expect(root.style.overflow).toBe('hidden')
    lock.unlockScroll(drawer)
    expect(root.style.overflow).toBe('auto')
    expect(lock.scrollHolders()).toEqual([])
    root.style.overflow = ''
  })

  test('lets go of nothing for a surface that never held it', () => {
    const root = document.documentElement
    const held = document.createElement('div')
    lock.lockScroll(held)
    lock.unlockScroll(document.createElement('div'))
    expect(root.style.overflow).toBe('hidden')
    lock.unlockScroll(held)
    expect(root.style.overflow).toBe('')
  })
})

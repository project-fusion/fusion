import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import { colorMode, onColorModeChange, setColorMode } from './color-mode.js'

beforeAll(() => {
  registerDom()
})

afterEach(() => {
  document.documentElement.removeAttribute('data-color-mode')
  document.documentElement.style.removeProperty('color-scheme')
})

const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('the page color mode', () => {
  test('is the attribute on the document element, where it is written', async () => {
    document.documentElement.setAttribute('data-color-mode', 'dark')
    expect(colorMode()).toBe('dark')
    await setColorMode('light')
    expect(document.documentElement.getAttribute('data-color-mode')).toBe('light')
  })

  test('keeps an inline color-scheme the page wrote in step, and writes none where it wrote none', async () => {
    await setColorMode('dark', { transition: 'none' })
    expect(document.documentElement.style.colorScheme).toBe('')
    document.documentElement.style.colorScheme = 'dark'
    await setColorMode('light', { transition: 'none' })
    expect(document.documentElement.style.colorScheme).toBe('light')
  })

  test('is heard changing, however it was changed', async () => {
    document.documentElement.setAttribute('data-color-mode', 'light')
    const heard: string[] = []
    const stop = onColorModeChange((mode) => heard.push(mode))
    document.documentElement.setAttribute('data-color-mode', 'dark')
    await settle()
    stop()
    document.documentElement.setAttribute('data-color-mode', 'light')
    await settle()
    expect(heard).toEqual(['dark'])
  })
})

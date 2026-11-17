import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { hasState, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

afterEach(() => {
  document.documentElement.removeAttribute('data-color-mode')
})

const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

type Toggle = HTMLElement & { updateComplete: Promise<unknown> }

describe('theme toggle', () => {
  test('a press switches the page to dark, says so, and switches it back', async () => {
    document.documentElement.setAttribute('data-color-mode', 'light')
    const toggle = (await mount(
      '<helix-headless-theme-toggle></helix-headless-theme-toggle>',
    )) as Toggle
    let changes = 0
    toggle.addEventListener('change', () => {
      changes += 1
    })
    const button = part(toggle, 'button') as HTMLButtonElement
    expect(button.getAttribute('aria-pressed')).toBe('false')
    button.click()
    await settle()
    await toggle.updateComplete
    expect(document.documentElement.getAttribute('data-color-mode')).toBe('dark')
    expect(button.getAttribute('aria-pressed')).toBe('true')
    expect(hasState(toggle, 'dark')).toBe(true)
    expect(changes).toBe(1)
    button.click()
    await settle()
    await toggle.updateComplete
    expect(document.documentElement.getAttribute('data-color-mode')).toBe('light')
    expect(hasState(toggle, 'dark')).toBe(false)
  })

  test('follows a mode the page sets itself', async () => {
    const toggle = (await mount(
      '<helix-headless-theme-toggle></helix-headless-theme-toggle>',
    )) as Toggle
    document.documentElement.setAttribute('data-color-mode', 'dark')
    await settle()
    await toggle.updateComplete
    expect((part(toggle, 'button') as HTMLElement).getAttribute('aria-pressed')).toBe('true')
  })

  test('keeps one name whichever way it stands', async () => {
    const toggle = (await mount(
      '<helix-headless-theme-toggle></helix-headless-theme-toggle>',
    )) as Toggle
    const button = part(toggle, 'button') as HTMLButtonElement
    expect(button.getAttribute('aria-label')).toBe('Dark mode')
    button.click()
    await settle()
    await toggle.updateComplete
    expect(button.getAttribute('aria-label')).toBe('Dark mode')
  })
})

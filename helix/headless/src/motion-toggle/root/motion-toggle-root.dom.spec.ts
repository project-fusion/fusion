import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { hasState, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

afterEach(async () => {
  const { pauseMotion } = await import('@fusion.dev/helix-core')
  pauseMotion(false)
})

type Toggle = HTMLElement & { updateComplete: Promise<unknown> }

const toggle = async (markup = '<helix-headless-motion-toggle></helix-headless-motion-toggle>') => {
  const host = (await mount(`<div>${markup}</div>`)) as HTMLElement
  const element = host.querySelector('helix-headless-motion-toggle') as Toggle
  await element.updateComplete
  return element
}

const settle = () => new Promise((done) => setTimeout(done, 0))

describe('Motion Toggle', () => {
  test('is a named toggle button, not pressed while motion runs', async () => {
    const element = await toggle()
    const button = part(element, 'button') as HTMLButtonElement
    expect(button.localName).toBe('button')
    expect(button.getAttribute('aria-label')).toBe('Pause motion')
    expect(button.getAttribute('aria-pressed')).toBe('false')
  })

  test('a press pauses the page’s motion, and another lets it run, saying so each time', async () => {
    const element = await toggle()
    const changes: Event[] = []
    element.addEventListener('change', (event) => changes.push(event))
    const button = part(element, 'button') as HTMLButtonElement
    button.click()
    await element.updateComplete
    expect(document.documentElement.getAttribute('data-helix-motion')).toBe('paused')
    expect(button.getAttribute('aria-pressed')).toBe('true')
    expect(hasState(element, 'paused')).toBe(true)
    button.click()
    await element.updateComplete
    expect(document.documentElement.hasAttribute('data-helix-motion')).toBe(false)
    expect(button.getAttribute('aria-pressed')).toBe('false')
    expect(changes).toHaveLength(2)
  })

  test('two on a page agree, and follow the page set by other means', async () => {
    const host = (await mount(
      '<div><helix-headless-motion-toggle></helix-headless-motion-toggle><helix-headless-motion-toggle></helix-headless-motion-toggle></div>',
    )) as HTMLElement
    const [one, two] = [...host.querySelectorAll('helix-headless-motion-toggle')] as Toggle[]
    await one?.updateComplete
    ;(part(one as Toggle, 'button') as HTMLButtonElement).click()
    await settle()
    await two?.updateComplete
    expect(part(two as Toggle, 'button')?.getAttribute('aria-pressed')).toBe('true')
    document.documentElement.removeAttribute('data-helix-motion')
    await settle()
    await one?.updateComplete
    expect(part(one as Toggle, 'button')?.getAttribute('aria-pressed')).toBe('false')
  })
})

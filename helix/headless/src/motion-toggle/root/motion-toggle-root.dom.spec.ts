import '@fusion.dev/helix-testing/dom/register'
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

  /* Checkbox, Switch, and Toggle ask with the same event, so one handler
     reads every control that turns on and off. */
  test('asks with `helix-before-toggle` before each press, with `checked` true where it pauses', async () => {
    const element = await toggle()
    const heard: string[] = []
    element.addEventListener('helix-before-toggle', (event) => {
      const request = event as CustomEvent<{ checked: boolean }>
      heard.push(`before ${request.detail.checked} ${request.cancelable}`)
    })
    element.addEventListener('change', () => heard.push('change'))
    const button = part(element, 'button') as HTMLButtonElement
    button.click()
    button.click()
    expect(heard).toEqual(['before true true', 'change', 'before false true', 'change'])
  })

  test('a refused press leaves the motion as it was and sends no change', async () => {
    const element = await toggle()
    let changes = 0
    element.addEventListener('helix-before-toggle', (event) => event.preventDefault())
    element.addEventListener('change', () => {
      changes += 1
    })
    const button = part(element, 'button') as HTMLButtonElement
    button.click()
    await element.updateComplete
    expect(document.documentElement.hasAttribute('data-helix-motion')).toBe(false)
    expect(button.getAttribute('aria-pressed')).toBe('false')
    expect(changes).toBe(0)
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

import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { hasState, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Group = HTMLElement & { open: boolean; updateComplete: Promise<unknown> }

const group = async (attributes = ''): Promise<Group> => {
  const host = (await mount(
    `<div><helix-headless-log-group heading="Install" ${attributes}>
      <helix-headless-log-line>added 214 packages</helix-headless-log-line>
    </helix-headless-log-group></div>`,
  )) as HTMLElement
  const element = host.querySelector('helix-headless-log-group') as Group
  await element.updateComplete
  return element
}

describe('Log Group', () => {
  test('is a disclosure whose button names the region it opens', async () => {
    const element = await group()
    const summary = part(element, 'summary') as HTMLButtonElement
    const content = part(element, 'content') as HTMLElement
    expect(summary.localName).toBe('button')
    expect(summary.getAttribute('aria-expanded')).toBe('false')
    const scope = element.shadowRoot as ShadowRoot
    expect(scope.getElementById(summary.getAttribute('aria-controls') ?? '')).toBe(content)
    expect(scope.getElementById(content.getAttribute('aria-labelledby') ?? '')).toBe(summary)
    expect(content.hasAttribute('hidden')).toBe(true)
  })

  test('opens when pressed, asking first and saying so after', async () => {
    const element = await group()
    const heard: string[] = []
    element.addEventListener('helix-before-open', () => heard.push('before-open'))
    element.addEventListener('toggle', (event) => heard.push((event as ToggleEvent).newState))
    ;(part(element, 'summary') as HTMLButtonElement).click()
    await element.updateComplete
    expect(element.open).toBe(true)
    expect(hasState(element, 'open')).toBe(true)
    expect(part(element, 'content')?.hasAttribute('hidden')).toBe(false)
    expect(heard).toEqual(['before-open', 'open'])
  })

  test('stays shut when the request is refused', async () => {
    const element = await group()
    element.addEventListener('helix-before-open', (event) => event.preventDefault())
    ;(part(element, 'summary') as HTMLButtonElement).click()
    await element.updateComplete
    expect(element.open).toBe(false)
  })

  test('draws a mark for its status, and says the status after the heading', async () => {
    const element = await group('status="failed" duration="12s"')
    expect(part(element, 'status')?.localName).toBe('svg')
    expect(part(element, 'summary')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'Install failed 12s',
    )
  })

  test('draws no status mark without a status', async () => {
    const element = await group()
    expect(part(element, 'status')).toBeNull()
  })

  test('says whether it holds steps of its own, and whether it holds anything', async () => {
    const host = (await mount(
      `<div><helix-headless-log-group heading="Worked">
        <helix-headless-log-group heading="Read the log">
          <helix-headless-log-line>ok</helix-headless-log-line>
        </helix-headless-log-group>
      </helix-headless-log-group><helix-headless-log-group heading="Waited"></helix-headless-log-group></div>`,
    )) as HTMLElement
    const [outer, inner, bare] = [...host.querySelectorAll('helix-headless-log-group')] as Group[]
    await Promise.all([outer, inner, bare].map((element) => element?.updateComplete))
    expect(hasState(outer as Group, 'steps')).toBe(true)
    expect(hasState(inner as Group, 'steps')).toBe(false)
    expect(hasState(inner as Group, 'empty')).toBe(false)
    expect(hasState(bare as Group, 'empty')).toBe(true)
  })

  test('stops being empty when lines arrive', async () => {
    const host = (await mount(
      '<div><helix-headless-log-group heading="Run"></helix-headless-log-group></div>',
    )) as HTMLElement
    const element = host.querySelector('helix-headless-log-group') as Group
    await element.updateComplete
    expect(hasState(element, 'empty')).toBe(true)
    element.append(document.createElement('helix-headless-log-line'))
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(hasState(element, 'empty')).toBe(false)
  })
})

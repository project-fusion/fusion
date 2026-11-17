import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { pauseMotion } from '@fusion.dev/helix-core'
import { hasState, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

afterEach(() => {
  pauseMotion(false)
})

const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('shimmer text', () => {
  test('keeps the words the page wrote, in a part the sweep paints through', async () => {
    const element = (await mount(
      '<helix-shimmer-text>Reading the project files</helix-shimmer-text>',
    )) as HTMLElement
    expect(element.textContent).toBe('Reading the project files')
    expect(part(element, 'text')?.querySelector('slot')).not.toBeNull()
  })

  test('holds the sweep while the page has paused its motion, and lets it run again', async () => {
    const element = (await mount('<helix-shimmer-text>Working</helix-shimmer-text>')) as HTMLElement
    expect(hasState(element, 'paused')).toBe(false)
    pauseMotion()
    await settle()
    expect(hasState(element, 'paused')).toBe(true)
    pauseMotion(false)
    await settle()
    expect(hasState(element, 'paused')).toBe(false)
  })

  test('starts held on a page that is already paused', async () => {
    pauseMotion()
    await settle()
    const element = (await mount('<helix-shimmer-text>Working</helix-shimmer-text>')) as HTMLElement
    expect(hasState(element, 'paused')).toBe(true)
  })
})

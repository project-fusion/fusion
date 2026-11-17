import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { pauseMotion } from '@fusion.dev/helix-core'
import { hasState, mount, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

afterEach(() => {
  pauseMotion(false)
})

const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('shine', () => {
  test('reflects loop, which the stylesheet runs the band by', async () => {
    const shine = (await mount(
      '<helix-shine><button>Start</button></helix-shine>',
    )) as HTMLElement & {
      loop: boolean
      updateComplete: Promise<unknown>
    }
    shine.loop = true
    await shine.updateComplete
    expect(shine.hasAttribute('loop')).toBe(true)
  })

  test('holds while the page has paused its motion', async () => {
    const shine = await mount('<helix-shine loop><button>Start</button></helix-shine>')
    expect(hasState(shine, 'paused')).toBe(false)
    pauseMotion()
    await settle()
    expect(hasState(shine, 'paused')).toBe(true)
  })
})

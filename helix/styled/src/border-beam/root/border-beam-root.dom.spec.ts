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

type Beam = HTMLElement & { idle: boolean; updateComplete: Promise<unknown> }

describe('border beam', () => {
  test('reflects idle, which the stylesheet takes the light away on', async () => {
    const beam = (await mount('<helix-border-beam><p>Working</p></helix-border-beam>')) as Beam
    beam.idle = true
    await beam.updateComplete
    expect(beam.hasAttribute('idle')).toBe(true)
  })

  test('holds while the page has paused its motion', async () => {
    const beam = await mount('<helix-border-beam><p>Working</p></helix-border-beam>')
    expect(hasState(beam, 'paused')).toBe(false)
    pauseMotion()
    await settle()
    expect(hasState(beam, 'paused')).toBe(true)
  })
})

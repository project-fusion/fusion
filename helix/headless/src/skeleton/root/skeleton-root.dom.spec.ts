import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@helix-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

describe('skeleton', () => {
  test('says the region is filling rather than saying nothing', async () => {
    const skeleton = (await mount('<helix-base-skeleton></helix-base-skeleton>')) as HTMLElement & {
      internals?: ElementInternals
    }
    expect(skeleton.internals?.ariaBusy).toBe('true')
    expect(skeleton.internals?.ariaLive).toBe('polite')
    expect(skeleton.hasAttribute('aria-busy')).toBe(false)
  })

  test("the shape is the styled tier's, not the headless tier's", async () => {
    // An appearance property on the headless tier is the one thing that tier
    // exists for not having.
    const { HelixBaseSkeleton } = await import('@helix-io/headless')
    expect('shape' in HelixBaseSkeleton.prototype).toBe(false)
    const skeleton = await mount('<helix-base-skeleton shape="circle"></helix-base-skeleton>')
    expect(part(skeleton, 'skeleton')).not.toBeNull()
  })
})

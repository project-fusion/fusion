import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

describe('skeleton', () => {
  test('says the region is filling rather than saying nothing', async () => {
    const skeleton = (await mount(
      '<helix-headless-skeleton></helix-headless-skeleton>',
    )) as HTMLElement & {
      internals?: ElementInternals
    }
    expect(skeleton.internals?.ariaBusy).toBe('true')
    expect(skeleton.internals?.ariaLive).toBe('polite')
    expect(skeleton.hasAttribute('aria-busy')).toBe(false)
  })

  test("the shape is the styled tier's, not the headless tier's", async () => {
    // An appearance property on the headless tier is the one thing that tier
    // exists for not having.
    /* From `src`, not from the package name. `@fusion.dev/helix-headless` resolves
       through `exports` to `dist`, which puts a second copy of every element
       class in the run: `customElement` declines a taken tag quietly, so the
       winner is decided by file order and never announced, and after any edit
       to `src` this file registers the previous build for everybody. Nine tests
       in three other families failed exactly that way. See 298. */
    const { HelixHeadlessSkeleton } = await import('../index.js')
    expect('shape' in HelixHeadlessSkeleton.prototype).toBe(false)
    const skeleton = await mount(
      '<helix-headless-skeleton shape="circle"></helix-headless-skeleton>',
    )
    expect(part(skeleton, 'skeleton')).not.toBeNull()
  })
})

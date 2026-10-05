import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

describe('skeleton', () => {
  /* It was an empty live region marked busy, which holds nothing and never
     changes, so a screen reader announced nothing at all while the docs said
     it announced the loading. */
  test('is hidden from a screen reader unless it is named', async () => {
    const skeleton = (await mount(
      '<helix-headless-skeleton></helix-headless-skeleton>',
    )) as HTMLElement & {
      internals?: ElementInternals
    }
    expect(skeleton.internals?.ariaHidden).toBe('true')
    expect(skeleton.internals?.ariaLive ?? null).toBeNull()
    expect(skeleton.hasAttribute('aria-hidden')).toBe(false)
  })

  test('and named, it is a busy indicator read out by that name', async () => {
    const skeleton = (await mount(
      '<helix-headless-skeleton label="Loading profile"></helix-headless-skeleton>',
    )) as HTMLElement & {
      internals?: ElementInternals
    }
    expect(skeleton.internals?.role).toBe('progressbar')
    expect(skeleton.internals?.ariaLabel).toBe('Loading profile')
    expect(skeleton.internals?.ariaHidden ?? null).toBeNull()
  })

  test("the shape is the styled tier's, not the headless tier's", async () => {
    // An appearance property on the headless tier is the one thing that tier
    // exists for not having.
    /* From `src`, not from the package name. `@fusion.dev/helix-headless` resolves
       through `exports` to `dist`, which puts a second copy of every element
       class in the run: `customElement` declines a taken tag quietly, so the
       winner is decided by file order and never announced, and after any edit
       to `src` this file registers the previous build for everybody. Nine tests
       in three other families failed exactly that way. */
    const { HelixHeadlessSkeleton } = await import('../index.js')
    expect('shape' in HelixHeadlessSkeleton.prototype).toBe(false)
    const skeleton = await mount(
      '<helix-headless-skeleton shape="circle"></helix-headless-skeleton>',
    )
    expect(part(skeleton, 'skeleton')).not.toBeNull()
  })
})

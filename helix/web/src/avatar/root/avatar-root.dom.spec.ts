import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Updatable = HTMLElement & { updateComplete: Promise<unknown> }

describe('avatar', () => {
  test('shows initials when there is no image', async () => {
    const avatar = await mount('<helix-avatar name="Ross Sheppard"></helix-avatar>')
    expect(part(avatar, 'initials')?.textContent?.trim()).toBe('RS')
    expect(part(avatar, 'image')).toBeNull()
  })

  test('a single name yields one initial', async () => {
    const avatar = await mount('<helix-avatar name="Fusion"></helix-avatar>')
    expect(part(avatar, 'initials')?.textContent?.trim()).toBe('F')
  })

  test('initials are hidden from assistive technology', async () => {
    // The name is already announced by the avatar's own label, so reading the
    // initials too would spell it out a second time, letter by letter.
    const avatar = await mount('<helix-avatar name="Ross Sheppard"></helix-avatar>')
    expect(part(avatar, 'initials')?.getAttribute('aria-hidden')).toBe('true')
    expect(part(avatar, 'avatar')?.getAttribute('aria-label')).toBe('Ross Sheppard')
    expect(part(avatar, 'avatar')?.getAttribute('role')).toBe('img')
  })

  test('shows the image when there is one', async () => {
    const avatar = await mount('<helix-avatar name="Ross" src="/me.avif"></helix-avatar>')
    expect(part(avatar, 'image')?.getAttribute('src')).toBe('/me.avif')
    // The image is decorative: the label is on the avatar, so alt would repeat it.
    expect(part(avatar, 'image')?.getAttribute('alt')).toBe('')
  })

  test('falls back to initials when the image fails', async () => {
    // The reason this is an element rather than a styled span: a broken image
    // otherwise leaves an icon and no name.
    const avatar = (await mount(
      '<helix-avatar name="Ross Sheppard" src="/missing.avif"></helix-avatar>',
    )) as Updatable
    part(avatar, 'image')?.dispatchEvent(new Event('error'))
    await avatar.updateComplete

    expect(part(avatar, 'image')).toBeNull()
    expect(part(avatar, 'initials')?.textContent?.trim()).toBe('RS')
  })
})

import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom, role, slotted } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Updatable = HTMLElement & { updateComplete: Promise<unknown> }

describe('avatar', () => {
  test('shows initials when there is no image', async () => {
    const avatar = await mount('<helix-base-avatar name="Ross Sheppard"></helix-base-avatar>')
    expect(part(avatar, 'initials')?.textContent?.trim()).toBe('RS')
    expect(part(avatar, 'image')).toBeNull()
  })

  test('a single name yields one initial', async () => {
    const avatar = await mount('<helix-base-avatar name="Fusion"></helix-base-avatar>')
    expect(part(avatar, 'initials')?.textContent?.trim()).toBe('F')
  })

  test('initials are hidden from assistive technology', async () => {
    // The name is already announced by the avatar's own label, so reading the
    // initials too would spell it out a second time, letter by letter.
    const avatar = await mount('<helix-base-avatar name="Ross Sheppard"></helix-base-avatar>')
    expect(part(avatar, 'initials')?.getAttribute('aria-hidden')).toBe('true')
  })

  test('the name is announced from the host, not from a wrapper', async () => {
    // Through internals, so the host carries no attribute a consumer's server
    // markup lacks, and the avatar itself is what announces rather than a span
    // inside it.
    const avatar = (await mount(
      '<helix-base-avatar name="Ross Sheppard"></helix-base-avatar>',
    )) as HTMLElement & {
      internals?: ElementInternals
    }
    expect(role(avatar)).toBe('img')
    expect(avatar.internals?.ariaLabel).toBe('Ross Sheppard')
    expect(avatar.hasAttribute('aria-label')).toBe(false)
  })

  test('an author `aria-label` overrides the name for what is announced', async () => {
    const avatar = (await mount(
      '<helix-base-avatar aria-label="The design team" name="Ross Sheppard"></helix-base-avatar>',
    )) as HTMLElement & { internals?: ElementInternals }
    // The attribute takes precedence over the implicit name from internals, so
    // no property mirrors it. Initials still come from the name, because that is
    // what they are drawn from; only what is announced changes.
    expect(avatar.getAttribute('aria-label')).toBe('The design team')
    expect(avatar.internals?.ariaLabel).toBe('Ross Sheppard')
    expect(part(avatar, 'initials')?.textContent?.trim()).toBe('RS')
  })

  test('the slot is the fallback, not a replacement for the image', async () => {
    // "This image, and my icon if it fails" is the case a total replacement
    // could not express.
    const avatar = (await mount(
      '<helix-base-avatar name="Ross" src="/missing.avif"><span id="mine">icon</span></helix-base-avatar>',
    )) as Updatable
    expect(part(avatar, 'image')).not.toBeNull()

    part(avatar, 'image')?.dispatchEvent(new Event('error'))
    await avatar.updateComplete
    expect(part(avatar, 'image')).toBeNull()
    // The initials are the slot's own fallback, so they stay in the shadow tree
    // and go inert rather than being removed. What matters is what the slot
    // assigned, which is the consumer's element.
    expect(slotted(avatar)[0]?.id).toBe('mine')
  })

  test('the image relays its load and error, which do not cross on their own', async () => {
    const avatar = (await mount(
      '<helix-base-avatar name="Ross" src="/me.avif"></helix-base-avatar>',
    )) as Updatable
    const heard: string[] = []
    avatar.addEventListener('load', () => heard.push('load'))
    avatar.addEventListener('error', () => heard.push('error'))

    part(avatar, 'image')?.dispatchEvent(new Event('load'))
    expect(heard).toEqual(['load'])
  })

  test('shows the image when there is one', async () => {
    const avatar = await mount('<helix-base-avatar name="Ross" src="/me.avif"></helix-base-avatar>')
    expect(part(avatar, 'image')?.getAttribute('src')).toBe('/me.avif')
    // The image is decorative: the label is on the avatar, so alt would repeat it.
    expect(part(avatar, 'image')?.getAttribute('alt')).toBe('')
  })

  test('falls back to initials when the image fails', async () => {
    // The reason this is an element rather than a styled span: a broken image
    // otherwise leaves an icon and no name.
    const avatar = (await mount(
      '<helix-base-avatar name="Ross Sheppard" src="/missing.avif"></helix-base-avatar>',
    )) as Updatable
    part(avatar, 'image')?.dispatchEvent(new Event('error'))
    await avatar.updateComplete

    expect(part(avatar, 'image')).toBeNull()
    expect(part(avatar, 'initials')?.textContent?.trim()).toBe('RS')
  })
})

import { beforeAll, describe, expect, test } from 'bun:test'
import { hasState, mount, part, registerDom, role, slotted } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Updatable = HTMLElement & { updateComplete: Promise<unknown> }

describe('avatar', () => {
  test('shows initials when there is no image', async () => {
    const avatar = await mount(
      '<helix-headless-avatar name="Ross Sheppard"></helix-headless-avatar>',
    )
    expect(part(avatar, 'initials')?.textContent?.trim()).toBe('RS')
    expect(part(avatar, 'image')).toBeNull()
  })

  /* `status` waited for an image that was never asked for, so code waiting
     for the avatar to settle waited forever over initials already shown. */
  test('with no image to wait for, it settles as the initials it shows', async () => {
    const avatar = (await mount(
      '<helix-headless-avatar name="Ada Lovelace"></helix-headless-avatar>',
    )) as HTMLElement & { status: string }
    await new Promise((done) => setTimeout(done, 0))
    expect(avatar.status).toBe('error')
  })

  test('a single name yields one initial', async () => {
    const avatar = await mount('<helix-headless-avatar name="Fusion"></helix-headless-avatar>')
    expect(part(avatar, 'initials')?.textContent?.trim()).toBe('F')
  })

  test('initials are hidden from assistive technology', async () => {
    // The name is already announced by the avatar's own label, so reading the
    // initials too would spell it out a second time, letter by letter.
    const avatar = await mount(
      '<helix-headless-avatar name="Ross Sheppard"></helix-headless-avatar>',
    )
    expect(part(avatar, 'initials')?.getAttribute('aria-hidden')).toBe('true')
  })

  test('the name is announced from the host, not from a wrapper', async () => {
    // Through internals, so the host carries no attribute a consumer's server
    // markup lacks, and the avatar itself is what announces rather than a span
    // inside it.
    const avatar = (await mount(
      '<helix-headless-avatar name="Ross Sheppard"></helix-headless-avatar>',
    )) as HTMLElement & {
      internals?: ElementInternals
    }
    expect(role(avatar)).toBe('img')
    expect(avatar.internals?.ariaLabel).toBe('Ross Sheppard')
    expect(avatar.hasAttribute('aria-label')).toBe(false)
  })

  test('an author `aria-label` overrides the name for what is announced', async () => {
    const avatar = (await mount(
      '<helix-headless-avatar aria-label="The design team" name="Ross Sheppard"></helix-headless-avatar>',
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
      '<helix-headless-avatar name="Ross" src="/missing.avif"><span id="mine">icon</span></helix-headless-avatar>',
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
      '<helix-headless-avatar name="Ross" src="/me.avif"></helix-headless-avatar>',
    )) as Updatable
    const heard: string[] = []
    avatar.addEventListener('load', () => heard.push('load'))
    avatar.addEventListener('error', () => heard.push('error'))

    part(avatar, 'image')?.dispatchEvent(new Event('load'))
    expect(heard).toEqual(['load'])
  })

  test('shows the image when there is one', async () => {
    const avatar = await mount(
      '<helix-headless-avatar name="Ross" src="/me.avif"></helix-headless-avatar>',
    )
    expect(part(avatar, 'image')?.getAttribute('src')).toBe('/me.avif')
    // The image is decorative: the label is on the avatar, so alt would repeat it.
    expect(part(avatar, 'image')?.getAttribute('alt')).toBe('')
  })

  test('falls back to initials when the image fails', async () => {
    // The reason this is an element rather than a styled span: a broken image
    // otherwise leaves an icon and no name.
    const avatar = (await mount(
      '<helix-headless-avatar name="Ross Sheppard" src="/missing.avif"></helix-headless-avatar>',
    )) as Updatable
    part(avatar, 'image')?.dispatchEvent(new Event('error'))
    await avatar.updateComplete

    expect(part(avatar, 'image')).toBeNull()
    expect(part(avatar, 'initials')?.textContent?.trim()).toBe('RS')
  })
})

describe('the status an avatar reports', () => {
  type Reporting = Updatable & { src: string; status: string }

  test('says where the picture stands, for a listener that arrived after it settled', async () => {
    // `load` and `error` fire once, so a script binding after them hears
    // neither and has only this to ask.
    const avatar = (await mount(
      '<helix-headless-avatar name="Ross Sheppard" src="/missing.avif"></helix-headless-avatar>',
    )) as Reporting
    expect(avatar.status).toBe('loading')
    expect(avatar.hasAttribute('data-status')).toBe(false)

    part(avatar, 'image')?.dispatchEvent(new Event('error'))
    await avatar.updateComplete
    expect(avatar.status).toBe('error')
    expect(avatar.getAttribute('data-status')).toBe('error')
  })

  test('arrives as loaded', async () => {
    const avatar = (await mount(
      '<helix-headless-avatar name="Ross Sheppard" src="/ross.avif"></helix-headless-avatar>',
    )) as Reporting
    part(avatar, 'image')?.dispatchEvent(new Event('load'))
    await avatar.updateComplete
    expect(avatar.status).toBe('loaded')
    expect(avatar.getAttribute('data-status')).toBe('loaded')
  })

  test('starts over with a new source, and the image comes back', async () => {
    const avatar = (await mount(
      '<helix-headless-avatar name="Ross Sheppard" src="/missing.avif"></helix-headless-avatar>',
    )) as Reporting
    part(avatar, 'image')?.dispatchEvent(new Event('error'))
    await avatar.updateComplete

    avatar.src = '/ross.avif'
    await avatar.updateComplete
    expect(avatar.status).toBe('loading')
    expect(avatar.hasAttribute('data-status')).toBe(false)
    expect(part(avatar, 'image')).not.toBeNull()
  })
})

/* Radix's `delayMs`: initials stand in for a slow picture, and a fast one
   never flashes them. */
describe('fallback delay', () => {
  const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))
  /* A real browser answers a missing file at once, with an error: a picture
     that failed rather than one still on its way. The browser's own load and
     error are kept from the component, so the picture stays on its way until
     the spec dispatches one. */
  const stillLoading = <T extends HTMLElement>(host: T): T => {
    for (const type of ['error', 'load']) {
      host.shadowRoot?.addEventListener(
        type,
        (event) => {
          if (event.isTrusted) {
            event.stopImmediatePropagation()
          }
        },
        { capture: true },
      )
    }
    return host
  }

  test('without one, a loading picture shows no initials, as before', async () => {
    const avatar = stillLoading(
      (await mount(
        '<helix-headless-avatar name="Ada Lovelace" src="/ada.avif"></helix-headless-avatar>',
      )) as Updatable,
    )
    await wait(20)
    await avatar.updateComplete
    expect(part(avatar, 'initials')).toBeNull()
  })

  test('the initials stand in once the wait is over, and the picture keeps loading', async () => {
    const avatar = stillLoading(
      (await mount(
        '<helix-headless-avatar name="Ada Lovelace" src="/ada.avif" fallback-delay="10"></helix-headless-avatar>',
      )) as Updatable,
    )
    expect(part(avatar, 'initials')).toBeNull()
    await wait(30)
    await avatar.updateComplete
    expect(part(avatar, 'initials')?.textContent?.trim()).toBe('AL')
    const image = part(avatar, 'image') as HTMLImageElement
    expect(image.hidden).toBe(true)
    image.dispatchEvent(new Event('load'))
    await avatar.updateComplete
    expect(part(avatar, 'initials')).toBeNull()
    expect((part(avatar, 'image') as HTMLImageElement).hidden).toBe(false)
  })
})

/* Web Awesome's avatar takes its initials and a lazy picture; this one could
   only take the letters from the name and fetched every picture at once. */
describe('initials and loading', () => {
  test('`initials` stands in for the letters taken from the name', async () => {
    const avatar = await mount(
      '<helix-headless-avatar name="Grace Brewster Hopper" initials="GBH"></helix-headless-avatar>',
    )
    expect(part(avatar, 'initials')?.textContent?.trim()).toBe('GBH')
  })

  test('`loading` reaches the picture, and is absent unless asked', async () => {
    const lazy = await mount(
      '<helix-headless-avatar name="Ada" src="/ada.avif" loading="lazy"></helix-headless-avatar>',
    )
    const plain = await mount(
      '<helix-headless-avatar name="Ada" src="/ada.avif"></helix-headless-avatar>',
    )
    expect([
      part(lazy, 'image')?.getAttribute('loading'),
      part(plain, 'image')?.hasAttribute('loading'),
    ]).toEqual(['lazy', false])
  })

  test('the status is a custom state as well', async () => {
    const avatar = (await mount(
      '<helix-headless-avatar name="Ada" src="/ada.avif"></helix-headless-avatar>',
    )) as Updatable
    expect(hasState(avatar, 'loading')).toBe(true)
    part(avatar, 'image')?.dispatchEvent(new Event('load'))
    await avatar.updateComplete
    expect(['error', 'loaded', 'loading'].filter((name) => hasState(avatar, name))).toEqual([
      'loaded',
    ])
  })
})

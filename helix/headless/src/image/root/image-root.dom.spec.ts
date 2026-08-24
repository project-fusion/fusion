import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@helix-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Picture = HTMLElement & { status: string; updateComplete: Promise<unknown> }

const image = async (attrs = ''): Promise<Picture> => {
  /* The caller's `alt` wins rather than being written twice: a duplicate
     attribute keeps the first, so a spec about an empty alt was reading the
     helper's own. */
  const alt = attrs.includes('alt=') ? '' : 'alt="A pier"'
  const host = (await mount(`<helix-base-image ${alt} ${attrs}></helix-base-image>`)) as Picture
  await host.updateComplete
  return host
}

const img = (host: Picture): HTMLImageElement => part(host, 'image') as HTMLImageElement

describe('an image', () => {
  test('starts by saying it has not arrived', async () => {
    const host = await image('src="/pier.jpg"')
    expect(host.status).toBe('loading')
    expect(part(host, 'placeholder')?.hasAttribute('hidden')).toBe(false)
    expect(part(host, 'fallback')?.hasAttribute('hidden')).toBe(true)
  })

  test('says so when it arrives, and puts the stand-in away', async () => {
    const host = await image('src="/pier.jpg"')
    img(host).dispatchEvent(new Event('load'))
    await host.updateComplete
    expect(host.status).toBe('loaded')
    expect(part(host, 'placeholder')?.hasAttribute('hidden')).toBe(true)
  })

  test('and says so when it never will', async () => {
    /* The reason this is an element rather than a rule. A stylesheet cannot
       hear that a picture failed, so it cannot put anything in its place. */
    const host = await image('src="/gone.jpg"')
    img(host).dispatchEvent(new Event('error'))
    await host.updateComplete
    expect(host.status).toBe('error')
    expect(part(host, 'fallback')?.hasAttribute('hidden')).toBe(false)
    expect(part(host, 'placeholder')?.hasAttribute('hidden')).toBe(true)
  })

  test('a new picture is a new question', async () => {
    /* Without resetting, the second `src` inherits the first one's answer and
       never shows a placeholder of its own. */
    const host = await image('src="/pier.jpg"')
    img(host).dispatchEvent(new Event('load'))
    await host.updateComplete
    expect(host.status).toBe('loaded')

    host.setAttribute('src', '/other.jpg')
    await host.updateComplete
    /* Asserted as "not the old answer" rather than as "loading". A DOM that
       resolves a fetch immediately answers the new `src` in the same turn, so
       the loading state is real and simply not observable from here. What has
       to hold either way is that the first picture's `loaded` did not carry
       over to the second. */
    expect(host.status).not.toBe('loaded')
  })

  test('writes an empty alt rather than leaving it off', async () => {
    /* Empty means decoration and is a real answer. Absent means a reader
       announces the file name instead, which is the failure this prevents. */
    const host = await image('alt="" src="/pier.jpg"')
    expect(img(host).hasAttribute('alt')).toBe(true)
    expect(img(host).getAttribute('alt')).toBe('')
  })

  test('waits until it is nearly needed, unless told otherwise', async () => {
    expect(img(await image('src="/pier.jpg"')).getAttribute('loading')).toBe('lazy')
    expect(img(await image('src="/pier.jpg" loading="eager"')).getAttribute('loading')).toBe(
      'eager',
    )
  })

  test('says it arrived, because the platform says it where nobody can hear', async () => {
    /* `load` and `error` on an `<img>` neither bubble nor compose, so the ones
       fired inside this shadow root reach nobody outside it. Without these a
       consumer had a reflected attribute and a `MutationObserver`. */
    const host = await image('src="/pier.jpg"')
    const heard: string[] = []
    host.addEventListener('helix-load', (event) => {
      heard.push(`load:${(event as CustomEvent<{ src: string }>).detail.src}`)
    })
    img(host).dispatchEvent(new Event('load'))
    await host.updateComplete
    expect(heard).toEqual(['load:/pier.jpg'])
  })

  test('and says when it is not coming, which is the more useful of the two', async () => {
    const host = await image('src="/gone.jpg"')
    const heard: string[] = []
    host.addEventListener('helix-error', (event) => {
      heard.push(`error:${(event as CustomEvent<{ src: string }>).detail.src}`)
    })
    img(host).dispatchEvent(new Event('error'))
    await host.updateComplete
    expect(heard).toEqual(['error:/gone.jpg'])
  })

  test('the report leaves the element, so a gallery can count without binding each', async () => {
    // Bubbling and composed, unlike `helix-close`: delegation is the point.
    const host = await image('src="/pier.jpg"')
    const heard: string[] = []
    host.parentElement?.addEventListener('helix-load', () => heard.push('heard'))
    img(host).dispatchEvent(new Event('load'))
    await host.updateComplete
    expect(heard).toEqual(['heard'])
  })

  test('asks for the picture urgently only when told to', async () => {
    expect(img(await image('src="/a.jpg"')).getAttribute('fetchpriority')).toBe('auto')
    expect(
      img(await image('src="/a.jpg" fetch-priority="high"')).getAttribute('fetchpriority'),
    ).toBe('high')
  })

  test('with no source, waits rather than resolving to an empty box', async () => {
    /* A source that arrives with the data is the common case for anything drawn
       from a fetch, and the useful answer is the same as for one still on the
       wire: hold the ground. Resolving to empty would lay the page out twice. */
    const host = await image()
    expect(host.status).toBe('loading')
    expect(part(host, 'placeholder')?.hasAttribute('hidden')).toBe(false)
    expect(img(host).hasAttribute('src')).toBe(false)
  })

  test('neither stand-in is read out, the picture having a name of its own', async () => {
    const host = await image('src="/pier.jpg"')
    expect(part(host, 'placeholder')?.getAttribute('aria-hidden')).toBe('true')
    expect(part(host, 'fallback')?.getAttribute('aria-hidden')).toBe('true')
  })
})

if (hasLayout()) {
  describe('an image whose stand-in has been put away', () => {
    /* Asserting on the `hidden` attribute is what let this ship. The attribute
       was set correctly on every path and the stand-in stayed painted over the
       picture anyway, because `display: flex` is an author rule and
       `[hidden] { display: none }` is the user agent's, and an author rule wins
       at any specificity. Every image in the gallery was a gray rectangle under
       a photograph that had loaded. A box is the only thing that answers
       "is it out of the way" from the reader's side. `Megamenu` learned this
       first and its own layout spec says the same. */
    const shown = async (attrs: string): Promise<Picture> => {
      const host = (await mount(
        `<helix-base-image alt="A pier" style="inline-size:120px;--image-aspect:1/1" ${attrs}></helix-base-image>`,
      )) as Picture
      await host.updateComplete
      return host
    }

    const boxOf = (host: Picture, name: string): DOMRect =>
      (part(host, name) as HTMLElement).getBoundingClientRect()

    test('takes no box once the picture has arrived', async () => {
      const host = await shown('src="/pier.jpg"')
      expect(boxOf(host, 'placeholder').height).toBeGreaterThan(0)

      img(host).dispatchEvent(new Event('load'))
      await host.updateComplete
      expect(boxOf(host, 'placeholder').height).toBe(0)
      expect(boxOf(host, 'fallback').height).toBe(0)
    })

    test('a slotted placeholder fills the box rather than centering in it', async () => {
      /* Measured before this rule existed: a slotted `Skeleton` came out 200
         wide and nothing high. It has no height of its own, and what held it
         was a centering flex box, which gave it its content height of zero. The
         stand-in was a plain rectangle and the skeleton was never visible. */
      const host = (await mount(
        `<helix-base-image alt="Waiting" style="inline-size:120px;--image-aspect:1/1"><i slot="placeholder"></i></helix-base-image>`,
      )) as Picture
      await host.updateComplete
      const stand = boxOf(host, 'placeholder')
      const slotted = (
        host.querySelector('[slot="placeholder"]') as HTMLElement
      ).getBoundingClientRect()
      expect(stand.height).toBeGreaterThan(0)
      expect(slotted.height).toBe(stand.height)
      expect(slotted.width).toBe(stand.width)
    })

    test('and the fallback takes none until it is wanted', async () => {
      const host = await shown('src="/gone.jpg"')
      expect(boxOf(host, 'fallback').height).toBe(0)

      img(host).dispatchEvent(new Event('error'))
      await host.updateComplete
      expect(boxOf(host, 'fallback').height).toBeGreaterThan(0)
      expect(boxOf(host, 'placeholder').height).toBe(0)
    })
  })
}

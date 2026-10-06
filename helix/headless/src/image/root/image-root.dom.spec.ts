import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Picture = HTMLElement & { src: string; status: string; updateComplete: Promise<unknown> }

const image = async (attrs = ''): Promise<Picture> => {
  /* The caller's `alt` wins rather than being written twice: a duplicate
     attribute keeps the first, so a helper-supplied one would shadow what a
     spec about an empty alt is asserting. */
  const alt = attrs.includes('alt=') ? '' : 'alt="A pier"'
  const host = (await mount(
    `<helix-headless-image ${alt} ${attrs}></helix-headless-image>`,
  )) as Picture
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

  /* `alt` defaulted to empty and was always written, so a forgotten one made
     the picture silently decorative, the opposite of what its docs say. Left
     off, a reader announces the file name and a checker reports it, as with a
     native image. */
  test('leaves the alt off where the host has none', async () => {
    const host = (await mount(
      '<helix-headless-image src="/pier.jpg"></helix-headless-image>',
    )) as Picture
    await host.updateComplete
    expect(img(host).hasAttribute('alt')).toBe(false)
  })

  test('waits until it is nearly needed, unless told otherwise', async () => {
    expect(img(await image('src="/pier.jpg"')).getAttribute('loading')).toBe('lazy')
    expect(img(await image('src="/pier.jpg" loading="eager"')).getAttribute('loading')).toBe(
      'eager',
    )
  })

  test("says it arrived, under the platform's own name", async () => {
    /* `load` and `error` on an `<img>` neither bubble nor compose, so the ones
       fired inside this shadow root reach nobody outside it. Relaying from the
       host is what makes them audible, and it keeps the native name rather than
       coining a second word for it. */
    const host = await image('src="/pier.jpg"')
    const heard: string[] = []
    host.addEventListener('load', () => {
      heard.push(`load:${host.src}`)
    })
    img(host).dispatchEvent(new Event('load'))
    await host.updateComplete
    expect(heard).toEqual(['load:/pier.jpg'])
  })

  test('and says when it is not coming, which is the more useful of the two', async () => {
    const host = await image('src="/gone.jpg"')
    const heard: string[] = []
    host.addEventListener('error', () => {
      heard.push(`error:${host.src}`)
    })
    img(host).dispatchEvent(new Event('error'))
    await host.updateComplete
    expect(heard).toEqual(['error:/gone.jpg'])
  })

  test('hears a picture that was already there once', async () => {
    /* A cached picture finished before anything listened, and the first update
       asks from `firstUpdated` and from `updated`: answered both times, a page
       heard its `load` twice. */
    const proto = HTMLImageElement.prototype
    const own = ['complete', 'naturalWidth'].map(
      (name) => [name, Object.getOwnPropertyDescriptor(proto, name)] as const,
    )
    Object.defineProperty(proto, 'complete', { configurable: true, get: () => true })
    Object.defineProperty(proto, 'naturalWidth', { configurable: true, get: () => 40 })
    const host = document.createElement('helix-headless-image') as Picture
    try {
      host.setAttribute('alt', 'A pier')
      host.setAttribute('src', '/pier.jpg')
      const heard: string[] = []
      host.addEventListener('load', () => heard.push('load'))
      document.body.append(host)
      await host.updateComplete
      expect(host.status).toBe('loaded')
      expect(heard).toEqual(['load'])
    } finally {
      host.remove()
      for (const [name, descriptor] of own) {
        if (descriptor) {
          Object.defineProperty(proto, name, descriptor)
        } else {
          delete (proto as unknown as Record<string, unknown>)[name]
        }
      }
    }
  })

  /* The cached picture's own `load` is still queued when `settle` answers for
     it, and a browser delivers it a task later: relayed as well, a page heard
     the picture arrive twice. */
  test('and not again when the platform sends its own `load` for it', async () => {
    const proto = HTMLImageElement.prototype
    const own = ['complete', 'naturalWidth'].map(
      (name) => [name, Object.getOwnPropertyDescriptor(proto, name)] as const,
    )
    Object.defineProperty(proto, 'complete', { configurable: true, get: () => true })
    Object.defineProperty(proto, 'naturalWidth', { configurable: true, get: () => 40 })
    const host = document.createElement('helix-headless-image') as Picture
    try {
      host.setAttribute('alt', 'A pier')
      host.setAttribute('src', '/pier.jpg')
      const heard: string[] = []
      host.addEventListener('load', () => heard.push('load'))
      document.body.append(host)
      await host.updateComplete
      img(host).dispatchEvent(new Event('load'))
      expect(heard).toEqual(['load'])
      /* A later load of the same element, a new candidate from `srcset`, is
         still heard. */
      img(host).dispatchEvent(new Event('load'))
      expect(heard).toEqual(['load', 'load'])
    } finally {
      host.remove()
      for (const [name, descriptor] of own) {
        if (descriptor) {
          Object.defineProperty(proto, name, descriptor)
        } else {
          delete (proto as unknown as Record<string, unknown>)[name]
        }
      }
    }
  })

  test('and does not bubble, because a native `load` does not', async () => {
    /* A bubbling relay of `load` reaches nothing in React: it is in react-dom's
       `nonDelegatedEvents`, so no root listener exists, and `bindReactHandler`
       binds only the non-bubbling ones. Matching the native propagation is what
       makes `onLoad` work at all, and a gallery does here what it does for
       `<img>`. */
    const host = await image('src="/pier.jpg"')
    const heard: string[] = []
    host.parentElement?.addEventListener('load', () => heard.push('heard'))
    img(host).dispatchEvent(new Event('load'))
    await host.updateComplete
    expect(heard).toEqual([])
  })

  test('asks for the picture urgently only when told to', async () => {
    expect(img(await image('src="/a.jpg"')).getAttribute('fetchpriority')).toBe('auto')
    expect(
      img(await image('src="/a.jpg" fetchpriority="high"')).getAttribute('fetchpriority'),
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

  test('neither stand-in is read out while the picture is on its way', async () => {
    const host = await image('src="/pier.jpg"')
    expect(part(host, 'placeholder')?.getAttribute('aria-hidden')).toBe('true')
    expect(part(host, 'fallback')?.getAttribute('aria-hidden')).toBe('true')
  })

  /* The fallback said "Photo unavailable" to a sighted reader and nothing to a
     screen reader, which heard the picture's name as if it had arrived. */
  test('the fallback is read once the picture fails', async () => {
    const host = await image('src="/missing.jpg" alt="Pier at dusk"')
    img(host).dispatchEvent(new Event('error'))
    await host.updateComplete
    expect(part(host, 'fallback')?.hasAttribute('aria-hidden')).toBe(false)
    expect(part(host, 'fallback')?.hasAttribute('hidden')).toBe(false)
    expect(part(host, 'placeholder')?.getAttribute('aria-hidden')).toBe('true')
  })
})

if (hasLayout()) {
  describe('an image whose stand-in has been put away', () => {
    /* Never assert on the `hidden` attribute here. It can be set correctly on
       every path while the stand-in stays painted over the picture, because
       `display: flex` is an author rule and `[hidden] { display: none }` is the
       user agent's, and an author rule wins at any specificity. A box is the
       only thing that answers "is it out of the way" from the reader's side.
       `Megamenu`'s own layout spec says the same. */
    const shown = async (attrs: string): Promise<Picture> => {
      const host = (await mount(
        `<helix-headless-image alt="A pier" style="inline-size:120px;--image-aspect:1/1" ${attrs}></helix-headless-image>`,
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
      /* A slotted `Skeleton` has no height of its own, so a centering flex box
         gives it its content height of zero: measured at 200 wide and nothing
         high, a plain rectangle with the skeleton never visible. */
      const host = (await mount(
        `<helix-headless-image alt="Waiting" style="inline-size:120px;--image-aspect:1/1"><i slot="placeholder"></i></helix-headless-image>`,
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

/* Radix's `delayMs`: a picture that arrives inside the wait never flashes a
   placeholder. */
describe('placeholder delay and states', () => {
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
  const placeholderHidden = (host: HTMLElement): boolean =>
    part(host, 'placeholder')?.hasAttribute('hidden') ?? true
  const states = (host: HTMLElement): ElementInternals['states'] =>
    (host as unknown as { internals: ElementInternals }).internals.states

  test('keeps the placeholder hidden until the wait is over', async () => {
    const host = stillLoading(await image('src="/pier.avif" placeholder-delay="30"'))
    expect(placeholderHidden(host)).toBe(true)
    await new Promise((resolve) => setTimeout(resolve, 60))
    await host.updateComplete
    expect(placeholderHidden(host)).toBe(false)
  })

  test('shows it at once with no wait, as before', async () => {
    const host = await image('src="/pier.avif"')
    expect(placeholderHidden(host)).toBe(false)
  })

  test('a picture that arrives inside the wait never shows one', async () => {
    const host = stillLoading(await image('src="/pier.avif" placeholder-delay="30"'))
    host.shadowRoot?.querySelector('img')?.dispatchEvent(new Event('load'))
    await new Promise((resolve) => setTimeout(resolve, 60))
    await host.updateComplete
    expect(placeholderHidden(host)).toBe(true)
  })

  test('says loaded and error as custom states', async () => {
    const host = await image('src="/pier.avif"')
    host.shadowRoot?.querySelector('img')?.dispatchEvent(new Event('load'))
    await host.updateComplete
    expect(states(host).has('loaded')).toBe(true)
    expect(states(host).has('error')).toBe(false)
    host.src = '/missing.avif'
    await host.updateComplete
    host.shadowRoot?.querySelector('img')?.dispatchEvent(new Event('error'))
    await host.updateComplete
    expect(states(host).has('loaded')).toBe(false)
    expect(states(host).has('error')).toBe(true)
  })
})

/* Between the two answers there was no state, so a sheet drew the wait as
   `:not(:state(loaded)):not(:state(error))`, and the delay before the
   placeholder had no name at all. */
describe('the states before an answer', () => {
  const states = (host: HTMLElement): ElementInternals['states'] =>
    (host as unknown as { internals: ElementInternals }).internals.states
  /* The browser's own answers are kept from the component, so a picture stays
     on its way until the spec dispatches one. */
  const stillLoading = (host: Picture): Picture => {
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

  test('says loading until the picture loads or fails', async () => {
    const host = stillLoading(await image('src="/pier.avif"'))
    expect(states(host).has('loading')).toBe(true)
    img(host).dispatchEvent(new Event('load'))
    await host.updateComplete
    expect(states(host).has('loading')).toBe(false)
    const failed = stillLoading(await image('src="/gone.avif"'))
    expect(states(failed).has('loading')).toBe(true)
    img(failed).dispatchEvent(new Event('error'))
    await failed.updateComplete
    expect(states(failed).has('loading')).toBe(false)
  })

  test('says waiting while the delay holds the placeholder back, and not after', async () => {
    const host = stillLoading(await image('src="/pier.avif" placeholder-delay="30"'))
    expect(states(host).has('waiting')).toBe(true)
    await new Promise((resolve) => setTimeout(resolve, 60))
    await host.updateComplete
    expect(states(host).has('waiting')).toBe(false)
    expect(states(await image('src="/pier.avif"')).has('waiting')).toBe(false)
  })
})

describe('an image with no alt', () => {
  test('is reported once, and one with an alt or hidden from the reader is not', async () => {
    const warnings: string[] = []
    const original = console.warn
    console.warn = (message: string) => warnings.push(message)
    try {
      await mount('<helix-headless-image src="/a.png"></helix-headless-image>')
      await mount('<helix-headless-image src="/a.png" alt=""></helix-headless-image>')
      await mount('<helix-headless-image src="/a.png" alt="A road"></helix-headless-image>')
      await mount('<helix-headless-image src="/a.png" aria-hidden="true"></helix-headless-image>')
    } finally {
      console.warn = original
    }
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('alt=""')
  })
})

describe('an image with no `alt`', () => {
  /* The warning had no case, so nothing held the three answers apart: no
     `alt` is reported, an empty one is decoration, and a hidden picture needs
     neither. */
  test('is reported once, and an empty or hidden one is not', async () => {
    const warnings: string[] = []
    const original = console.warn
    console.warn = (message: string) => warnings.push(message)
    try {
      await mount('<helix-headless-image src="/pier.jpg"></helix-headless-image>')
      await mount('<helix-headless-image alt="" src="/pier.jpg"></helix-headless-image>')
      await mount(
        '<helix-headless-image aria-hidden="true" src="/pier.jpg"></helix-headless-image>',
      )
    } finally {
      console.warn = original
    }
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('alt=""')
  })
})

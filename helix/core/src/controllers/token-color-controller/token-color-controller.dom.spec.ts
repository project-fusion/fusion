import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@helix-io/testing/dom'
import { TokenColorController } from './token-color-controller.js'

/**
 * Reading a design token as the triple a shader or a canvas takes.
 *
 * **The conversion cannot be tested here, and stubbing it would be a lie.** The
 * whole point is that the browser does the converting: a token derives from an
 * `oklch()` seed, Chrome answers `lab(100 0 0)` for white, and parsing that
 * with a regular expression for numbers reads 100, 0, 0, which divided by 255
 * is a dark red. That shipped, and painted a warm streak down a shader for an
 * afternoon, surviving review because a warm cast on a saturated gradient is
 * also what a screenshot's chroma subsampling produces. A stubbed canvas would
 * be asserting the stub, and the bug was precisely that a plausible conversion
 * is wrong.
 *
 * **What is here is everything around it, and one of those paths is the
 * measurement.** happy-dom's `getContext('2d')` answers null, which is the same
 * state a server is in, so the fallback branch is exercised for real rather
 * than arranged. The lifecycle, the two things it watches and the teardown are
 * all its own.
 */
beforeAll(() => {
  registerDom()
})

/** A host that counts the updates it is asked for. */
const host = (): { addController: () => void; requestUpdate: () => void; updates: number } => {
  const made = {
    addController: () => {},
    requestUpdate: () => {
      made.updates += 1
    },
    updates: 0,
  }
  return made
}

describe('a token read where there is no canvas to convert with', () => {
  /* Which is a server, and every caller is drawing into a canvas, so there is
     nothing there to draw either. */
  test('answers the fallback rather than a colour it guessed', () => {
    const one = host()
    const colour = new TokenColorController(one as never)
    colour.hostConnected()
    expect(colour.read('--helix-color-foreground', [0.1, 0.2, 0.3])).toEqual([0.1, 0.2, 0.3])
    colour.hostDisconnected()
  })

  /* A copy, not the caller's own array. Every caller here is writing into a
     shader, and one that normalises the triple it was handed would be
     rewriting the fallback it passes on the next frame. */
  test('and a copy of it, so a caller writing into the triple keeps its own', () => {
    const colour = new TokenColorController(host() as never)
    colour.hostConnected()
    const fallback: [number, number, number] = [0.1, 0.2, 0.3]
    const read = colour.read('--helix-color-foreground', fallback)
    read[0] = 1
    expect(fallback[0]).toBe(0.1)
    colour.hostDisconnected()
  })

  test('before it has connected at all, which is where a server is', () => {
    expect(new TokenColorController(host() as never).read('--x', [0, 0, 0])).toEqual([0, 0, 0])
  })
})

describe('the probe a token is resolved against', () => {
  test('is put on the page, and drawn nowhere', () => {
    const before = document.body.children.length
    const colour = new TokenColorController(host() as never)
    colour.hostConnected()
    const probe = document.body.lastElementChild as HTMLElement
    expect(document.body.children.length).toBe(before + 1)
    expect(probe.style.display).toBe('none')
    colour.hostDisconnected()
  })

  test('and taken away again when the host leaves', () => {
    const before = document.body.children.length
    const colour = new TokenColorController(host() as never)
    colour.hostConnected()
    colour.hostDisconnected()
    expect(document.body.children.length).toBe(before)
  })
})

describe('the palette moving underneath the host', () => {
  /* The colour mode is an attribute and the system's answer is a media query.
     Watching only the first leaves a reader on system light with the dark
     palette, which is the half that is easy to miss because a developer
     toggling the site's own control never sees it. */
  test('is noticed when the document changes its mode', async () => {
    const one = host()
    const colour = new TokenColorController(one as never)
    colour.hostConnected()
    document.documentElement.setAttribute('data-color-mode', 'dark')
    await new Promise((done) => setTimeout(done, 0))
    expect(one.updates).toBe(1)
    colour.hostDisconnected()
    document.documentElement.removeAttribute('data-color-mode')
  })

  /* A host that paints outside Lit's cycle needs telling, because a canvas
     holds its last frame and no re-render repaints it. */
  test('and the host is told, not merely asked to update', async () => {
    let told = 0
    const colour = new TokenColorController(host() as never, () => {
      told += 1
    })
    colour.hostConnected()
    document.documentElement.setAttribute('data-color-mode', 'dark')
    await new Promise((done) => setTimeout(done, 0))
    expect(told).toBe(1)
    colour.hostDisconnected()
    document.documentElement.removeAttribute('data-color-mode')
  })

  test('and stops being watched once the host leaves', async () => {
    const one = host()
    const colour = new TokenColorController(one as never)
    colour.hostConnected()
    colour.hostDisconnected()
    document.documentElement.setAttribute('data-color-mode', 'dark')
    await new Promise((done) => setTimeout(done, 0))
    expect(one.updates).toBe(0)
    document.documentElement.removeAttribute('data-color-mode')
  })
})

describe('the operating system’s own answer', () => {
  /* The half a developer toggling the site's control never sees. Its listener
     is captured here rather than fired, because happy-dom's `matchMedia` has no
     way to change what it reports. */
  test('is listened to as well as the attribute', () => {
    const listeners: (() => void)[] = []
    const real = window.matchMedia
    window.matchMedia = ((query: string) => ({
      addEventListener: (_: string, listener: () => void) => listeners.push(listener),
      matches: false,
      media: query,
      removeEventListener: () => {},
    })) as never
    try {
      const one = host()
      const colour = new TokenColorController(one as never)
      colour.hostConnected()
      expect(listeners).toHaveLength(1)
      listeners[0]?.()
      expect(one.updates).toBe(1)
      colour.hostDisconnected()
    } finally {
      window.matchMedia = real
    }
  })

  test('and released on the way out', () => {
    const released: string[] = []
    const real = window.matchMedia
    window.matchMedia = ((query: string) => ({
      addEventListener: () => {},
      matches: false,
      media: query,
      removeEventListener: (name: string) => released.push(name),
    })) as never
    try {
      const colour = new TokenColorController(host() as never)
      colour.hostConnected()
      colour.hostDisconnected()
      expect(released).toEqual(['change'])
    } finally {
      window.matchMedia = real
    }
  })
})

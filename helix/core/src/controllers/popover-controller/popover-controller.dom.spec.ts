import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import { PopoverController } from './popover-controller.js'

/**
 * A surface that floats against something, in the top layer, until dismissed.
 *
 * Three things always travel together: the popover API, a `FloatingController`
 * and a `DismissController`. Each is small, which is exactly why copies of them
 * drift without being noticed. `Select` never called `showPopover` at all, so
 * its list was an ordinary positioned panel that any ancestor with
 * `overflow: hidden` clipped, while a menu in the same position was not.
 *
 * **happy-dom implements neither `showPopover` nor `hidePopover`**, which makes
 * the degraded path the one that runs by default here: a browser without the
 * API should still get a positioned panel, worse because it can be clipped and
 * not broken. The supported path is arranged by defining the two methods, which
 * is what a browser with the API provides.
 */
beforeAll(() => {
  registerDom()
})

const live: PopoverController[] = []
afterEach(() => {
  for (const one of live.splice(0)) {
    one.hide()
  }
})

interface Scene {
  anchor: HTMLElement
  asked: string[]
  dismissed: number
  popover: PopoverController
  surface: HTMLElement
}

const scene = (
  options: { api?: boolean; attribute?: boolean; place?: boolean | (() => boolean) } = {},
): Scene => {
  const { api = true, attribute = true, place } = options
  document.body.innerHTML =
    '<div id="host"><button id="anchor">open</button><div id="surface"></div></div>'
  const host = document.getElementById('host') as HTMLElement
  Object.assign(host, { addController: () => {}, requestUpdate: () => {} })
  const anchor = document.getElementById('anchor') as HTMLElement
  const surface = document.getElementById('surface') as HTMLElement
  if (attribute) {
    surface.setAttribute('popover', 'manual')
  }
  const made = { anchor, asked: [] as string[], dismissed: 0, surface } as Scene
  if (api) {
    Object.assign(surface, {
      hidePopover: () => made.asked.push('hide'),
      showPopover: () => made.asked.push('show'),
    })
  }
  /* Recorded so the order the two halves run in can be asserted. */
  const real = anchor.getBoundingClientRect.bind(anchor)
  anchor.getBoundingClientRect = () => {
    made.asked.push('measure')
    return real()
  }
  made.popover = new PopoverController(host as never, {
    anchor: () => anchor,
    onDismiss: () => {
      made.dismissed += 1
    },
    ...(place === undefined ? {} : { place }),
    surface: () => surface,
  })
  live.push(made.popover)
  return made
}

describe('showing a surface', () => {
  /* The top layer is the whole point. A floating panel has to escape every
     clipping ancestor between it and the page, and `position: fixed` does not:
     it is clipped by `overflow` on any ancestor and re-anchored entirely by one
     carrying `transform`, `filter` or `contain`. */
  test('lifts it into the top layer, which is the whole reason this exists', () => {
    const one = scene()
    one.popover.show()
    expect(one.asked[0]).toBe('show')
  })

  test('and says so', () => {
    const one = scene()
    expect(one.popover.open).toBe(false)
    one.popover.show()
    expect(one.popover.open).toBe(true)
  })

  /* Safe to call when already open, so a host may call it from whatever
     combination of a property, an event and a command it likes without keeping
     track of which one got there first. */
  test('once, however many times it is asked', () => {
    const one = scene()
    one.popover.show()
    one.popover.show()
    expect(one.asked.filter((call) => call === 'show')).toHaveLength(1)
  })

  test('and not at all where there is no surface to show', () => {
    document.body.innerHTML = '<div id="host"></div>'
    const host = document.getElementById('host') as HTMLElement
    Object.assign(host, { addController: () => {} })
    const popover = new PopoverController(host as never, {
      anchor: () => null,
      onDismiss: () => {},
      surface: () => null,
    })
    popover.show()
    expect(popover.open).toBe(false)
  })
})

describe('a surface that is not one', () => {
  /* `showPopover` on an element with no `popover` attribute throws
     `NotSupportedError`, from inside whatever promise the host called this in,
     so it surfaces as an unhandled rejection naming a method rather than as the
     thing that is actually wrong. Which is how `Select` looked for as long as
     it was broken: no error at all, just a panel that could be clipped. */
  test('is named, rather than throwing about a method', () => {
    const one = scene({ attribute: false })
    expect(() => {
      one.popover.show()
    }).toThrow(/needs a `popover` attribute/)
  })
})

describe('a browser without the popover API', () => {
  /* Feature-detected rather than assumed: a browser without it should still get
     a positioned panel, worse because it can be clipped and not broken. */
  test('still gets a positioned panel that dismisses', () => {
    const one = scene({ api: false, attribute: false })
    one.popover.show()
    expect(one.popover.open).toBe(true)
    document.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }))
    expect(one.dismissed).toBe(1)
  })
})

describe('the order the two halves run in', () => {
  /* Measuring an element that is still `display: none` gives zeroes, so a
     surface positioned before it is shown lands at the origin and slides into
     place on the next frame. */
  test('is shown first and measured after, never the other way round', () => {
    const one = scene()
    one.popover.show()
    const shown = one.asked.indexOf('show')
    const measured = one.asked.indexOf('measure')
    expect(shown).toBeGreaterThanOrEqual(0)
    expect(measured).toBeGreaterThan(shown)
  })

  /* And the reverse on the way down, so nothing takes a final measurement of an
     element on its way out. */
  test('and stopped before hidden on the way down', () => {
    const one = scene()
    one.popover.show()
    one.asked.length = 0
    one.popover.hide()
    expect(one.asked.filter((call) => call === 'measure')).toHaveLength(0)
    expect(one.asked).toEqual(['hide'])
  })
})

describe('a surface whose position is a fact about the page', () => {
  /* A full-bleed navigation panel spans the viewport and sits under the header,
     so there is nothing to measure and nothing to flip or shift to. Placing it
     anyway wrote a `translate` of the trigger's own offset over a band meant to
     start at the edge. What it keeps is the top layer and the dismissal, which
     is what this bundles. */
  test('is shown and dismissed, and never measured', () => {
    const one = scene({ place: false })
    one.popover.show()
    expect(one.asked).toEqual(['show'])
    document.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }))
    expect(one.dismissed).toBe(1)
  })

  /* Read fresh rather than in the constructor, so a host taking it from a
     property gets the value the element has now. */
  test('and is asked each time rather than once', () => {
    let places = false
    const one = scene({ place: () => places })
    one.popover.show()
    expect(one.asked).toEqual(['show'])
    one.popover.hide()
    places = true
    one.asked.length = 0
    one.popover.show()
    expect(one.asked).toContain('measure')
  })

  /* A megamenu is a card on a wide window and a band on a narrow one. Opened
     as a card first, it kept the card's edges and translate, and those inline
     declarations beat the band's own sheet, so the band opened where the card
     had been. */
  test('and loses what an earlier placement wrote on it', async () => {
    let places = true
    const one = scene({ place: () => places })
    one.popover.show()
    // `computePosition` is async, so the write lands after a tick.
    await new Promise((done) => setTimeout(done, 0))
    expect(one.surface.style.getPropertyValue('left')).toBe('0px')
    one.popover.hide()
    places = false
    one.popover.show()
    expect(
      ['left', 'right', 'top', 'translate'].map((edge) => one.surface.style.getPropertyValue(edge)),
    ).toEqual(['', '', '', ''])
    expect(one.surface.hasAttribute('data-placement')).toBe(false)
  })
})

describe('hiding', () => {
  test('takes it out of the top layer and stops everything watching', () => {
    const one = scene()
    one.popover.show()
    one.popover.hide()
    expect([one.popover.open, one.asked.includes('hide')]).toEqual([false, true])
  })

  test('and does nothing at all when it was not showing', () => {
    const one = scene()
    one.popover.hide()
    expect(one.asked).toEqual([])
  })

  test('after which a press outside is nobody’s business', () => {
    const one = scene()
    one.popover.show()
    one.popover.hide()
    document.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }))
    expect(one.dismissed).toBe(0)
  })
})

describe('toggling', () => {
  test('is whichever of the two it is not already doing', () => {
    const one = scene()
    one.popover.toggle()
    expect(one.popover.open).toBe(true)
    one.popover.toggle()
    expect(one.popover.open).toBe(false)
  })
})

describe('what closing means', () => {
  /* The host decides, because it is the only thing that knows what else has to
     happen: a menu forgets which page it was on, a select puts focus back on
     its trigger, and a tooltip does neither. So the surface stays open until it
     is told, even after asking. */
  test('is the host’s to decide, so this only ever asks', () => {
    const one = scene()
    one.popover.show()
    document.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }))
    expect([one.dismissed, one.popover.open]).toEqual([1, true])
  })
})

describe('a host that has left the page', () => {
  test('is no longer showing anything', () => {
    const one = scene()
    one.popover.show()
    one.popover.hostDisconnected()
    expect(one.popover.open).toBe(false)
  })
})

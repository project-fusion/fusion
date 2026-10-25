/**
 * The page machine an element that declares a `page` runs: whether the page
 * it stands over has scrolled from its top, and whether a scroll down has
 * moved it out of the way, as an app header lifts off the page and hides
 * under `hide-on-scroll`.
 *
 * **The page is the scroll view the element is drawn in**, found from the
 * host's view, unless `scroller` names a view registered with `useTarget`,
 * as an app that places its header above the `ScrollArea` it draws its page
 * in names that area. Either is read through the scroll capability's
 * `observe`, as the web element reads the window or the element its
 * `scroller` names.
 */
import { measure } from '@fusion.dev/helix-core/capabilities/measure'
import { scroll } from '@fusion.dev/helix-core/capabilities/scroll'
import { useCallback, useEffect, useRef, useState } from 'react'
import { type HostInstance, useWindowDimensions } from 'react-native'
import { scrollViewAbove, standingOf } from '../capabilities/scroll'
import type { MachineUse } from '../ir.generated'
import type { Behavior, Props } from '../render/behavior'
import { useTargetView } from '../render/targets'
import type { Family } from '../style/form'
import { boundTo, given, tell } from './props'

/** How far the page travels from its top before it counts as scrolled, and back within which it no longer does. */
export const SCROLLED_IN = 8
export const SCROLLED_OUT = 2

/** How far a scroll moves before it counts as a direction, so a resting finger does not flicker the bar. */
export const DIRECTION = 4

/** Where the page stands, as the machine last read it. */
interface Standing {
  readonly hidden: boolean
  readonly scrolled: boolean
  readonly y: number
}

/**
 * Where the page stands after it moves to `y`: scrolled once it has moved
 * 8 from its top, and no longer within 2 of it; under `hides`, hidden on a
 * scroll down past `height` while nothing `stays`, and shown on a scroll up
 * or back within `height` of the top. The web element follows the same
 * band and the same steps.
 */
export const standingAt = (
  was: Standing,
  y: number,
  height: number,
  hides: boolean,
  stays: boolean,
): Standing => {
  const scrolled = was.scrolled ? y > SCROLLED_OUT : y > SCROLLED_IN
  const moved = y - was.y
  let hidden = was.hidden
  if (!hides || y <= height) {
    hidden = false
  } else if (moved > DIRECTION && !stays) {
    hidden = true
  } else if (moved < -DIRECTION) {
    hidden = false
  }
  return { hidden, scrolled, y }
}

/**
 * Hosts the page machine: the host's view, handed over by its ref, the view
 * it follows, and the states its source names. `scrolled` turns and its
 * event is sent only as the page crosses the band, so a scroll draws again
 * only then. `stays` is whether the element's folded region stands open,
 * which keeps it in view.
 */
export const usePage = (family: Family, props: Props, use: MachineUse, open: boolean): Behavior => {
  const scrolledState = boundTo(use, 'scrolled', 'state') ?? 'scrolled'
  const hiddenState = boundTo(use, 'hidden', 'state')
  const sends = boundTo(use, 'sends', 'event')
  const named = given(family, props, boundTo(use, 'scroller', 'prop'))
  const hides = given(family, props, boundTo(use, 'hides', 'prop')) === true
  const stays = boundTo(use, 'stays', 'prop') !== undefined && open
  /* Drawn again as the window turns, since whether the bar folds is read
     from the window's width. */
  useWindowDimensions()
  const registered = useTargetView(typeof named === 'string' && named !== '' ? named : undefined)
  const [host, setHost] = useState<HostInstance | null>(null)
  const [standing, setStanding] = useState<Standing>({ hidden: false, scrolled: false, y: 0 })
  const latest = useRef({ hides, props, stays })
  latest.current = { hides, props, stays }
  const ref = useCallback((node: HostInstance | null) => setHost(node), [])
  useEffect(() => {
    const source = (registered as HostInstance | null) ?? (host ? scrollViewAbove(host) : null)
    if (source === null) {
      return undefined
    }
    let was: Standing = { hidden: false, scrolled: false, y: 0 }
    const follow = (y: number) => {
      const now = latest.current
      const height = host === null ? 0 : (measure().box(host)?.height ?? 0)
      const next = standingAt(was, y, height, now.hides, now.stays)
      const turned = next.scrolled !== was.scrolled
      const moved = next.hidden !== was.hidden || turned
      was = next
      if (moved) {
        setStanding(next)
      }
      if (turned && sends !== undefined) {
        tell(family, now.props, sends, { scrolled: next.scrolled })
      }
    }
    follow(standingOf(source).offset.y)
    return scroll().observe(source, (at) => follow(at.offset.y))
  }, [family, host, registered, sends])
  return {
    marks: [],
    parts: {
      host: {
        states: {
          [scrolledState]: standing.scrolled,
          ...(hiddenState === undefined ? {} : { [hiddenState]: hides && standing.hidden }),
        },
        view: { ref },
      },
    },
  }
}

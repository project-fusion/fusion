/**
 * A phone's lightbox's hooks into the app around it: the hardware keys, the
 * web element's methods on its ref, and the focus it takes as it opens.
 */
import { focus } from '@fusion.dev/helix-core/capabilities/focus'
import { keys } from '@fusion.dev/helix-core/capabilities/keys'
import { timers } from '@fusion.dev/helix-core/capabilities/timers'
import type { KeyPress } from '@fusion.dev/helix-core/capabilities/types'
import { type Ref, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { Turned } from './toggle'

/** The hardware keys, heard anywhere in the app while the viewer is open, on the view the viewer gives. */
export const useKeys = (open: boolean, heard: (press: KeyPress) => boolean) => {
  const [view, setView] = useState<unknown>(null)
  useEffect(() => {
    if (!open || view === null) {
      return undefined
    }
    return keys().listenAnywhere(view as never, heard)
  }, [heard, open, view])
  return setView
}

/** The web element's methods, on the element's ref. */
export const useHandle = (
  ref: unknown,
  toggled: Turned | undefined,
  step: (by: number) => void,
  zoomTo: (scale: number) => void,
) => {
  const turn = useRef(toggled)
  turn.current = toggled
  useImperativeHandle(
    ref as Ref<unknown> | undefined,
    () => ({
      close: () => {
        if (turn.current?.checked === true) {
          turn.current.turn()
        }
      },
      next: () => step(1),
      previous: () => step(-1),
      show: () => {
        if (turn.current?.checked === false) {
          turn.current.turn()
        }
      },
      zoomTo,
    }),
    [step, zoomTo],
  )
}

/**
 * **Opening focuses the viewer itself**, as the web's does, rather than its
 * first control: a screen reader hears the viewer's name, and the keys walk
 * the items at once. Two frames later, after the layer has placed focus on
 * its first control.
 */
export const useOwnFocus = (open: boolean, layer: () => unknown) => {
  const held = useRef(layer)
  held.current = layer
  useEffect(() => {
    if (!open) {
      return undefined
    }
    let second: (() => void) | undefined
    const first = timers().frame(() => {
      second = timers().frame(() => {
        const view = held.current()
        if (view !== null && view !== undefined) {
          focus().focus(view as never, false)
        }
      })
    })
    return () => {
      first()
      second?.()
    }
  }, [open])
}

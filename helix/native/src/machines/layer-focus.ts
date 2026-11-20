/**
 * A layer's focus scope: where focus goes as the layer opens, where Tab takes
 * it while a modal layer holds the reader, and where it goes back to as the
 * layer closes.
 *
 * **Opening moves focus to the first control in the layer**, as the web's
 * dialog moves it, and to the layer's own view where it holds none: each
 * press drawn inside the layer joins it as a stop, in the order it is drawn.
 * Up on its anchor opens it on its last control. **A layer that `enters` on
 * a press** takes focus only as a press or a key in its anchor opens it, as
 * a menu written open by the page leaves focus where it is, and one that
 * enters on `down` only as Down on a press in its anchor opens it or finds
 * it open, as a megamenu's panel leaves focus on its trigger as a press
 * opens it.
 * The focus capability moves the keyboard's focus and a screen reader's.
 *
 * **Tab goes round inside a modal layer**, from its last control to its first,
 * and Shift with Tab from its first to its last, as the web's dialog keeps
 * it, from a hardware keyboard.
 *
 * **Closing puts focus back where it was as the layer opened**, or on the
 * anchor where nothing held it. **A screen reader's focus is put back as best
 * a phone can**: React Native tells where the keyboard's focus is, and never
 * where a screen reader's is, so a reader who opened a dialog by touch is
 * taken back to its anchor where it has one, and is left where the screen
 * reader puts them where it has none.
 */
import { focus } from '@fusion.dev/helix-core/capabilities/focus'
import { keys } from '@fusion.dev/helix-core/capabilities/keys'
import type { KeyPress } from '@fusion.dev/helix-core/capabilities/types'
import { useEffect, useMemo, useRef } from 'react'
import type { LayerStop, LayerStops } from '../render/layered'
import type { Landing } from './layer-anchor'
import type { Enters } from './layer-read'
import { tabbed } from './layering'

/** Whether a view is still drawn, where it can say so. */
const drawn = (node: unknown): boolean =>
  node !== null &&
  node !== undefined &&
  (node as { readonly isConnected?: boolean }).isConnected !== false

/** The views of the stops that are not disabled now, in the order they joined. */
const enabledIn = (stops: ReadonlyMap<object, LayerStop>): unknown[] =>
  [...stops.values()].filter((stop) => !stop.disabled()).map((stop) => stop.node())

/**
 * Whether closing gives focus to the anchor: always, only where a stop
 * inside holds it, or only where a reader dismissed the layer.
 */
const returnsTo = (scoped: Scoped, stops: ReadonlyMap<object, LayerStop>): boolean => {
  const { returns } = scoped
  if (returns === 'dismissed') {
    return scoped.dismissed?.() === true
  }
  if (returns !== 'held') {
    return returns === 'anchor'
  }
  const held = focus().focused()
  return held !== null && [...stops.values()].some((stop) => stop.node() === held)
}

/**
 * Puts focus back as the layer closes: on the anchor where it returns there,
 * and only where focus was inside under `held`, or where it was as the layer
 * opened, or on the anchor where nothing held it.
 */
const giveBack = (scoped: Scoped, held: boolean, before: unknown): void => {
  const anchor = scoped.anchor()
  const { returns } = scoped
  if ((returns === 'held' || returns === 'dismissed') && !held) {
    return
  }
  const back = returns !== undefined && drawn(anchor) ? anchor : drawn(before) ? before : anchor
  if (drawn(back)) {
    focus().focus(back, false)
  }
}

/** What a layer's focus scope reads, at one render. */
export interface Scoped {
  /** The anchor's view, which focus goes back to where nothing held it. */
  readonly anchor: () => unknown
  /**
   * Whether focus enters the layer however it opened, `always`, only as a
   * press or a key in its anchor opens it, `press`, as a menu's does, or
   * only as Down on a press in its anchor opens it, `down`, as a megamenu's
   * does.
   */
  readonly enters?: Enters
  /**
   * Where focus lands as a press or a key in the anchor opened the layer,
   * its first control or its last, which the scope reads once and clears.
   */
  readonly landing?: { current: Landing | undefined }
  /** The layer's own view, which takes focus where the layer holds no control. */
  readonly layer: () => unknown
  readonly modal: boolean
  /**
   * Whether opening moves focus into the layer and closing puts it back.
   * A tooltip's does not: it describes what holds focus, and leaves it there.
   */
  readonly moves?: boolean
  readonly open: boolean
  /**
   * Where closing puts focus: `anchor` gives it to the anchor whatever held
   * it as the layer opened, as a popover gives it back to its trigger, and
   * `held` gives it to the anchor only where focus is inside the layer, as a
   * menu leaves it where a press outside put it, and `dismissed` only where
   * a reader dismissed it, as a megamenu leaves focus where a press on its
   * trigger or on a destination put it.
   */
  readonly returns?: 'anchor' | 'dismissed' | 'held' | undefined
  /**
   * Whether the close now being drawn is a reader's dismissal, a close
   * request or a press outside, which `dismissed` gives focus to the anchor
   * for, as the web's megamenu does.
   */
  readonly dismissed?: () => boolean
  /** Whether the layer is the last one opened, which alone takes Tab. */
  readonly top: () => boolean
  /** Hears the view focus moved to inside the layer, which a half open sheet opens further for. */
  readonly reveal?: ((node: unknown) => void) | undefined
}

/** A key that a modal layer's scope takes: Tab, with no modifier but Shift. */
const isTab = (press: KeyPress): boolean =>
  press.key === 'Tab' && !press.alt && !press.control && !press.meta

/** A layer's focus scope: the stops each press inside joins, and a way into it. */
export interface Scope extends LayerStops {
  /** Moves focus to the first control in the layer, as Down on a megamenu's trigger does. */
  readonly enter: () => void
  /** Whether the layer's own view or a control inside it holds focus now. */
  readonly holds: () => boolean
}

/**
 * Hosts a layer's focus scope, and answers the stops each press inside it
 * joins.
 */
export const useLayerFocus = (scoped: Scoped): Scope => {
  const stops = useRef(new Map<object, LayerStop>()).current
  const scope = useMemo<Scope>(
    () => ({
      enter: () => {
        const first = enabledIn(stops)[0]
        if (drawn(first)) {
          focus().focus(first, false)
        }
      },
      holds: () => {
        const held = focus().focused()
        return (
          held !== null &&
          (held === latest.current.layer() ||
            [...stops.values()].some((stop) => stop.node() === held))
        )
      },
      join: (key, stop) => {
        stops.set(key, stop)
      },
      leave: (key) => {
        stops.delete(key)
      },
    }),
    [stops],
  )
  const latest = useRef(scoped)
  latest.current = scoped
  /* Whether a stop inside held focus as the layer closed, read as the close
     is drawn, before what the layer holds is taken away. */
  const held = useRef(false)
  const wasOpen = useRef(scoped.open)
  if (wasOpen.current && !scoped.open) {
    held.current = returnsTo(scoped, stops)
  }
  wasOpen.current = scoped.open
  useEffect(() => {
    const landing = latest.current.landing?.current
    if (latest.current.landing !== undefined) {
      latest.current.landing.current = undefined
    }
    if (!scoped.open || scoped.moves === false) {
      return undefined
    }
    /* **A layer that enters on a press and opened otherwise leaves focus
       where it is**, and still gives focus to its anchor as it closes where
       it returns there, as a speed dial gives its trigger focus however it
       closes. */
    if (latest.current.enters !== 'always' && landing === undefined) {
      return () => {
        const anchor = latest.current.anchor()
        if (held.current && drawn(anchor)) {
          focus().focus(anchor, false)
        }
      }
    }
    const before = focus().focused()
    /* A frame later, once the host has drawn what the layer holds. */
    const frame = requestAnimationFrame(() => {
      const enabled = enabledIn(stops)
      const first = (landing === 'last' ? enabled.at(-1) : enabled[0]) ?? latest.current.layer()
      if (drawn(first)) {
        /* Only a move inside the open layer reveals: on opening, a sheet rests
           at its smallest snap point as the web's does, though its first
           control stands past the window's edge. */
        focus().focus(first, false)
      }
    })
    return () => {
      cancelAnimationFrame(frame)
      giveBack(latest.current, held.current, before)
    }
  }, [scoped.moves, scoped.open, stops])
  const layer = scoped.layer()
  useEffect(() => {
    if (!scoped.open || !scoped.modal || layer === null || layer === undefined) {
      return undefined
    }
    return keys().listenAnywhere(layer, (press) => {
      if (!isTab(press) || !latest.current.top()) {
        return false
      }
      const nodes = enabledIn(stops)
      const next = nodes[tabbed(nodes.length, nodes.indexOf(focus().focused()), press.shift)]
      if (next !== undefined) {
        focus().focus(next, false)
        latest.current.reveal?.(next)
      }
      return true
    })
  }, [layer, scoped.modal, scoped.open, stops])
  return scope
}

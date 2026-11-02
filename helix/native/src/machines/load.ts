/**
 * The load machine an `image` node runs: where its picture stands, the
 * events it sends as the picture loads and as it fails, and the states
 * every part's style reads.
 *
 * **The phases are `idle`, `loading`, `loaded`, and `failed`.** A picture
 * with no source is idle. A new source starts over at `loading`, so a
 * second picture never takes the first one's answer. A picture answers
 * once: `load` and `error` move only a picture that is loading.
 *
 * **The states are the web's**: `loading`, `loaded`, and `error`, as Image
 * and Avatar write `:state(loading)`, `:state(loaded)`, and
 * `:state(error)`. An idle picture stands in the state its node's `empty`
 * names, `loading` where it names none.
 */

import { useCallback, useRef, useState } from 'react'
import type { MachineUse } from '../ir.generated'
import type { Behavior, Props } from '../render/behavior'
import type { Family, Node } from '../style/form'
import { boundTo, given, tell } from './props'

/** Where a picture stands. */
export type LoadPhase = 'failed' | 'idle' | 'loaded' | 'loading'

/** What moves a picture: its source is set or taken away, or it loads or fails. */
export type LoadEvent = 'empty' | 'error' | 'load' | 'source'

/** The phase `event` moves `phase` to. */
export const loadAfter = (phase: LoadPhase, event: LoadEvent): LoadPhase => {
  switch (event) {
    case 'empty':
      return 'idle'
    case 'source':
      return 'loading'
    case 'load':
      return phase === 'loading' ? 'loaded' : phase
    case 'error':
      return phase === 'loading' ? 'failed' : phase
  }
}

/** The phase a picture starts in, from its source. */
export const firstLoad = (src: string): LoadPhase =>
  loadAfter('idle', src === '' ? 'empty' : 'source')

/** The state an idle picture stands in. */
export type Empty = 'error' | 'loading'

/** The states the phase sets, by the web's names. */
export const loadStates = (
  phase: LoadPhase,
  empty: Empty,
): { readonly error: boolean; readonly loaded: boolean; readonly loading: boolean } => {
  const standing = phase === 'idle' ? empty : phase === 'failed' ? 'error' : phase
  return {
    error: standing === 'error',
    loaded: standing === 'loaded',
    loading: standing === 'loading',
  }
}

/** A picture's natural size, in pixels. */
interface Size {
  readonly height: number
  readonly width: number
}

/** The size of a picture that has none, as one that fails. */
const NO_SIZE: Size = { height: 0, width: 0 }

/** The size React Native's `Image` says a picture loaded at, or none where it says nothing. */
const sizeOf = (source: Partial<Size> | undefined): Size => ({
  height: typeof source?.height === 'number' ? source.height : 0,
  width: typeof source?.width === 'number' ? source.width : 0,
})

/** The node an image's machine is bound to, by its part. */
const imageNode = (nodes: readonly Node[], part: string): Node | undefined => {
  for (const node of nodes) {
    if (node.kind === 'image' && node.name === part) {
      return node
    }
    const inside = imageNode(node.children ?? [], part)
    if (inside !== undefined) {
      return inside
    }
  }
  return undefined
}

/** The source a picture loads from: the prop its `src` binds, or the URL written. */
export const sourceOf = (family: Family, props: Props, use: MachineUse): string => {
  const prop = boundTo(use, 'src', 'prop')
  if (prop !== undefined) {
    const value = given(family, props, prop)
    return typeof value === 'string' ? value : ''
  }
  const written = imageNode(family.tree ?? [], boundTo(use, 'part', 'part') ?? '')?.attributes?.src
  return typeof written === 'string' ? written : ''
}

/**
 * Hosts a picture's load machine: the states its phase sets on the host,
 * which every part's style reads, and the handlers its image hears its
 * picture through. **Each answer is told once**, under the event the node
 * names, and only for the source that is loading. **The event's `target`
 * carries the picture's `naturalWidth` and `naturalHeight`**, as a web
 * handler reads them from the element: the size React Native's `Image`
 * loaded it at, and 0 by 0 for a picture that fails.
 */
export const useLoad = (family: Family, props: Props, use: MachineUse): Behavior => {
  const part = boundTo(use, 'part', 'part') ?? ''
  const src = sourceOf(family, props, use)
  const written = imageNode(family.tree ?? [], part)?.attributes?.empty
  const empty: Empty = written === 'error' ? 'error' : 'loading'
  const [held, setHeld] = useState(() => ({ phase: firstLoad(src), src }))
  /* A new source is a new question, so the old answer goes at once. */
  const standing = held.src === src ? held : { phase: firstLoad(src), src }
  if (standing !== held) {
    setHeld(standing)
  }
  const latest = useRef({ phase: standing.phase, props, src })
  latest.current = { phase: standing.phase, props, src }
  const answer = useCallback(
    (event: 'error' | 'load', answered: string, size: Size = NO_SIZE) => {
      const now = latest.current
      if (answered !== now.src || now.phase !== 'loading') {
        return
      }
      const phase = loadAfter(now.phase, event)
      latest.current = { ...now, phase }
      setHeld({ phase, src: answered })
      const name = boundTo(use, event, 'event')
      if (name !== undefined) {
        tell(
          family,
          latest.current.props,
          name,
          {},
          {
            naturalHeight: size.height,
            naturalWidth: size.width,
          },
        )
      }
    },
    [family, use],
  )
  const onLoad = useCallback(
    (loaded?: { readonly nativeEvent?: { readonly source?: Partial<Size> } }) =>
      answer('load', src, sizeOf(loaded?.nativeEvent?.source)),
    [answer, src],
  )
  const onError = useCallback(() => answer('error', src), [answer, src])
  return {
    marks: [],
    parts: {
      host: { states: loadStates(standing.phase, empty) },
      [part]: { view: { onError, onLoad } },
    },
  }
}

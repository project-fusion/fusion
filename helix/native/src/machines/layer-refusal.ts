/**
 * A layer's answer to a press outside it that `closedby` keeps open, where
 * its node `refuses`: its part is `data-refused` until the motion its rules
 * give it then has run, as the web's dialog swells and settles, and a press
 * while it moves starts the motion again a frame later.
 */
import { timers } from '@fusion.dev/helix-core/capabilities/timers'
import { useCallback, useRef, useState } from 'react'
import type { Node } from '../style/form'

const NONE = {} as const

/** What a layer's machine takes from its refusal. */
export interface Refusal {
  /** Answers a press outside the layer that it keeps open. */
  readonly answer: () => void
  /** What the drawing of the layer is given, which ends the answer once its motion has run. */
  readonly layered: { readonly refused?: () => void }
  /** The state the layer's part is in while it answers. */
  readonly states: Readonly<Record<string, boolean>>
}

/** Hosts the refusal of the layer `node` draws, which stands open while `open` holds. */
export const useRefusal = (node: Node | undefined, open: boolean): Refusal => {
  const refuses = node?.attributes?.refuses === true
  const [refused, setRefused] = useState(false)
  const latest = useRef(open)
  latest.current = open
  const answer = useCallback(() => {
    if (refuses) {
      setRefused(false)
      timers().frame(() => setRefused(latest.current))
    }
  }, [refuses])
  const settle = useCallback(() => setRefused(false), [])
  const on = refuses && refused && open
  return {
    answer,
    layered: on ? { refused: settle } : NONE,
    states: refuses ? { 'data-refused': on } : NONE,
  }
}

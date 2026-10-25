/**
 * The open phase of an element that hides itself, as a dismissed callout
 * does: its host is `exiting` while it fades out, `closed` once it has, and
 * `entering` while it fades in again, as the web element's states say.
 */

import { useEffect, useState } from 'react'
import type { Family } from '../style/form'
import { merged } from './behavior'
import { useOpenPhase } from './fit'
import { read, resolve, type Styling } from './styles'

/**
 * The prop that holds whether an element that hides itself is shown: a
 * toggle that only closes, on an element whose states say how it leaves and
 * comes back, `exiting`, `entering`, and `closed`.
 */
export const presenceOf = (family: Family): string | undefined => {
  const toggle = family.api?.toggle
  const states = family.api?.states ?? []
  return toggle?.closes !== undefined &&
    toggle.opens === undefined &&
    ['closed', 'entering', 'exiting'].every((state) => states.includes(state))
    ? toggle.checked
    : undefined
}

/** The host's opacity transition while it holds `state`. */
const moveIn = (styling: Styling, state: string) =>
  resolve(
    {
      ...styling,
      behavior: merged(styling.behavior, {
        marks: [],
        parts: { host: { states: { [state]: true } } },
      }),
    },
    'host',
  ).transitions.opacity

/** What the phase gives the element: its host's states, and whether it enters now. */
export interface Presence {
  /** Whether the element is at the first render of its entrance, which a rule under `entering` reads. */
  readonly entering: boolean
  readonly states: Readonly<Record<string, boolean>>
}

/**
 * The phase of an element that hides itself, where `prop` names what holds
 * whether it is shown, and nothing where it is `undefined`. **It fades as
 * its host's rules say**: the transition the host takes while `exiting`
 * moves it out, and the one it takes while `entering` moves it back in,
 * from the values its rules under `entering` give it. Reduced motion moves
 * nothing, so it hides and shows at once.
 */
export const usePresencePhase = (prop: string | undefined, styling: Styling): Presence => {
  const shown = prop === undefined || read(styling, prop) !== false
  const phase = useOpenPhase(
    shown,
    prop === undefined ? undefined : moveIn(styling, shown ? 'entering' : 'exiting'),
  )
  /* One render at the entering values, then the move to the shown ones. */
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    setArmed(phase === 'opening')
  }, [phase])
  if (prop === undefined) {
    return { entering: false, states: {} }
  }
  return {
    entering: phase === 'opening' && !armed,
    states: {
      closed: phase === 'closed',
      entering: phase === 'opening',
      exiting: phase === 'closing',
    },
  }
}

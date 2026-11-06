/**
 * Orb's derivations: what a screen reader hears of an orb, its name, its
 * role, and whether it is busy, as the web orb works them out from its state.
 */
import { lookupWord } from '../../words/registry.js'
import type { Derivation } from '../derivations/derivations.js'
import { textOf } from '../number-format/props.js'
import { orbShown } from './orb.js'

/** The tag an orb's words are registered under. */
const TAG = 'helix-orb'

/** The English each state is said in. */
export const ORB_STATE_LABELS: Readonly<Record<string, string>> = {
  connecting: 'Connecting',
  done: 'Done',
  fetching: 'Fetching',
  listening: 'Listening',
  thinking: 'Thinking',
  waiting: 'Waiting',
  working: 'Working',
}

/**
 * `orb-word`: the word for the state drawn: its word in `state-labels`, the
 * one registered for the orb's language, or the English.
 */
export const orbWord: Derivation = (props) => {
  const given = props['state-labels']
  const registered = lookupWord(textOf(props.locale) || 'en', TAG, 'stateLabels')?.[0]
  const words = {
    ...ORB_STATE_LABELS,
    ...(typeof registered === 'object' ? (registered as Record<string, string>) : {}),
    ...(typeof given === 'object' && given !== null ? (given as Record<string, string>) : {}),
  }
  return words[orbShown(props.state)] ?? ''
}

/** `orb-name`: the orb's name, `label`, or the word for its state. */
export const orbName: Derivation = (props) => textOf(props.label) || orbWord(props)

/**
 * `orb-role`: `status` under `announce`, where the orb is a live region,
 * `img` once it is `done`, and `progressbar` while there is work outstanding.
 */
export const orbRole: Derivation = (props) =>
  props.announce === true ? 'status' : orbShown(props.state) === 'done' ? 'img' : 'progressbar'

/**
 * `orb-busy`: whether the orb is busy, while work is outstanding, and never
 * under `announce`, since a busy live region holds back what it says.
 */
export const orbBusy: Derivation = (props) =>
  props.announce !== true && orbShown(props.state) !== 'done'

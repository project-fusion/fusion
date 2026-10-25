/**
 * Speed Dial's derivations: whether its trigger opens it on a long press,
 * the words it and that press are named and described by, in the words
 * registered for its language, an action's shortcut as the reader's keyboard
 * labels it, and whether a group of actions is named, as the web elements
 * work them out.
 */
import { environment } from '../../capabilities/environment/index.js'
import { chordParts } from '../chord/chord.js'
import { keyNames } from '../chord/key-names.js'
import type { Derivation } from '../derivations/derivations.js'
import { holdsRows, wordIn } from '../drilldown/drilldown-derivations.js'
import { textOf } from '../number-format/props.js'
import { onApple } from '../platform/platform.js'

/** The tag a speed dial's words are registered under. */
const TAG = 'helix-speed-dial'

/** The English a trigger that opens on a long press is described by. */
export const SPEED_DIAL_LONG_PRESS = 'Long press or press Alt+Down to show the actions'

/** `speed-dial-holds`: whether a long press on the trigger opens the actions, under `open-on="long-press"`. */
export const speedDialHolds: Derivation = (props) => textOf(props['open-on']) === 'long-press'

/** `speed-dial-name`: what the drawn trigger and the actions are named by, `label` or Actions. */
export const speedDialName: Derivation = (props) => wordIn(props, TAG, 'label', 'label', 'Actions')

/**
 * `speed-dial-hold-hint`: the words the trigger is described by under
 * `open-on="long-press"`, `long-press-label` or the words registered for
 * it, and none otherwise.
 */
export const speedDialHoldHint: Derivation = (props) =>
  speedDialHolds(props) === true
    ? wordIn(props, TAG, 'long-press-label', 'longPressLabel', SPEED_DIAL_LONG_PRESS)
    : ''

/** Whether the reader's keyboard is Apple's, as `kbd-keys` reads it. */
const apple = (): boolean => {
  const { platform } = environment().read()
  return platform === 'ios' || (platform === 'web' && onApple())
}

/**
 * `speed-dial-shortcut`: an action's shortcut as the reader's keyboard
 * labels it, `⌘S` on an Apple keyboard and `Ctrl+S` elsewhere, or nothing.
 */
export const speedDialShortcut: Derivation = (props) => {
  const shortcut = textOf(props.shortcut).trim()
  if (shortcut === '') {
    return ''
  }
  const drawn = keyNames(chordParts(shortcut), apple())
  return drawn.keys.join(drawn.separator)
}

/** `speed-dial-shows-shortcut`: whether an action draws a shortcut, as its `shortcut` names one. */
export const speedDialShowsShortcut: Derivation = (props) => textOf(props.shortcut).trim() !== ''

/**
 * `speed-dial-group-named`: whether a group of actions has a name: words
 * in its `label`, or content passed into it, which a phone passes in the
 * same prop.
 */
export const speedDialGroupNamed: Derivation = (props) =>
  typeof props.label === 'string' ? props.label !== '' : holdsRows(props.label)

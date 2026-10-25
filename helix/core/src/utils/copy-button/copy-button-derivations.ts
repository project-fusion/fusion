/**
 * Copy Button's derivations: the words it is named by at rest, once a copy is
 * confirmed, and once a press put nothing on the clipboard, in the words
 * registered for its language, and whether it draws a tooltip, as the web
 * copy button works them out.
 */
import { lookupWord } from '../../words/registry.js'
import type { Derivation, DerivationProps } from '../derivations/derivations.js'
import { textOf } from '../number-format/props.js'

/** The tag a copy button's words are registered under. */
const TAG = 'helix-copy-button'

/**
 * A word: the prop's own where it is not the English default, then the one
 * registered for the button's language under `key`, then the English.
 */
const wordOf = (props: DerivationProps, prop: string, key: string, english: string): string => {
  const own = textOf(props[prop])
  if (props[prop] !== undefined && own !== english) {
    return own
  }
  const registered = lookupWord(textOf(props.locale) || 'en', TAG, key)?.[0]
  return typeof registered === 'string' ? registered : english
}

/**
 * `copy-button-name`: what the button is named by before a copy: its
 * `aria-label`, then `label` or the word registered for it, Copy.
 */
export const copyButtonName: Derivation = (props) =>
  textOf(props['aria-label']).trim() || wordOf(props, 'label', 'label', 'Copy')

/** `copy-button-copied`: its name once a copy is confirmed, `copied-label` or Copied. */
export const copyButtonCopied: Derivation = (props) =>
  wordOf(props, 'copied-label', 'copiedLabel', 'Copied')

/** `copy-button-failed`: its name once a press put nothing on the clipboard, `error-label`. */
export const copyButtonFailed: Derivation = (props) =>
  wordOf(props, 'error-label', 'errorLabel', 'Could not copy')

/** `copy-button-tips`: whether it draws its tooltip, which `tooltip="none"` takes away. */
export const copyButtonTips: Derivation = (props) => textOf(props.tooltip) !== 'none'

/**
 * Announcement's derivations: the name of its region and of its dismiss
 * button, in the words registered for its language, and the words of its
 * message, which a screen reader is told as it arrives and its dismissal
 * says it was.
 */
import { lookupWord } from '../../words/registry.js'
import type { Derivation } from '../derivations/derivations.js'
import { textOf } from '../number-format/props.js'
import { contentWords } from '../remove-name/remove-name.js'

/** The tag an announcement's words are registered under. */
const TAG = 'helix-announcement'

/** The English the region is named by. */
export const ANNOUNCEMENT_LABEL = 'Announcement'

/** The English the dismiss button is named by. */
export const ANNOUNCEMENT_DISMISS_LABEL = 'Dismiss'

/**
 * A word: the prop's own where it is not the English default, then the one
 * registered for the announcement's language, then the English.
 */
const wordOf = (
  props: Readonly<Record<string, unknown>>,
  prop: string,
  key: string,
  english: string,
): string => {
  const own = textOf(props[prop])
  if (own !== english && props[prop] !== undefined) {
    return own
  }
  const registered = lookupWord(textOf(props.locale) || 'en', TAG, key)?.[0]
  return typeof registered === 'string' ? registered : english
}

/** `announcement-label`: the region's name, `label`, or the word registered for it. */
export const announcementLabel: Derivation = (props) =>
  wordOf(props, 'label', 'label', ANNOUNCEMENT_LABEL)

/**
 * `announcement-role`: `region` while the announcement has a name, and none
 * once `label` is empty, as the web leaves it no region.
 */
export const announcementRole: Derivation = (props) =>
  String(announcementLabel(props) ?? '').trim() === '' ? '' : 'region'

/** `announcement-dismiss-name`: the dismiss button's name, `dismiss-label`, or its registered word. */
export const announcementDismissName: Derivation = (props) =>
  wordOf(props, 'dismiss-label', 'dismissLabel', ANNOUNCEMENT_DISMISS_LABEL)

/** `announcement-words`: the words of the message, without its actions. */
export const announcementWords: Derivation = (props) => contentWords(props.default).trim()

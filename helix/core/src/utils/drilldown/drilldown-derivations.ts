/**
 * The derivations of the families that show a collection of rows, as
 * Drilldown and Menu do: what a screen reader hears in place of rows while
 * they load or where there are none, and the words each family's own names
 * take, in the words registered for its language, as the web elements work
 * them out.
 */
import { lookupWord } from '../../words/registry.js'
import type { Derivation, DerivationProps } from '../derivations/derivations.js'
import { textOf } from '../number-format/props.js'

/**
 * A word: the prop's own where it is not the English default, then the one
 * registered for the element's language under `tag`, then the English.
 */
export const wordIn = (
  props: DerivationProps,
  tag: string,
  prop: string,
  key: string,
  english: string,
): string => {
  const own = textOf(props[prop])
  if (props[prop] !== undefined && own !== english) {
    return own
  }
  const registered = lookupWord(textOf(props.locale) || 'en', tag, key)?.[0]
  return typeof registered === 'string' ? registered : english
}

/** Whether content passed into a region holds anything: a node, or words. */
export const holdsRows = (content: unknown): boolean => {
  if (Array.isArray(content)) {
    return content.some(holdsRows)
  }
  return content !== undefined && content !== null && content !== false && content !== ''
}

/**
 * What a collection says in place of its rows, as the web's collection
 * mixin says it in its live region: the loading words while it loads, the
 * empty words where no row is passed in, and nothing otherwise.
 */
export const collectionWords = (props: DerivationProps, tag: string): string => {
  if (props.loading === true) {
    return wordIn(props, tag, 'loading-text', 'loadingText', 'Loading')
  }
  return holdsRows(props.default)
    ? ''
    : wordIn(props, tag, 'empty-text', 'emptyText', 'Nothing to show')
}

/** The tag a drilldown's words are registered under. */
const TAG = 'helix-drilldown'

/** `drilldown-status`: what a drilldown says in place of its rows. */
export const drilldownStatus: Derivation = (props) => collectionWords(props, TAG)

/** `drilldown-loading`: the words a drilldown shows while its rows load. */
export const drilldownLoading: Derivation = (props) =>
  wordIn(props, TAG, 'loading-text', 'loadingText', 'Loading')

/** `drilldown-empty`: the words a drilldown shows where it holds no rows. */
export const drilldownEmpty: Derivation = (props) =>
  wordIn(props, TAG, 'empty-text', 'emptyText', 'Nothing to show')

/** `drilldown-back-name`: what the way back is named by, `back-label` or Back. */
export const drilldownBackName: Derivation = (props) =>
  wordIn(props, TAG, 'back-label', 'backLabel', 'Back')

/** `drilldown-name`: what the drilldown is named by, `label` or Navigation. */
export const drilldownName: Derivation = (props) =>
  wordIn(props, TAG, 'label', 'label', 'Navigation')

/**
 * `drilldown-landmark`: the host's role, a navigation landmark under
 * `navigation`, and none otherwise, where its page is the menu.
 */
export const drilldownLandmark: Derivation = (props) =>
  props.navigation === true ? 'navigation' : ''

/** `drilldown-landmark-name`: the landmark's name under `navigation`, and none otherwise. */
export const drilldownLandmarkName: Derivation = (props) =>
  props.navigation === true ? (drilldownName(props) as string) : ''

/** `drilldown-top-name`: the top page's name, the drilldown's own unless it is a landmark. */
export const drilldownTopName: Derivation = (props) =>
  props.navigation === true ? '' : (drilldownName(props) as string)

/** `drilldown-page-role`: a page's role, a list under `navigation` and a menu otherwise. */
export const drilldownPageRole: Derivation = (props) =>
  props.navigation === true ? 'list' : 'menu'

/**
 * Whether a drilldown row is a link: it has an `href`, is not disabled, and
 * holds no page, as the web's row draws an anchor.
 */
const linkedRow = (props: DerivationProps): boolean =>
  textOf(props.href) !== '' && props.disabled !== true && !holdsRows(props.page)

/**
 * `drilldown-item-role`: a row's role, a menu item, or under a drilldown's
 * `navigation`, which writes the row `listed`, a link or a button.
 */
export const drilldownItemRole: Derivation = (props) => {
  if (props.listed !== true) {
    return 'menuitem'
  }
  return linkedRow(props) ? 'link' : 'button'
}

/** `drilldown-item-host-role`: a row's own role, a list item where it is `listed`, and none otherwise. */
export const drilldownItemHostRole: Derivation = (props) =>
  props.listed === true ? 'listitem' : ''

/** `drilldown-item-popup`: what a row that opens a page says it opens, a menu, where it is not `listed`. */
export const drilldownItemPopup: Derivation = (props) =>
  holdsRows(props.page) && props.listed !== true ? 'menu' : ''

/**
 * Dialog's and Drawer's derivations: how a reader may dismiss each, what
 * each is named, and its close control's name, in the words registered for
 * its language, as the web elements work them out.
 */
import { lookupWord } from '../../words/registry.js'
import type { Derivation, DerivationProps } from '../derivations/derivations.js'
import { textOf } from '../number-format/props.js'
import { contentWords } from '../remove-name/remove-name.js'

/** The English a close control is named by, on a dialog and on a drawer. */
export const OVERLAY_DISMISS_LABEL = 'Close'

/** How a reader may dismiss a layer, as `<dialog closedby>` names it. */
const CLOSED_BY: ReadonlySet<string> = new Set(['any', 'closerequest', 'none'])

/**
 * A word: the prop's own where it is not the English default, then the one
 * registered for the element's language under `tag`, then the English.
 */
const wordOf = (
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

/**
 * The name: `label`, then the words of the title passed into `header`, then
 * `fallback-label` or the word registered for it, as the web names the
 * panel by its `label`, its heading, and its fallback in that order.
 */
const nameOf = (props: DerivationProps, tag: string, english: string): string =>
  textOf(props.label).trim() ||
  contentWords(props.header).trim() ||
  wordOf(props, tag, 'fallback-label', 'fallbackLabel', english)

/** `closedby` where it names one of the three, and nothing otherwise. */
const askedOf = (props: DerivationProps): string | undefined => {
  const asked = textOf(props.closedby)
  return CLOSED_BY.has(asked) ? asked : undefined
}

/**
 * `dialog-dismissal`: how a reader may dismiss a dialog. `persistent` is
 * `none`, then `closedby`, and `any` where it names none, as the web's
 * dialog closes on a press on its scrim with no `closedby`.
 */
export const dialogDismissal: Derivation = (props) =>
  props.persistent === true ? 'none' : (askedOf(props) ?? 'any')

/** `dialog-name`: a dialog's name, as `nameOf` says. */
export const dialogName: Derivation = (props) => nameOf(props, 'helix-dialog', 'Dialog')

/**
 * `dialog-said`: what a phone says as a dialog opens: its name, and for an
 * alert dialog the words passed into its body as well, as a screen reader
 * announces an alert dialog with its description on the web.
 */
export const dialogSaid: Derivation = (props) => {
  const name = String(dialogName(props) ?? '')
  const words = props.alert === true ? contentWords(props.default).trim() : ''
  return words === '' ? name : `${name}. ${words}`
}

/** `dialog-dismiss-name`: a dialog's close control's name, `dismiss-label` or its registered word. */
export const dialogDismissName: Derivation = (props) =>
  wordOf(props, 'helix-dialog', 'dismiss-label', 'dismissLabel', OVERLAY_DISMISS_LABEL)

/**
 * `drawer-dismissal`: how a reader may dismiss a drawer. `persistent` is
 * `none`, then `closedby`, and where it names none, `any` for a modal
 * drawer and `closerequest` for one that is not, which a press outside
 * leaves open, as on the web.
 */
export const drawerDismissal: Derivation = (props) =>
  props.persistent === true
    ? 'none'
    : (askedOf(props) ?? (modeless(props) ? 'closerequest' : 'any'))

/** Whether a drawer is not modal: `modal` false, or the attribute's `"false"`. */
const modeless = (props: DerivationProps): boolean =>
  props.modal === false || textOf(props.modal) === 'false'

/** The edges a drawer comes from, as its `placement` names them. */
const EDGES: ReadonlySet<string> = new Set(['bottom', 'end', 'start', 'top'])

/** `drawer-edge`: the edge a drawer comes from, `end` where its `placement` names none. */
export const drawerEdge: Derivation = (props) => {
  const placement = textOf(props.placement)
  return EDGES.has(placement) ? placement : 'end'
}

/** `drawer-name`: a drawer's name, as `nameOf` says. */
export const drawerName: Derivation = (props) => nameOf(props, 'helix-drawer', 'Drawer')

/** `drawer-dismiss-name`: a drawer's close control's name, `dismiss-label` or its registered word. */
export const drawerDismissName: Derivation = (props) =>
  wordOf(props, 'helix-drawer', 'dismiss-label', 'dismissLabel', OVERLAY_DISMISS_LABEL)

/**
 * `popover-name`: a popover's name, `label`, then `fallback-label` or the word
 * registered for it. The web names the panel by its first heading between
 * the two, which a phone has no document to find.
 */
export const popoverName: Derivation = (props) =>
  textOf(props.label).trim() ||
  wordOf(props, 'helix-popover', 'fallback-label', 'fallbackLabel', 'Popover')

/**
 * `tooltip-hint`: the words a tooltip says of its trigger, those of
 * `content`, as a string or as the content passed into it.
 */
export const tooltipHint: Derivation = (props) => contentWords(props.content)

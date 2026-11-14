/**
 * Menu's derivations: how its trigger opens it, the words it and its rows
 * are named and described by, in the words registered for its language,
 * which columns a page of rows keeps open, and what a row is, as the web
 * elements work them out.
 */
import type { Derivation, DerivationProps } from '../derivations/derivations.js'
import { holdsRows, wordIn } from '../drilldown/drilldown-derivations.js'
import { kindOf, roleOf } from '../menu-items/menu-items.js'
import { textOf } from '../number-format/props.js'
import { speedDialGroupNamed } from '../speed-dial/speed-dial-derivations.js'

/** The tag a menu's words are registered under. */
const TAG = 'helix-menu'

/** The English a trigger that opens the menu on a long press is described by. */
export const MENU_LONG_PRESS = 'Long press or press Alt+Down to show the menu'

/** The props of an element passed in, where it is one. */
const propsOf = (node: unknown): DerivationProps | undefined => {
  const props = (node as { props?: unknown } | null)?.props
  return typeof props === 'object' && props !== null ? (props as DerivationProps) : undefined
}

/** The elements passed into a region, flattened. */
const elementsIn = (content: unknown): DerivationProps[] => {
  if (Array.isArray(content)) {
    return content.flatMap(elementsIn)
  }
  const props = propsOf(content)
  return props === undefined ? [] : [props]
}

/** Whether an element passed in is a row: it says a value, a page, or a kind a row has. */
const isRow = (props: DerivationProps): boolean =>
  props.submenu !== undefined ||
  props.checkable !== undefined ||
  props.checked !== undefined ||
  props.exclusive !== undefined ||
  props.value !== undefined ||
  props.href !== undefined ||
  props.shortcut !== undefined

/** Whether an element passed in is a section: it holds rows and names itself by `label`. */
const isSection = (props: DerivationProps): boolean =>
  !isRow(props) && elementsIn(props.children).some(isRow)

/** The rows of the top page that stand outside a section. */
const looseRows = (props: DerivationProps): DerivationProps[] =>
  elementsIn(props.default).filter((one) => !isSection(one))

/** Every row of the top page, read through each section. */
const topRows = (props: DerivationProps): DerivationProps[] =>
  elementsIn(props.default).flatMap((one) =>
    isSection(one) ? elementsIn(one.children).filter(isRow) : [one],
  )

/** Whether a row has something before its label. */
const starts = (row: DerivationProps): boolean => holdsRows(row.start)

/** Whether a row can be ticked or opens a page, which is the trailing column. */
const marks = (row: DerivationProps): boolean =>
  holdsRows(row.submenu) ||
  kindOf({
    checkable: row.checkable === true,
    checked: row.checked === true,
    exclusive: row.exclusive === true,
  }) !== 'command'

/** `menu-context`: whether the menu is its trigger's context menu, under `context`. */
export const menuContext: Derivation = (props) => props.context === true

/**
 * `menu-holds`: whether a long press on the trigger opens the menu, under
 * `open-on="long-press"` and as a context menu, which a phone opens on a
 * long press as the web opens one on a held touch.
 */
export const menuHolds: Derivation = (props) =>
  props.context === true || textOf(props['open-on']) === 'long-press'

/** `menu-presses`: what a press on the trigger does, `toggle`, or `none` where a long press opens it. */
export const menuPresses: Derivation = (props) => (menuHolds(props) === true ? 'none' : 'toggle')

/** `menu-arrows`: whether Down and Up on the trigger open the menu, which they do but on a context menu. */
export const menuArrows: Derivation = (props) => props.context !== true

/**
 * `menu-hold-hint`: the words the trigger is described by under
 * `open-on="long-press"`, `long-press-label` or the words registered for
 * it, and none otherwise.
 */
export const menuHoldHint: Derivation = (props) =>
  props.context !== true && textOf(props['open-on']) === 'long-press'
    ? wordIn(props, TAG, 'long-press-label', 'longPressLabel', MENU_LONG_PRESS)
    : ''

/** `menu-back-name`: what the way back is named by, `back-label` or Back. */
export const menuBackName: Derivation = (props) =>
  wordIn(props, TAG, 'back-label', 'backLabel', 'Back')

/** `menu-name`: what the top page is named by, its `label`, or none. */
export const menuName: Derivation = (props) => textOf(props.label)

/** `menu-loading`: the words a menu shows while its rows load. */
export const menuLoading: Derivation = (props) =>
  wordIn(props, TAG, 'loading-text', 'loadingText', 'Loading')

/** `menu-empty`: the words a menu shows where it holds no rows. */
export const menuEmpty: Derivation = (props) =>
  wordIn(props, TAG, 'empty-text', 'emptyText', 'Nothing to show')

/**
 * `menu-status`: what a menu says in place of its rows, its loading words
 * while it loads, its empty words with no rows, and nothing otherwise.
 */
export const menuStatus: Derivation = (props) => {
  if (props.loading === true) {
    return menuLoading(props)
  }
  return holdsRows(props.default) ? '' : menuEmpty(props)
}

/** `menu-start`: whether a row of the top page outside a section has something before its label. */
export const menuStart: Derivation = (props) => looseRows(props).some(starts)

/** `menu-mark`: whether a row of the top page can be ticked or opens a page. */
export const menuMark: Derivation = (props) => topRows(props).some(marks)

/** `menu-section-start`: whether a row in a section has something before its label. */
export const menuSectionStart: Derivation = (props) =>
  elementsIn(props.default).filter(isRow).some(starts)

/** `menu-section-named`: whether a section has a heading: words in its `label`, or content passed into `heading`. */
export const menuSectionNamed: Derivation = (props) =>
  speedDialGroupNamed({ ...props, label: props.heading ?? props.label })

/** `menu-item-role`: a row's role, a menu item, a checkbox, or a radio, as core's kind says. */
export const menuItemRole: Derivation = (props) =>
  roleOf(
    kindOf({
      checkable: props.checkable === true,
      checked: props.checked === true,
      exclusive: props.exclusive === true,
    }),
  )

/** `menu-item-ends`: whether a row draws its trailing words: a shortcut, or words passed into `end`. */
export const menuItemEnds: Derivation = (props) =>
  textOf(props.shortcut).trim() !== '' || holdsRows(props.end)

/** `menu-item-submenu-start`: whether a row of a row's page has something before its label. */
export const menuItemSubmenuStart: Derivation = (props) =>
  elementsIn(props.submenu).filter(isRow).some(starts)

/** `menu-item-submenu-mark`: whether a row of a row's page can be ticked or opens a page. */
export const menuItemSubmenuMark: Derivation = (props) =>
  elementsIn(props.submenu).filter(isRow).some(marks)

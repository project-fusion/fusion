/**
 * The values an element computes from its props: the private values a style
 * table reads through `derived()`, and the words a part tree's node takes
 * through `derive()`.
 *
 * **Each export is one derivation, named as `helix family` names it.** The
 * intermediate form carries the function's name, and the native runtime calls
 * the export of that name with the element's props. `helix family` refuses a
 * `derived()` or a `derive()` whose name it does not map to an export here,
 * and its specs hold each mapped name to an export of this module.
 */

import { environment } from '../../capabilities/environment/index.js'
import { badgeMark } from '../badge-count/badge-props.js'
import { foldedCrumb } from '../breadcrumbs/breadcrumbs-derivations.js'
import { chordParts } from '../chord/chord.js'
import { type KeyNames, keyNames } from '../chord/key-names.js'
import { gridTracks } from '../grid-template/grid-template.js'
import { formatNumber } from '../number-format/number-format.js'
import { numberOf, numberOptions, textOf } from '../number-format/props.js'
import { onApple } from '../platform/platform.js'
import { removeName } from '../remove-name/remove-name.js'
import { trendReading } from '../trend-figure/trend-props.js'

/* Accordion's, where a section's chevron stands. */
export * from '../accordion/accordion-derivations.js'
/* Announcement's, its names and the words of its message. */
export * from '../announcement/announcement-derivations.js'
/* App Header's, whether its middle region folds and where its toggle stands. */
export * from '../app-header/app-header-derivations.js'
/* Avatar's, its initials and what a screen reader hears of it. */
export * from '../avatar/avatar.js'
/* Breadcrumbs', the words that name a fold and the crumbs it folded. */
export * from '../breadcrumbs/breadcrumbs-derivations.js'
/* Callout's, its tone's mark and word and its dismissal's words. */
export * from '../callout/callout-derivations.js'
/* Copy Button's, the words it is named by as a copy stands. */
export * from '../copy-button/copy-button-derivations.js'
/* Drilldown's, and what a collection says in place of its rows. */
export * from '../drilldown/drilldown-derivations.js'
/* Format Date's, its words and the clock it keeps, from its props and `now`. */
export * from '../format-date/format-date.js'
/* Megamenu's, whether its panel holds the page and whether the window is narrow. */
export * from '../megamenu/megamenu-derivations.js'
/* Menu's, how its trigger opens it, its words, its columns, and a row's role. */
export * from '../menu/menu-derivations.js'
/* Dialog's and Drawer's, how each is dismissed and named. */
export * from '../overlay/overlay-derivations.js'
/* QR Code's, which draw the code from its value. */
export * from '../qr-code/qr-derivations.js'
/* Meter's, Progress's and Skeleton's, each one derivation. */
export * from '../range-reading/indicator-derivations.js'
/* Speed Dial's, its long press, its names, and an action's shortcut. */
export * from '../speed-dial/speed-dial-derivations.js'
/* Timeline's, an entry's mark and its reading of how long ago. */
export * from '../timeline/timeline-derivations.js'
/* Toast's, its stack's name and edge, and each message's mark, words, and names. */
export * from '../toast/toast-derivations.js'
/* Tour's, what a stop is placed against and the edge a floating stop stands along. */
export * from '../tour/tour-derivations.js'

/** The props a derivation reads, by the web element's property or attribute names. */
export type DerivationProps = Readonly<Record<string, unknown>>

/**
 * A value from an element's props: words, whether something holds, or
 * `undefined` where they ask for none.
 */
export type Derivation = (props: DerivationProps) => boolean | string | undefined

/** One entry of a list a derivation computes: its fields, by name. */
export type Entry = Readonly<Record<string, boolean | number | string>>

/**
 * A list from an element's props, of which a part tree's `repeat` draws a
 * copy of what it holds for each entry, as its `each` reads it.
 */
export type ListDerivation = (props: DerivationProps) => readonly Entry[]

/** `grid-template`: the track list a grid's `min` or `columns` asks for. */
export const gridTemplate: Derivation = (props) => gridTracks(props.min, props.columns)

/**
 * Whether the reader's keyboard is Apple's: an iPhone or an iPad on a phone,
 * and a Mac or an iPad's browser on the web.
 */
const apple = (): boolean => {
  const { platform } = environment().read()
  return platform === 'ios' || (platform === 'web' && onApple())
}

/** Names for keys, as an object or as the JSON the web's attribute holds. */
const labelsOf = (labels: unknown): Readonly<Record<string, string>> => {
  if (typeof labels === 'string') {
    try {
      return labels.trim() === '' ? {} : labelsOf(JSON.parse(labels))
    } catch {
      return {}
    }
  }
  if (typeof labels !== 'object' || labels === null || Array.isArray(labels)) {
    return {}
  }
  return Object.fromEntries(
    Object.entries(labels).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  )
}

/** A key's chord as the reader's keyboard labels it, or `undefined` where it has no `keys`. */
const chordOf = (props: DerivationProps): KeyNames | undefined =>
  typeof props.keys === 'string' && props.keys.trim() !== ''
    ? keyNames(chordParts(props.keys), apple(), labelsOf(props['key-labels'] ?? props.keyLabels))
    : undefined

/** `kbd-keys`: a key's chord as it is drawn, `⌘K` on an Apple keyboard and `Ctrl+K` elsewhere. */
export const kbdKeys: Derivation = (props) => {
  const chord = chordOf(props)
  return chord === undefined ? undefined : chord.keys.join(chord.separator)
}

/**
 * `kbd-key-list`: each key of a chord as it is drawn, with the separator
 * drawn before it, as the web draws a key part per key with a separator
 * part between two. `key` is the key, `said` is the key in words, such as
 * `Command` for `⌘`, `separator` is empty for the first, and `at` keys each
 * by its place, since a chord may name a key twice.
 */
export const kbdKeyList: ListDerivation = (props) => {
  const chord = chordOf(props)
  return (chord?.keys ?? []).map((key, at) => ({
    at: String(at),
    key,
    said: chord?.words[at] ?? key,
    separator: at === 0 ? '' : (chord?.separator ?? ''),
  }))
}

/** `breadcrumb-fold-items`: the crumbs a trail folded after its first, each its link and its words. */
export const breadcrumbFoldItems: ListDerivation = (props) => {
  const crumbs = props['fold-crumbs']
  return Array.isArray(crumbs) ? crumbs.map(foldedCrumb) : []
}

/**
 * `kbd-words`: a key's chord as a screen reader says it, `Command K` where
 * it is drawn in glyphs, and as it is drawn where it is drawn in words.
 */
export const kbdWords: Derivation = (props) => {
  const chord = chordOf(props)
  if (chord === undefined) {
    return undefined
  }
  return chord.spoken === '' ? chord.keys.join(chord.separator) : chord.spoken
}

/* A badge's mark, from its `value`, `max`, `format-options`, `label`,
   `locale` and `icon`, as `badgeMark` works it out for the web element. */

/** `badge-blank`: whether the value counts nothing, so there is no mark. */
export const badgeIsBlank: Derivation = (props) => badgeMark(props).blank

/** `badge-capped`: whether the count is past `max`, so the mark shows `{max}+`. */
export const badgeIsCapped: Derivation = (props) => badgeMark(props).capped

/** `badge-dot`: whether there is no value and no icon, so the mark is a dot. */
export const badgeIsDot: Derivation = (props) => badgeMark(props).dot

/** `badge-single`: whether the mark shows one character or none, so it is a circle. */
export const badgeIsSingle: Derivation = (props) => badgeMark(props).single

/** `badge-text`: what the mark shows, `{max}+` past `max`. */
export const badgeShows: Derivation = (props) => badgeMark(props).text

/** `badge-unset`: whether there is no value at all. */
export const badgeIsUnset: Derivation = (props) => badgeMark(props).unset

/** `badge-words`: what a reader hears for the mark, or nothing. */
export const badgeSays: Derivation = (props) => badgeMark(props).words

/* A trend, from its `movement`, `direction`, `value`, `good`, words,
   `format-options` and `locale`, as `trendReading` works it out. */

/** `trend-better`: whether it moved the way `good` names. */
export const trendIsBetter: Derivation = (props) => trendReading(props).better

/** `trend-down`: whether it moved down. */
export const trendIsDown: Derivation = (props) => trendReading(props).down

/** `trend-figure`: the change `value` writes, or nothing where it is no number. */
export const trendFigure: Derivation = (props) => trendReading(props).figure

/** `trend-said`: the movement in words, judged where `good` judges it. */
export const trendSays: Derivation = (props) => trendReading(props).said

/** `trend-up`: whether it moved up. */
export const trendIsUp: Derivation = (props) => trendReading(props).up

/** `trend-worse`: whether it moved against the way `good` names. */
export const trendIsWorse: Derivation = (props) => trendReading(props).worse

/**
 * `stat-figure`: a stat's `value` written with `format-options`, as an
 * object or as JSON, in `locale`, or nothing where it is no number.
 */
export const statFigure: Derivation = (props) => {
  const value = numberOf(props.value)
  return value === undefined
    ? ''
    : formatNumber(value, textOf(props.locale), numberOptions(props['format-options']))
}

/**
 * `loader-name`: what a loader is named while work is in progress, its
 * `label`, and nothing while it is `idle`, when it draws nothing of its own.
 */
export const loaderName: Derivation = (props) =>
  props.idle === true ? undefined : textOf(props.label) || undefined

/** `loader-role`: `progressbar` while work is in progress, and nothing while a loader is `idle`. */
export const loaderRole: Derivation = (props) => (props.idle === true ? undefined : 'progressbar')

/** `stat-label-last`: whether a stat draws its label after the figure, under `column-reverse`. */
export const statLabelLast: Derivation = (props) => props.direction === 'column-reverse'

/**
 * `step-said`: what a step's name is read with beside its words, its
 * `complete-label` while it is complete, as the web describes the name by
 * it, or nothing.
 */
export const stepSays: Derivation = (props) => {
  const label = props['complete-label']
  return props.complete === true ? (typeof label === 'string' ? label : 'Complete') : undefined
}

/**
 * `tag-remove-name`: what a screen reader hears a tag's remove button as,
 * `dismiss-label` with the tag's words, its category first, such as "Remove
 * Apple".
 */
export const tagRemoveName: Derivation = (props) => removeName(props)

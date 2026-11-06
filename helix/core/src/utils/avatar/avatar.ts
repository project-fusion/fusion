/**
 * Avatar's words and the values a phone draws it from: the initials a name
 * gives, and what a screen reader hears of the avatar.
 */

import { formatMessage } from '../../words/message.js'
import type { Derivation } from '../derivations/derivations.js'
import { textOf } from '../number-format/props.js'

/**
 * Initials for a name: the first letter of the first and last words, by
 * code point, so a name that starts with a letter outside the basic plane
 * keeps it whole.
 */
export const initialsOf = (name: string): string => {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) {
    return ''
  }
  const initial = (word: string | undefined): string => [...(word ?? '')][0] ?? ''
  const first = initial(words[0])
  const last = words.length > 1 ? initial(words[words.length - 1]) : ''
  return (first + last).toUpperCase()
}

/** The children passed into a region, as a list, nested lists flattened. */
const childrenOf = (region: unknown): unknown[] =>
  Array.isArray(region)
    ? region.flatMap(childrenOf)
    : region === undefined || region === null || region === false || region === ''
      ? []
      : [region]

/** How many of a group's avatars fold past its `max`. */
const foldedOf = (props: Readonly<Record<string, unknown>>): unknown[] => {
  const max = Number(props.max)
  return Number.isFinite(max) && max > 0 ? childrenOf(props.default).slice(Math.floor(max)) : []
}

/** `avatar-group-folds`: whether a group folds any avatar past its `max` into a count. */
export const avatarGroupFolds: Derivation = (props) => foldedOf(props).length > 0

/** `avatar-group-count`: the count drawn for the avatars past `max`, `+3`. */
export const avatarGroupCount: Derivation = (props) => `+${foldedOf(props).length}`

/**
 * `avatar-group-overflow-name`: what a screen reader hears of the count:
 * `overflow-label` with the count and the names of those it stands for, in
 * a short list in `locale`, without a separator left at its end.
 */
export const avatarGroupOverflowName: Derivation = (props) => {
  const folded = foldedOf(props)
  const locale = textOf(props.locale) || 'en'
  const names = folded
    .map((child) => (child as { props?: { name?: unknown } }).props?.name)
    .filter((name): name is string => typeof name === 'string' && name !== '')
  const label =
    textOf(props['overflow-label']) ||
    '{count, plural, one {# more: {names}} other {# more: {names}}}'
  return formatMessage(
    label,
    {
      count: folded.length,
      names: new Intl.ListFormat(locale, { style: 'short', type: 'unit' }).format(names),
    },
    locale,
  ).replace(/[\s:,]+$/, '')
}

/** `avatar-initials`: the avatar's `initials`, or those its `name` gives. */
export const avatarInitials: Derivation = (props) =>
  typeof props.initials === 'string' ? props.initials : initialsOf(textOf(props.name))

/** `avatar-role`: `img` while the avatar has a name to carry, and nothing otherwise. */
export const avatarRole: Derivation = (props) => (textOf(props.name) === '' ? undefined : 'img')

/**
 * `avatar-delays`: whether the initials wait out `fallback-delay` while a
 * picture is on its way. With no delay, a picture on its way shows nothing
 * in its place until it loads or fails.
 */
export const avatarDelays: Derivation = (props) =>
  props['fallback-delay'] !== undefined &&
  props['fallback-delay'] !== null &&
  textOf(props.src) !== ''

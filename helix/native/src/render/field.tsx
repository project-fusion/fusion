/**
 * Text a `field` node holds: React Native's own `TextInput`, with the
 * keyboard, the Enter key, autofill, and secure entry the web's attributes
 * ask for, as an `<input>` takes them on the web.
 */

import type { ReactNode } from 'react'
import { StyleSheet, TextInput, type TextInputProps } from 'react-native'
import type { Node } from '../style/form'
import type { Style } from '../style/resolved'
import { wrapped } from './behavior'
import { fieldSemantics } from './semantics'
import { bound, fromText, inherit, laid, resolve, type Scope, split } from './styles'

/** The keyboards a phone offers, by the web's `inputmode`. */
const MODES = new Set(['decimal', 'email', 'none', 'numeric', 'search', 'tel', 'text', 'url'])

/** The Enter keys a phone's keyboard shows, by the web's `enterkeyhint`. */
const ENTER_KEYS = new Set(['done', 'enter', 'go', 'next', 'previous', 'search', 'send'])

/**
 * What a field's `type` asks of a phone's keyboard: the keyboard, whether
 * it capitalizes and corrects, and whether it hides what is typed, as a
 * browser's keyboard does for each type.
 */
const BY_TYPE: Readonly<Record<string, TextInputProps>> = {
  email: { autoCapitalize: 'none', autoCorrect: false, keyboardType: 'email-address' },
  number: { keyboardType: 'numeric' },
  password: { autoCapitalize: 'none', autoCorrect: false, secureTextEntry: true },
  search: { enterKeyHint: 'search', keyboardType: 'web-search' },
  tel: { keyboardType: 'phone-pad' },
  url: { autoCapitalize: 'none', autoCorrect: false, keyboardType: 'url' },
}

/** React Native's capitalization for the web's `autocapitalize`, where it names one. */
const capitalizing = (value: unknown): TextInputProps['autoCapitalize'] | undefined => {
  switch (value) {
    case 'off':
    case 'none':
      return 'none'
    case 'on':
    case 'sentences':
      return 'sentences'
    case 'words':
    case 'characters':
      return value
    default:
      return undefined
  }
}

/** A word bound on the node, or `''` where it binds none. */
const wordOf = (scope: Scope, node: Node, name: string): string => {
  const value = bound(scope, node.attributes?.[name], node.name)
  return typeof value === 'string' ? value : ''
}

/**
 * What the web's attributes ask of a phone's keyboard and autofill: the type
 * first, then `inputmode`, `enterkeyhint`, `autocapitalize`, `autocorrect`,
 * and `autocomplete`, each where it is written, as each overrides what the
 * type gives on the web.
 */
const keyboardOf = (scope: Scope, node: Node): TextInputProps => {
  const type = wordOf(scope, node, 'type')
  const mode = wordOf(scope, node, 'inputmode')
  const enter = wordOf(scope, node, 'enterkeyhint')
  const capital = capitalizing(wordOf(scope, node, 'autocapitalize'))
  const fill = wordOf(scope, node, 'autocomplete')
  const corrects = bound(scope, node.attributes?.autocorrect, node.name)
  const most = bound(scope, node.attributes?.maxlength, node.name)
  return {
    ...BY_TYPE[type],
    ...(MODES.has(mode) ? { inputMode: mode as TextInputProps['inputMode'] } : {}),
    ...(ENTER_KEYS.has(enter) ? { enterKeyHint: enter as TextInputProps['enterKeyHint'] } : {}),
    ...(capital === undefined ? {} : { autoCapitalize: capital }),
    ...(corrects === false ? { autoCorrect: false, spellCheck: false } : {}),
    ...(fill === '' ? {} : { autoComplete: fill as TextInputProps['autoComplete'] }),
    ...(typeof most === 'number' && most >= 0 ? { maxLength: most } : {}),
    ...(node.attributes?.multiline === true ? { multiline: true } : {}),
  }
}

/** A count a field binds, where it binds a whole number of at least one. */
const countOf = (scope: Scope, node: Node, name: string): number | undefined => {
  const value = bound(scope, node.attributes?.[name], node.name)
  const count = typeof value === 'string' && value !== '' ? Number(value) : value
  return typeof count === 'number' && Number.isInteger(count) && count >= 1 ? count : undefined
}

/**
 * How tall a field of several lines stands, as a `<textarea>` stands `rows`
 * lines tall. **A field that grows** takes its text's height from `rows`
 * lines up to `maxrows`, and scrolls past them, as the web's `auto-grow`
 * does. A field of one line takes the height its style gives.
 */
const linesOf = (
  scope: Scope,
  node: Node,
  drawn: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> => {
  if (node.attributes?.multiline !== true) {
    return {}
  }
  const size = typeof drawn.fontSize === 'number' ? drawn.fontSize : 16
  const line = typeof drawn.lineHeight === 'number' ? drawn.lineHeight : size * 1.2
  const rows = countOf(scope, node, 'rows') ?? 2
  const most = countOf(scope, node, 'maxrows')
  const grows = bound(scope, node.attributes?.grows, node.name) === true
  const tall = rows * line
  /* iOS sets a multiline `TextInput`'s words in from its top edge, where a
     stripped `<textarea>` has no padding: the part's own padding, or none. */
  const inset = {
    paddingBottom: drawn.paddingBottom ?? 0,
    paddingTop: drawn.paddingTop ?? 0,
  }
  if (!grows) {
    return { scrollEnabled: true, style: { ...inset, height: tall, textAlignVertical: 'top' } }
  }
  return {
    scrollEnabled: most !== undefined,
    style: {
      ...inset,
      minHeight: tall,
      ...(most === undefined ? {} : { maxHeight: Math.max(tall, most * line) }),
      textAlignVertical: 'top',
    },
  }
}

/**
 * Draws a field node: a `TextInput` in its part's style, its words in the
 * text style around it, and its placeholder in the color its `::placeholder`
 * rules give. The element's entry lays its text and its handlers over the
 * view. A screen reader reads it by its label, its hint, and whether it is
 * disabled.
 */
export const drawField = (scope: Scope, node: Node, text: Style): ReactNode => {
  const resolved = resolve(scope, node, fromText(text))
  const [box, words] = split(resolved.style)
  /* A line limit and a line breaking are a `Text`'s, which a field has no use for. */
  const { ellipsizeMode, lineBreakStrategyIOS, numberOfLines, textBreakStrategy, ...drawn } =
    (StyleSheet.flatten([box, inherit(text, words)]) ?? {}) as Readonly<Record<string, unknown>>
  const placeholder = wordOf(scope, node, 'placeholder')
  const color = resolved.placeholder?.color
  const { style: lines, ...scrolling } = linesOf(scope, node, drawn)
  /* **A field of one line takes no line height**, which iOS lays out from
     the top of a single-line `TextInput`, so its words sat below the middle
     of the box the web centers them in. */
  const { lineHeight, ...centered } = drawn
  const laidStyle = node.attributes?.multiline === true ? drawn : centered
  const view = laid(
    scope.behavior,
    node.name,
    {
      ...keyboardOf(scope, node),
      ...fieldSemantics(scope, node),
      ...(placeholder === '' ? {} : { placeholder }),
      ...(typeof color === 'string' ? { placeholderTextColor: color } : {}),
      /* The theme scales the words with the reader's text size already, as every `Text` it draws. */
      allowFontScaling: false,
      ...scrolling,
      style: { ...laidStyle, ...(lines as object | undefined) },
    },
    scope.item,
  )
  return wrapped(scope.behavior, node.name, <TextInput key={node.name} {...view} />, node.name)
}

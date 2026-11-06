/* The words and boxes the JSX runtime draws for the DOM elements shared code
   may hold, and the placeholder for a tag a phone has no component for. */
import {
  Density,
  densityOf,
  type SectionAbout,
  type Tokens,
  useInheritedText,
  useSection,
  useSlottedBox,
  useTarget,
  useTokens,
} from '@fusion.dev/helix-native'
import * as React from 'react'
import { Text, View } from 'react-native'

export type Props = Readonly<Record<string, unknown>> & { readonly children?: React.ReactNode }

/** A length token in points, as the theme holds it, or 0 where the theme has none. */
const points = (tokens: Tokens, name: string): number => {
  const value = tokens[name]
  return typeof value === 'number' ? value : 0
}

/** A color token as the theme holds it, in sRGB hex. */
const color = (tokens: Tokens, name: string): string => String(tokens[name] ?? '')

export const camel = (name: string): string =>
  name.replace(/-([a-z0-9])/g, (_, letter: string) => letter.toUpperCase())

/* **A size from the theme is already the reader's text size**, so the words
   that take one leave React Native's own scaling off. */

/** The margins of a box style, which words drawn as a line of their own take. */
const marginsOf = (box: Readonly<Record<string, unknown>>): Record<string, unknown> =>
  Object.fromEntries(Object.entries(box).filter(([key]) => key.startsWith('margin')))

/**
 * Words in the text style the region around gives, as a `span` inherits it,
 * and the margins the host's `::slotted(*)` rules give it, as a drawer's
 * title keeps a step clear of the content under it.
 */
export const Span = ({ children }: Props) => {
  const tokens = useTokens()
  const text = useInheritedText()
  const box = useSlottedBox()
  return React.createElement(
    Text,
    {
      allowFontScaling: false,
      style: [
        { color: color(tokens, 'color-foreground'), fontSize: points(tokens, 'text-md') },
        text,
        marginsOf(box),
      ],
    },
    children,
  )
}

/** A link's words. A press on a phone is the app's to handle. */
export const Anchor = ({ children }: Props) => {
  const tokens = useTokens()
  return React.createElement(
    Text,
    {
      allowFontScaling: false,
      style: {
        color: color(tokens, 'color-primary'),
        fontSize: points(tokens, 'text-md'),
        textDecorationLine: 'underline',
      },
    },
    children,
  )
}

/**
 * **A link to a fragment names its section**, by its words and its
 * `data-level`, as an outline's links do on the web, so the section drawn
 * after it registers under its id with those words for the outline a phone
 * draws.
 */
const FRAGMENTS = new Map<string, SectionAbout>()

export const noteFragment = (props: Props): void => {
  const href = props.href
  if (typeof href !== 'string' || !href.startsWith('#')) {
    return
  }
  const words = React.Children.toArray(props.children)
    .filter((child) => typeof child === 'string')
    .join('')
    .trim()
  const level = Number(props['data-level'])
  FRAGMENTS.set(href.slice(1), { label: words, ...(level >= 1 ? { level } : {}) })
}

/** A section with an id, which registers itself for the outline a phone draws. */
export const Section = ({ children, sectionId }: Props) => {
  const id = String(sectionId)
  const held = useSection(id, FRAGMENTS.get(id) ?? { label: id })
  return React.createElement(View, { ref: held }, worded(children))
}

/** Words drawn as words wherever a box holds them. */
const worded = (children: React.ReactNode): React.ReactNode[] =>
  React.Children.toArray(children).map((child, index) =>
    typeof child === 'string' || typeof child === 'number'
      ? React.createElement(Span, { key: `words-${index}` }, child)
      : child,
  )

/**
 * A box with no look of its own, as a `div` or a `form` is, at the density it
 * names, registered under its `id` where it has one.
 */
export const Box = (props: Props) => {
  const ref = useTarget(typeof props.id === 'string' ? props.id : undefined)
  return React.createElement(
    Density,
    { density: densityOf(props) },
    React.createElement(View, { ref }, worded(props.children)),
  )
}

/**
 * A tag a phone has no component for yet, said where it would be. **It
 * narrows for what stands beside it in a row**, which its sentence otherwise
 * pushed off the screen: Flex's "Jane Doe", beside the avatar a phone does not
 * draw, at iOS's largest text size in run 38957410938.
 */
export const Missing = ({ tag }: Props) => {
  const tokens = useTokens()
  return React.createElement(
    View,
    {
      style: {
        borderColor: color(tokens, 'color-border'),
        borderRadius: points(tokens, 'radii-sm'),
        borderStyle: 'dashed',
        borderWidth: 1,
        flexShrink: 1,
        padding: points(tokens, 'space-sm'),
      },
    },
    React.createElement(
      Text,
      {
        allowFontScaling: false,
        style: {
          color: color(tokens, 'color-foreground-muted'),
          fontSize: points(tokens, 'text-sm'),
        },
      },
      `<${String(tag)}> has no native version yet.`,
    ),
  )
}

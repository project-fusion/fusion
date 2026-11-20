/* The words and boxes the JSX runtime draws for the DOM elements shared code
   may hold, and the placeholder for a tag a phone has no component for. */
import {
  Density,
  densityOf,
  FieldsetDisabled,
  followLink,
  type SectionAbout,
  type Tokens,
  useInheritedText,
  useSection,
  useSlottedBox,
  useTarget,
  useTokens,
  useWrapWidth,
  vectorPackage,
} from '@fusion.dev/helix-native'
import * as React from 'react'
import { Pressable, Text, View } from 'react-native'

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

/**
 * The margins and the width of a box style, which words drawn as a line of
 * their own take: a width where they span every column of a grid, as a
 * meter's label is as wide as the row above its bar.
 */
const marginsOf = (box: Readonly<Record<string, unknown>>): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(box).filter(([key]) => key.startsWith('margin') || key === 'width'),
  )

/** The text style a quote, or a heading cell of a table, gives the words inside it. */
export const proseInk = React.createContext<Readonly<Record<string, string>>>({})

/**
 * Words in the text style the region around gives, as a `span` inherits it,
 * and the margins and the width the host's `::slotted(*)` rules give it, as a
 * drawer's title keeps a step clear of the content under it. Inside a part
 * that scrolls both ways, they wrap at its width.
 */
export const Span = ({ bold, children }: Props & { readonly bold?: boolean }) => {
  const tokens = useTokens()
  const text = useInheritedText()
  const box = useSlottedBox()
  /* Inside a part that scrolls both ways, the words wrap at its width, as
     a paragraph wraps at a scroll box's width on the web. */
  const wrap = useWrapWidth()
  const ink = React.useContext(proseInk)
  return React.createElement(
    Text,
    {
      allowFontScaling: false,
      style: [
        { color: color(tokens, 'color-foreground'), fontSize: points(tokens, 'text-md') },
        wrap === undefined ? {} : { maxWidth: wrap },
        text,
        ink,
        bold === true ? { fontWeight: '700' as const } : {},
        marginsOf(box),
      ],
    },
    children,
  )
}

/** Words a page marks as important, as a browser sets `strong` bolder than what is around it. */
export const Strong = ({ children }: Props) => React.createElement(Span, { bold: true }, children)

/** Each element in `children`, with the border color of a card a link marks as current. */
const currentCards = (children: React.ReactNode, border: string): React.ReactNode =>
  React.Children.map(children, (child) =>
    React.isValidElement<Props>(child)
      ? React.cloneElement(child, {
          style: {
            ...(child.props.style as Record<string, unknown> | undefined),
            '--card-border-color': border,
          },
        })
      : child,
  )

/** A press as a view sends it and as a Helix element sends it. */
type PressEvent =
  | { readonly defaultPrevented?: boolean; readonly isDefaultPrevented?: () => boolean }
  | undefined

/**
 * What a press on a link does: the page's own `onClick` first, then, unless
 * that prevents the default as it does on the web, the link's destination.
 */
export const linkPress =
  (props: Props) =>
  (given: unknown): void => {
    const event = given as PressEvent
    const heard = props.onPress
    if (typeof heard === 'function') {
      heard(event)
    }
    const prevented = event?.defaultPrevented === true || event?.isDefaultPrevented?.() === true
    if (typeof props.href === 'string' && !prevented) {
      followLink(props.href)
    }
  }

/**
 * A link's words, in the size the text around gives, and in its ink with no line
 * under `data-link="quiet"`, as a breadcrumb's link is. `data-card` is a box
 * around the card it holds, which gives way in a row, and `data-button` draws
 * in `tags.native.ts`. **A press opens its `href`**, as a browser follows one,
 * through `followLink`.
 *
 * **`aria-current` on a `data-card` gives the card its border color**, as the
 * web's `--card-border-color` reaches the card inside the link.
 */
export const Anchor = ({ children, ...props }: Props) => {
  const tokens = useTokens()
  const text = useInheritedText()
  const press = linkPress(props)
  const presses = props.href !== undefined || props.onPress !== undefined
  if (props['data-card'] !== undefined) {
    const held =
      props['aria-current'] === undefined
        ? children
        : currentCards(children, color(tokens, 'color-primary'))
    return React.createElement(
      Pressable,
      {
        accessibilityRole: 'link' as const,
        ...(presses ? { onPress: press } : {}),
        style: { flexShrink: 1 },
      },
      held,
    )
  }
  const quiet = props['data-link'] === 'quiet'
  return React.createElement(
    Text,
    {
      accessibilityRole: 'link' as const,
      allowFontScaling: false,
      ...(presses ? { onPress: press } : {}),
      style: [
        { fontSize: points(tokens, 'text-md') },
        text,
        quiet
          ? { color: text.color ?? color(tokens, 'color-foreground') }
          : { color: color(tokens, 'color-primary'), textDecorationLine: 'underline' as const },
      ],
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

/** A `legend`, which a fieldset around it finds among its children. */
export const Legend = (props: Props) => React.createElement(Box, props)

/**
 * **A `<fieldset disabled>` disables the form controls inside**, through a
 * context the controls read, as `:disabled` reaches them on the web. What its
 * first `legend` holds stays as the fieldset around it has it, as the HTML
 * standard says.
 */
export const Fieldset = ({ children, disabled, id }: Props) => {
  const outer = React.useContext(FieldsetDisabled)
  let legend = false
  const held = React.Children.map(children, (child) => {
    if (legend || !React.isValidElement(child) || child.type !== Legend) {
      return child
    }
    legend = true
    return React.createElement(FieldsetDisabled.Provider, { value: outer }, child)
  })
  return React.createElement(
    FieldsetDisabled.Provider,
    { value: outer || Boolean(disabled) },
    React.createElement(Box, { ...(typeof id === 'string' ? { id } : {}) }, held),
  )
}

/** The attributes of a shape a browser alone reads. */
const SVG_WEB = /^(aria[A-Z]|focusable$|role$|slot$|xmlns)/

/** The attributes `react-native-svg` takes, as the runtime has already written them in camel case. */
const svgAttributes = (props: Props): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(props).filter(([name]) => name !== 'children' && !SVG_WEB.test(name)),
  )

/**
 * **A raw `<svg>` draws through `react-native-svg`**, in the color of the words
 * around it, as `currentColor` reads them on the web. It takes the width and
 * the height its attributes give, then those the region gives its child, and
 * fills the box around it where neither names one.
 */
export const RawSvg = (props: Props) => {
  const tokens = useTokens()
  const text = useInheritedText()
  const box = useSlottedBox()
  return React.createElement(
    vectorPackage().Svg as unknown as React.ElementType,
    {
      ...svgAttributes(props),
      color: text.color ?? color(tokens, 'color-foreground'),
      height: props.height ?? box.height ?? '100%',
      width: props.width ?? box.width ?? '100%',
    },
    props.children,
  )
}

/**
 * The shapes a raw `<svg>` holds, each `react-native-svg`'s component of that
 * name, loaded as the first one is drawn.
 */
const shape = (name: string) => {
  const Shape = (props: Props) =>
    React.createElement(
      (vectorPackage() as unknown as Record<string, React.ElementType>)[name] as React.ElementType,
      svgAttributes(props),
      props.children,
    )
  Shape.displayName = name
  return Shape
}

export const SVG_SHAPES: Readonly<Record<string, unknown>> = {
  circle: shape('Circle'),
  ellipse: shape('Ellipse'),
  g: shape('G'),
  line: shape('Line'),
  path: shape('Path'),
  polygon: shape('Polygon'),
  polyline: shape('Polyline'),
  rect: shape('Rect'),
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

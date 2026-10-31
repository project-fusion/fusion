/* The HTML a Markdown library writes, as shared code draws it on a phone:
   headings, paragraphs, lists, quotes, code, rules, and tables. `data-prose` on
   the element around gives them the recipe of Helix's base layer, and a chat
   message gives them the values its turns take there. Outside `data-prose`
   they stay plain, as the base layer resets them on the web. */
import { type Tokens, useInheritedText, useTokens } from '@fusion.dev/helix-native'
import * as React from 'react'
import { ScrollView, Text, View } from 'react-native'
import { type Props, proseInk, Span } from './words.native'

type Kind = 'document' | 'plain' | 'turn'

interface Scope {
  readonly kind: Kind
  /** The components a passage spaces as it spaces a `pre`, a `table`, or a `blockquote`. */
  readonly spaced: ReadonlySet<unknown>
}

const ScopeContext = React.createContext<Scope>({ kind: 'plain', spaced: new Set() })

/** Whether what is drawn stands in a chat message, as the base layer's turn rules read it. */
const InTurn = React.createContext(false)

/** Draws what it holds in a chat message's turn. */
export const Turn = ({ children }: Props) =>
  React.createElement(InTurn.Provider, { value: true }, children)

const points = (tokens: Tokens, name: string): number => {
  const value = tokens[name]
  return typeof value === 'number' ? value : 0
}

const color = (tokens: Tokens, name: string): string => String(tokens[name] ?? '')

/** Each string in `children` as words, and each block as it is. */
const flowed = (children: React.ReactNode): React.ReactNode[] =>
  React.Children.toArray(children).map((child, index) =>
    typeof child === 'string' || typeof child === 'number'
      ? React.createElement(Span, { key: `words-${index}` }, child)
      : child,
  )

/** The headings, which the turn's rules give room above and below. */
const LEVELS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const
type Level = (typeof LEVELS)[number]

/** A browser's size for a heading no recipe sizes, as a share of the text around. */
const PLAIN_SIZE: Readonly<Record<Level, number>> = {
  h1: 2,
  h2: 1.5,
  h3: 1.17,
  h4: 1,
  h5: 0.83,
  h6: 0.67,
}

const DOCUMENT_SIZE: Readonly<Record<Level, string>> = {
  h1: 'text-3xl',
  h2: 'text-2xl',
  h3: 'text-xl',
  h4: 'text-lg',
  h5: 'text-md',
  h6: 'text-sm',
}

const TURN_SIZE: Readonly<Record<Level, string>> = {
  h1: 'text-xl',
  h2: 'text-lg',
  h3: 'text-md',
  h4: 'text-sm',
  h5: 'text-sm',
  h6: 'text-sm',
}

const headingSize = (tokens: Tokens, kind: Kind, level: Level, around: number): number =>
  kind === 'plain'
    ? PLAIN_SIZE[level] * around
    : points(tokens, (kind === 'turn' ? TURN_SIZE : DOCUMENT_SIZE)[level])

const WEIGHT: Readonly<Record<Kind, string>> = {
  document: 'weight-semibold',
  plain: 'weight-bold',
  turn: 'weight-medium',
}

/** A heading in its recipe's size, weight, and line height. */
const heading = (level: Level) => {
  const Heading = ({ children }: Props) => {
    const tokens = useTokens()
    const text = useInheritedText()
    const { kind } = React.useContext(ScopeContext)
    const rem = points(tokens, 'text-md')
    const size = headingSize(tokens, kind, level, Number(text.fontSize ?? rem))
    return React.createElement(
      Text,
      {
        accessibilityRole: 'header' as const,
        allowFontScaling: false,
        style: {
          color: text.color ?? color(tokens, 'color-foreground'),
          fontSize: size,
          fontWeight: String(tokens[WEIGHT[kind]] ?? '700'),
          ...(kind === 'plain'
            ? {}
            : { letterSpacing: -0.01 * size, lineHeight: 0.99 * size + 0.5 * rem }),
        } as never,
      },
      children,
    )
  }
  Heading.displayName = level
  return Heading
}

export const HEADINGS: Readonly<Record<Level, ReturnType<typeof heading>>> = {
  h1: heading('h1'),
  h2: heading('h2'),
  h3: heading('h3'),
  h4: heading('h4'),
  h5: heading('h5'),
  h6: heading('h6'),
}

const HEADING_TYPES = new Set<unknown>(Object.values(HEADINGS))

/** A paragraph, which is a block in a passage and words anywhere else. */
export const Paragraph = (props: Props) => React.createElement(Span, props)

/** A rule across the passage. */
export const Rule = () => {
  const tokens = useTokens()
  return React.createElement(View, {
    style: {
      backgroundColor: color(tokens, 'color-border'),
      height: points(tokens, 'border-thin'),
      marginVertical: points(tokens, 'space-md'),
    },
  })
}

/** The room a block keeps from the blocks beside it. */
const gapsOf = (
  type: unknown,
  scope: Scope,
  tokens: Tokens,
  at: { first: boolean; last: boolean },
): Record<string, number> => {
  if (scope.kind === 'turn' && HEADING_TYPES.has(type)) {
    return {
      marginBottom: points(tokens, 'space-sm'),
      marginTop: at.first ? 0 : points(tokens, 'space-md'),
    }
  }
  const keeps = scope.spaced.has(type) || BLOCKS.has(type)
  return keeps && !at.last && scope.kind !== 'plain'
    ? { marginBottom: points(tokens, 'space-sm') }
    : {}
}

/**
 * **What a passage holds, each block a set distance from the next**, with
 * nothing hanging off either end, as the recipe's `:last-child` rule says.
 */
const Flow = ({ children }: Props) => {
  const tokens = useTokens()
  const scope = React.useContext(ScopeContext)
  const held = flowed(children)
  return React.createElement(
    React.Fragment,
    null,
    ...held.map((child, index) => {
      const type = React.isValidElement(child) ? child.type : undefined
      const gaps = gapsOf(type, scope, tokens, {
        first: index === 0,
        last: index === held.length - 1,
      })
      return Object.keys(gaps).length === 0
        ? child
        : React.createElement(View, { key: `block-${index}`, style: gaps }, child)
    }),
  )
}

/** A passage under `data-prose`, as the element that says so draws what it holds. */
export const Prose = ({ children, spaced }: Props) => {
  const turn = React.useContext(InTurn)
  const value = React.useMemo<Scope>(
    () => ({ kind: turn ? 'turn' : 'document', spaced: spaced as ReadonlySet<unknown> }),
    [spaced, turn],
  )
  return React.createElement(
    ScopeContext.Provider,
    { value },
    React.createElement(Flow, null, children),
  )
}

/* Lists. */

interface ListAbout {
  readonly depth: number
  readonly marker: string
}

const ListContext = React.createContext<ListAbout | undefined>(undefined)

const BULLETS = ['•', '◦', '▪']

const listPadding = (tokens: Tokens, kind: Kind): number =>
  kind === 'plain' ? 0 : points(tokens, kind === 'turn' ? 'space-md' : 'space-lg')

const list = (ordered: boolean) => {
  const List = ({ children, start }: Props) => {
    const tokens = useTokens()
    const { kind } = React.useContext(ScopeContext)
    const around = React.useContext(ListContext)
    const depth = (around?.depth ?? -1) + 1
    const first = Number(start ?? 1)
    const items = React.Children.toArray(children).filter((child) => React.isValidElement(child))
    return React.createElement(
      View,
      { style: { paddingLeft: listPadding(tokens, kind) } },
      ...items.map((item, index) =>
        React.createElement(
          ListContext.Provider,
          {
            key: `item-${index}`,
            value: {
              depth,
              marker: ordered
                ? `${first + index}.`
                : (BULLETS[Math.min(depth, BULLETS.length - 1)] as string),
            },
          },
          item,
        ),
      ),
    )
  }
  return List
}

export const OrderedList = list(true)
export const BulletList = list(false)

const itemSpace = (tokens: Tokens, kind: Kind): Record<string, number> => {
  if (kind === 'turn') {
    return { paddingVertical: points(tokens, 'space-2xs') }
  }
  return kind === 'document' ? { marginVertical: points(tokens, 'space-2xs') } : {}
}

/** An item, with its marker in the padding of its list, as a browser hangs one. */
export const ListItem = ({ children }: Props) => {
  const tokens = useTokens()
  const text = useInheritedText()
  const { kind } = React.useContext(ScopeContext)
  const about = React.useContext(ListContext)
  return React.createElement(
    View,
    { style: itemSpace(tokens, kind) },
    about === undefined
      ? null
      : React.createElement(
          Text,
          {
            accessibilityElementsHidden: true,
            allowFontScaling: false,
            importantForAccessibility: 'no' as const,
            style: [
              { color: color(tokens, 'color-foreground'), fontSize: points(tokens, 'text-md') },
              text,
              {
                marginRight: points(tokens, 'space-2xs'),
                position: 'absolute',
                right: '100%',
                top: kind === 'turn' ? points(tokens, 'space-2xs') : 0,
              },
            ] as never,
          },
          about.marker,
        ),
    React.createElement(Flow, null, children),
  )
}

/* Quotes and code. */

/** A quote: a rule on its edge, and in a turn a note in Callout's shape. */
export const Quote = ({ children }: Props) => {
  const tokens = useTokens()
  const { kind } = React.useContext(ScopeContext)
  const thick = points(tokens, 'border-thick')
  if (kind === 'plain') {
    return React.createElement(View, null, React.createElement(Flow, null, children))
  }
  if (kind === 'document') {
    return React.createElement(
      View,
      {
        style: {
          borderLeftColor: color(tokens, 'color-border'),
          borderLeftWidth: thick,
          paddingLeft: points(tokens, 'space-sm'),
        },
      },
      React.createElement(
        proseInk.Provider,
        { value: { color: color(tokens, 'color-foreground-muted') } },
        React.createElement(Flow, null, children),
      ),
    )
  }
  const inset = points(tokens, 'space-md')
  return React.createElement(
    View,
    {
      style: {
        backgroundColor: color(tokens, 'color-surface-sunken'),
        borderRadius: points(tokens, 'radii-sm'),
        overflow: 'hidden',
        padding: inset,
        paddingLeft: inset + thick,
      },
    },
    React.createElement(View, {
      style: {
        backgroundColor: color(tokens, 'color-foreground-subtle'),
        bottom: 0,
        left: 0,
        position: 'absolute',
        top: 0,
        width: thick,
      },
    }),
    React.createElement(Flow, null, children),
  )
}

/** The words a node holds, in order. */
export const wordsIn = (node: React.ReactNode): string =>
  React.Children.toArray(node)
    .map((child) => {
      if (typeof child === 'string' || typeof child === 'number') {
        return String(child)
      }
      return React.isValidElement<Props>(child) ? wordsIn(child.props.children) : ''
    })
    .join('')

/** A block of code, which scrolls across inside its own box. */
export const Pre = ({ children }: Props) => {
  const tokens = useTokens()
  const text = useInheritedText()
  const { kind } = React.useContext(ScopeContext)
  const boxed =
    kind === 'turn'
      ? {
          borderColor: color(tokens, 'color-border'),
          borderRadius: points(tokens, 'radii-lg'),
          borderWidth: points(tokens, 'border-thin'),
        }
      : { borderRadius: points(tokens, 'radii-sm') }
  return React.createElement(
    ScrollView,
    {
      contentContainerStyle: { padding: points(tokens, 'space-sm') },
      horizontal: true,
      style: {
        ...(kind === 'plain' ? {} : boxed),
        backgroundColor: kind === 'plain' ? undefined : color(tokens, 'color-surface-sunken'),
      },
    },
    React.createElement(
      Text,
      {
        allowFontScaling: false,
        style: [
          { color: color(tokens, 'color-foreground'), fontSize: points(tokens, 'text-md') },
          text,
          { fontFamily: String(tokens['font-mono'] ?? 'monospace') },
        ] as never,
      },
      wordsIn(children),
    ),
  )
}

/* Tables. */

/** How much of the width each column takes, from the most words it holds. */
const SharesContext = React.createContext<readonly number[]>([])
const InHead = React.createContext(false)
const LastRow = React.createContext(false)
const CellAt = React.createContext<{ readonly at: number; readonly last: boolean } | undefined>(
  undefined,
)

/** A row of a table, its cells side by side at their columns' shares. */
export function Row({ children }: Props) {
  const last = React.useContext(LastRow)
  const cells = React.Children.toArray(children)
  return React.createElement(
    View,
    { style: { flexDirection: 'row' } },
    ...cells.map((cell, at) =>
      React.createElement(CellAt.Provider, { key: `cell-${at}`, value: { at, last } }, cell),
    ),
  )
}

/** Each row an element holds, through its `thead` and `tbody`. */
const rowsIn = (node: React.ReactNode): React.ReactElement<Props>[] =>
  React.Children.toArray(node).flatMap((child) => {
    if (!React.isValidElement<Props>(child)) {
      return []
    }
    return child.type === Row ? [child] : rowsIn(child.props.children)
  })

/**
 * **A column takes a share for the longest words in it**, the nearest a phone
 * comes to a browser's automatic table layout, which measures each cell: a
 * column of long cells is wider than a column of short ones.
 */
const sharesOf = (children: React.ReactNode): number[] => {
  const shares: number[] = []
  for (const row of rowsIn(children)) {
    React.Children.toArray(row.props.children).forEach((cell, at) => {
      shares[at] = Math.max(shares[at] ?? 1, wordsIn(cell).length)
    })
  }
  return shares
}

export const Table = ({ children }: Props) => {
  const tokens = useTokens()
  const { kind } = React.useContext(ScopeContext)
  const shares = React.useMemo(() => sharesOf(children), [children])
  const box =
    kind === 'turn'
      ? {
          backgroundColor: color(tokens, 'color-surface-sunken'),
          borderColor: color(tokens, 'color-border'),
          borderRadius: points(tokens, 'radii-lg'),
          borderWidth: points(tokens, 'border-thin'),
          paddingHorizontal: points(tokens, 'space-sm'),
        }
      : {}
  return React.createElement(
    View,
    { style: box },
    React.createElement(
      SharesContext.Provider,
      { value: shares },
      React.Children.toArray(children),
    ),
  )
}

/** A `thead`, whose cells are headings of their columns. */
export const TableHead = ({ children }: Props) =>
  React.createElement(InHead.Provider, { value: true }, children)

/** A `tbody`, whose last row has no rule under it. */
export const TableBody = ({ children }: Props) => {
  const rows = React.Children.toArray(children)
  return React.createElement(
    React.Fragment,
    null,
    ...rows.map((row, index) =>
      React.createElement(
        LastRow.Provider,
        { key: `row-${index}`, value: index === rows.length - 1 },
        row,
      ),
    ),
  )
}

const cellSpace = (tokens: Tokens, kind: Kind): Record<string, number> =>
  kind === 'turn'
    ? {
        paddingLeft: 0,
        paddingRight: points(tokens, 'space-md'),
        paddingVertical: points(tokens, 'space-xs'),
      }
    : {
        paddingHorizontal: points(tokens, 'space-xs'),
        paddingVertical: points(tokens, 'space-2xs'),
      }

const cell = (heads: boolean) => {
  const Cell = ({ children }: Props) => {
    const tokens = useTokens()
    const { kind } = React.useContext(ScopeContext)
    const shares = React.useContext(SharesContext)
    const place = React.useContext(CellAt)
    const inHead = React.useContext(InHead)
    const head = inHead || heads
    const ink = head
      ? {
          color: color(tokens, 'color-foreground-muted'),
          fontWeight: String(tokens['weight-medium'] ?? '500'),
        }
      : {}
    return React.createElement(
      View,
      {
        accessibilityRole: head ? ('header' as const) : undefined,
        style: {
          borderBottomColor: place?.last ? 'transparent' : color(tokens, 'color-border'),
          borderBottomWidth: points(tokens, 'border-thin'),
          flexBasis: 0,
          flexGrow: shares[place?.at ?? 0] ?? 1,
          flexShrink: 1,
          ...cellSpace(tokens, kind),
        },
      },
      React.createElement(
        proseInk.Provider,
        { value: ink },
        React.createElement(Flow, null, children),
      ),
    )
  }
  return Cell
}

export const HeadCell = cell(true)
export const DataCell = cell(false)

/** The blocks of a passage that keep its gap after them. */
const BLOCKS = new Set<unknown>([Paragraph, OrderedList, BulletList, Pre, Table, Quote])

/** Words in italics, as a browser sets `em` and `i`. */
export const Emphasis = ({ children }: Props) =>
  React.createElement(
    proseInk.Provider,
    { value: { fontStyle: 'italic' } },
    React.createElement(Span, null, children),
  )

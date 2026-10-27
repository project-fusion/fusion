import { Fragment, type ReactNode } from 'react'
import type { Family, Node } from '../style/form'
import type { GeneratedBox, Resolved, Style } from '../style/resolved'
import { HelixTheme } from '../theme/helix-theme'
import { described } from './anchored'
import { wrapped } from './behavior'
import { Box } from './box'
import { drawDrawnNode } from './drawn'
import { drawField } from './field'
import { PartBox } from './fit'
import { drawImage } from './image'
import { drawLayer } from './layer'
import { drawLive, saidStatus } from './live'
import { placeIn } from './placed'
import { pressView } from './press-view'
import { drawRegion } from './regions'
import { drawRepeat, outOfCopy } from './repeat'
import { drawRun } from './run'
import { controlEdge, isControl, ScrollingPart } from './scroll'
import { toSection } from './sections'
import { boxSemantics, pressSemantics, silent } from './semantics'
import {
  bound,
  type Draw,
  fromText,
  inherit,
  laid,
  physical,
  resolve,
  type Scope,
  type Scrolling,
  split,
} from './styles'
import { ScaledText } from './text'
import { drawVector } from './vector'
import { drawText } from './words-node'

/** Draws what a node holds, in order. */
const inner = (
  scope: Scope,
  node: Node,
  text: Style,
  regions: Style,
  inside: Node | 'host',
): ReactNode[] =>
  drawEach(node.children ?? [], (child) => draw(scope, child, text, regions, inside))

/**
 * Draws each node of a list. **Two nodes of one name are keyed by their
 * place**, as a divider's two halves are both its `line`, since React keys
 * each node's view by its name.
 */
export const drawEach = (
  nodes: readonly Node[],
  drawOne: (node: Node) => ReactNode,
): ReactNode[] => {
  const names = nodes.map((node) => node.name)
  if (new Set(names).size === names.length) {
    return nodes.map(drawOne)
  }
  const seen = new Map<string, number>()
  return nodes.map((node) => {
    const nth = seen.get(node.name) ?? 0
    seen.set(node.name, nth + 1)
    return <Fragment key={`${node.name}-${nth}`}>{drawOne(node)}</Fragment>
  })
}

/**
 * The box a `::before` or `::after` draws, with its words in the text style
 * around it where its `content` says some.
 */
export const drawGenerated = (
  box: GeneratedBox | undefined,
  text: Style,
  key: string,
): ReactNode => {
  if (box === undefined) {
    return null
  }
  const [frame, words] = split(box.style)
  return (
    <Box
      key={key}
      motion={box.motion}
      style={frame}
      transitions={box.transitions}
      view={box.unread ? silent : {}}
    >
      {box.words === undefined ? null : (
        <ScaledText style={inherit(text, words)}>{box.words}</ScaledText>
      )}
    </Box>
  )
}

/**
 * Whether a press whose one job is its link goes nowhere. **It draws as a
 * box**, as a crumb with no `href` is its words, so a control in it stays one.
 */
const goesNowhere = (scope: Scope, node: Node): boolean => {
  const { chooses, href, role, toggles } = node.attributes ?? {}
  const to = bound(scope, href, node.name)
  const linkOnly = href !== undefined && chooses !== true && toggles !== true && role === undefined
  return linkOnly && (typeof to !== 'string' || to === '')
}

/** The end a scroll button scrolls toward, where the press is one. */
const towardOf = (node: Node): 'end' | 'start' | undefined => {
  const toward = node.attributes?.scrolls
  return toward === 'start' || toward === 'end' ? toward : undefined
}

/**
 * A press: its part's view, what a screen reader hears of it, and what it
 * holds, in the press's own text style. A scroll button shows while there is
 * more the way it scrolls, and holds to that edge.
 */
const drawPressable = (scope: Scope, node: Node, text: Style, inside: Node | 'host'): ReactNode => {
  if (goesNowhere(scope, node)) {
    return drawBox(scope, node, text, inside)
  }
  const toward = towardOf(node)
  const shown = toward === undefined ? {} : { hidden: scope.scrolling?.more[toward] !== true }
  const resolved = resolve(scope, node, fromText(text), shown)
  const [box, words] = split(resolved.style)
  /* A press moves its look as a box does, through the transitions its rules name. */
  const { style: own, View } = pressView(box, resolved.transitions)
  const style = toward === undefined ? own : [own, controlEdge(toward, scope.scrolling?.axis)]
  return wrapped(
    scope.behavior,
    node.name,
    <View
      key={node.name}
      {...toSection(
        scope,
        node,
        described(
          laid(scope.behavior, node.name, { ...pressSemantics(scope, node), style }, scope.item),
          scope.behavior.parts[node.name]?.hint,
        ),
      )}
    >
      {drawGenerated(resolved.generated?.before, inherit(text, words), `${node.name}-before`)}
      {inner(scope, node, inherit(text, words), resolved.regions, node)}
      {drawGenerated(resolved.generated?.after, inherit(text, words), `${node.name}-after`)}
    </View>,
    node.name,
  )
}

/**
 * Whether a box fills the host it is drawn in, as a box whose length is
 * `100%` does: the renderer draws that length as a stretch across the host's
 * line, or a growth along it.
 */
const fills = (box: Style): boolean =>
  box.alignSelf === 'stretch' || box.flexGrow === 1 || box.height === '100%'

/**
 * The glyph a box names, or the one the prop it binds holds, in the box's own
 * color, which is the text's around it unless the box sets one, as
 * `currentColor` reads it on the web. **It fills a box that sets its height**, or its width,
 * and the host a box drawn in the host fills, as an icon's glyph fills the
 * icon. A box that sets neither draws it an em of the text wide, or a rem
 * where the text sets no size.
 *
 * **A glyph is space, so it stops growing where space does**: its em is the
 * text's size at the space's rem, as an em in any other length is, and a
 * box's own size is already a length that stops.
 */
const drawGlyph = (
  scope: Scope,
  node: Node,
  text: Style,
  box: Style,
  host: Style | undefined,
): ReactNode => {
  const { Glyph, rem, spaceRem, tokens } = scope.theme
  const name = bound(scope, node.attributes?.glyph, node.name)
  if (typeof name !== 'string' || name === '' || Glyph === undefined) {
    return null
  }
  const color = text.color ?? tokens['color-foreground'] ?? ''
  const filled = host !== undefined && fills(box) ? host : {}
  const size = [box.height, box.width, filled.height, filled.width].find(
    (extent): extent is number => typeof extent === 'number',
  )
  return (
    <Glyph
      color={String(color)}
      name={name}
      size={
        size ?? (typeof text.fontSize === 'number' ? (text.fontSize * spaceRem) / rem : spaceRem)
      }
    />
  )
}

/** What is passed into a part with a `color-scheme`, drawn in that scheme's tokens. */
const inScheme = (scheme: Resolved['scheme'], content: ReactNode): ReactNode =>
  scheme === undefined ? content : <HelixTheme mode={scheme}>{content}</HelixTheme>

/** A scrolling box: its frame, what scrolls inside it, and its scroll buttons over that. */
const drawScrolling = (
  scope: Scope,
  node: Node,
  resolved: Resolved & { readonly scrolls: 'both' | 'x' | 'y' },
  text: Style,
  view: Readonly<Record<string, unknown>>,
): ReactNode => {
  const [box] = split(resolved.style)
  const drawn = (scrolling: Scrolling, controls: boolean) =>
    (node.children ?? [])
      .filter((child) => isControl(child) === controls)
      .map((child) => draw({ ...scope, scrolling }, child, text, resolved.regions, node))
  return wrapped(
    scope.behavior,
    node.name,
    <ScrollingPart
      axis={resolved.scrolls}
      blur={resolved.blur}
      box={box}
      content={(scrolling) => drawn(scrolling, false)}
      controls={(scrolling) => drawn(scrolling, true)}
      hugs={resolved.hugs === true}
      key={node.name}
      line={physical(resolved.rule)}
      motion={resolved.motion}
      transitions={resolved.transitions}
      view={view}
    />,
    node.name,
  )
}

/** The parts of each family whose rules animate them in some state, worked out once each. */
const MOVING = new WeakMap<Family, ReadonlySet<string>>()

/**
 * Whether a family's rules animate a part in some state: an `animation`
 * on it under any condition, so its view stays Reanimated's as states
 * change, and what it holds is not drawn anew as the motion starts.
 */
const movesSometime = (family: Family, part: string): boolean => {
  let moving = MOVING.get(family)
  if (moving === undefined) {
    moving = new Set(
      family.rules.flatMap((item) =>
        item.kind === 'rule' &&
        item.set.some(([name]) => name === 'animation' || name === 'animation-name')
          ? [item.target]
          : [],
      ),
    )
    MOVING.set(family, moving)
  }
  return moving.has(part)
}

/** A part's motion, started again as many times as its binding's `runs` says. */
const runOf = (scope: Scope, node: Node, motion: Resolved['motion']): Resolved['motion'] => {
  const runs = scope.behavior.parts[node.name]?.runs
  return runs === undefined || motion === undefined ? motion : { ...motion, run: runs }
}

/**
 * A box: its part's view, what a screen reader hears of it, the words its
 * `::before` draws, its glyph, and what it holds, in its own text style.
 */
const drawBox = (scope: Scope, node: Node, text: Style, inside: Node | 'host'): ReactNode => {
  if (node.attributes?.run === true) {
    return drawRun(scope, node, text, draw)
  }
  /* **A box that draws another element is that element**, with the props
     its machines give it, as a checkbox group's select-all is a checkbox,
     and a wrap's is drawn around what the wrap holds, as a copy button's
     tooltip is drawn around its press. */
  const draws = node.attributes?.draws
  if (typeof draws === 'string') {
    return drawDrawnNode(scope, node, draws, (children) =>
      inner(scope, { ...node, children }, text, {}, inside),
    )
  }
  const resolved = resolve(scope, node, {
    ...fromText(text),
    ...(scope.copy ?? placeIn(scope.family.tree ?? [], node)),
  })
  /* A copy's place is its own, and what it holds stands where it is drawn. */
  const held = outOfCopy(scope)
  const [box, words] = split(resolved.style)
  const inherits = inherit(text, words)
  const view = laid(scope.behavior, node.name, boxSemantics(scope, node), scope.item)
  const { scrolls } = resolved
  if (scrolls !== undefined) {
    return drawScrolling(held, node, { ...resolved, scrolls }, inherits, view)
  }
  const driven = scope.behavior.parts[node.name]?.animated === true
  /* **A part whose row fits its content is drawn at the content's height**,
     which its `grid-template-rows` transition moves. */
  return wrapped(
    scope.behavior,
    node.name,
    <PartBox
      animated={driven}
      blur={resolved.blur}
      clip={resolved.clip}
      fit={resolved.fit}
      invisible={resolved.invisible}
      key={node.name}
      line={physical(resolved.rule)}
      motion={runOf(scope, node, resolved.motion)}
      moves={movesSometime(scope.family, node.name)}
      shares={resolved.shares}
      shown={resolved.shown}
      style={box}
      {...(driven ? {} : { transitions: resolved.transitions })}
      view={view}
    >
      {drawGenerated(resolved.generated?.before, inherits, `${node.name}-before`)}
      {resolved.before === undefined ? null : (
        <ScaledText style={inherits}>{resolved.before}</ScaledText>
      )}
      {drawGlyph(scope, node, inherits, box, inside === 'host' ? scope.host.style : undefined)}
      {typeof node.attributes?.viewBox === 'string'
        ? drawVector(held, node, fromText(inherits), box)
        : inScheme(resolved.scheme, inner(held, node, inherits, resolved.regions, node))}
      {drawGenerated(resolved.generated?.after, inherits, `${node.name}-after`)}
      {saidStatus(view)}
    </PartBox>,
    node.name,
  )
}

/** Draws one node of the tree as its kind's view. */
export const draw: Draw = (scope, node, text, regions, inside) => {
  /* A node only the web draws, as a pointer's drag preview. */
  if (node.attributes?.platform === 'web') {
    return null
  }
  switch (node.kind) {
    case 'box': {
      return drawBox(scope, node, text, inside)
    }
    case 'field': {
      return drawField(scope, node, text)
    }
    case 'image': {
      return drawImage(scope, node, text)
    }
    /* **A layer is drawn in the host over the app**, as the box it is. */
    case 'layer': {
      return drawLayer(scope, node, text, inside, drawBox)
    }
    case 'live': {
      return drawLive(scope, node)
    }
    case 'pressable': {
      return drawPressable(scope, node, text, inside)
    }
    case 'region': {
      return drawRegion(scope, node, text, regions, inside, draw)
    }
    case 'text': {
      return drawText(scope, node, text)
    }
    /* An `unless()` is a `when` drawn while its prop or state does not hold. */
    case 'when': {
      const holds = Boolean(scope.base.conditions[node.name]) !== (node.attributes?.unless === true)
      return holds ? inner(scope, node, text, regions, inside) : null
    }
    /* **A repeat draws what it holds as many times as its `count` says**,
       each copy standing where it is drawn among the others, as a
       skeleton's lines are. */
    case 'repeat': {
      return drawRepeat(scope, node, text, regions, inside, draw)
    }
    /* **A row's link is the row's press on a phone.** A screen reader
       reaches one control in a press, so what the link wraps is drawn in
       the row, and the press around it opens the link. **A wrap with no
       link is a box while its `while` holds**, as a card's header row is
       while its actions region holds something. */
    case 'wrap': {
      const boxed =
        node.attributes?.href === undefined &&
        node.attributes?.while !== undefined &&
        Boolean(bound(scope, node.attributes.while, node.name))
      return boxed ? drawBox(scope, node, text, inside) : inner(scope, node, text, regions, inside)
    }
  }
}

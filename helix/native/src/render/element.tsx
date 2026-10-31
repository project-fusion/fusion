/**
 * Draws any family from its intermediate form with React Native.
 *
 * **One renderer for every family.** The part tree says what to draw, the
 * API says what a family takes, and `style()` says how each part looks, so a
 * family needs no native code of its own.
 *
 * **The CSS idioms a native view reads differently are translated here, once.**
 * Text styles do not inherit across views, so a part's text properties are
 * passed down to the text inside it.
 */
import { type ComponentType, useRef, useState } from 'react'
import { type LayoutChangeEvent, View } from 'react-native'
import Reanimated from 'react-native-reanimated'
import { useLocale } from '../capabilities/locale'
import type { Context } from '../style/context'
import { type Family, type Rule, readable } from '../style/form'
import type { Resolution, Slotted, Style } from '../style/resolved'
import type { Theme } from '../theme/theme'
import { useTheme } from '../theme/theme'
import { type Around, type Grown, useAround } from './around'
import { Backdrop } from './backdrop'
import { type Behavior, merged, type Props, STILL, type UseBehavior, wrapped } from './behavior'
import { marker, numbering } from './counters'
import { dense, densityOf, useDensity } from './density'
import { useFieldset } from './fieldset'
import { folded } from './fold'
import { useFollowed } from './follows'
import { hostSemantics } from './host'
import { hostStyle } from './host-style'
import { useHostTarget } from './host-target'
import { keepMade } from './made'
import { useReducedMotion } from './motion'
import { draw, drawEach, drawGenerated } from './nodes'
import { ownHooks, styleCustom } from './own-hooks'
import { heldBy, readsCondition, useEntering } from './presence'
import { type Presence, presenceOf, usePresencePhase } from './presence-phase'
import { useLazy } from './regions'
import { readsSafeArea, useSafeReach } from './safe-reach'
import { warnSharedCode } from './shared-code'
import { PlaceOf } from './siblings'
import {
  conditionsOf,
  direction,
  hooksOf,
  inherit,
  laid,
  pageText,
  resolve,
  type Scope,
  type Styling,
  split,
  type Values,
} from './styles'
import { ScaledText } from './text'
import { totaled } from './total'
import { isSubgrid, sizedParts, useSubgrid, useTracks } from './tracks'
import { writtenSize } from './written-size'
import { readsZero, useZero } from './zero'

/**
 * **Every custom property the element around sets on this one**, by its whole
 * name, which a hook of another family's reads, as an icon button reads the
 * corners a button group sets with `--button-radius-end-end`, and a token
 * the element around overrides.
 */
const customOf = (set: Readonly<Record<string, Resolution>>): Record<string, number | string> => {
  const custom: Record<string, number | string> = {}
  for (const [name, said] of Object.entries(set)) {
    if (typeof said === 'string' || typeof said === 'number') {
      custom[name] = said
    }
  }
  return custom
}

/**
 * What every part of an element is drawn under: among the rest, the theme's
 * tokens and the size of a `rem`, which follows the reader's text size in
 * text and stops at the largest standard size in every other length.
 */
export const contextOf = (
  values: Values,
  outer: Around | undefined,
  slotted: Slotted | undefined,
  reducedMotion: boolean,
  theme: Pick<Theme, 'mode' | 'rem' | 'spaceRem' | 'tokens'>,
): Context => {
  const { empty, numbers } = numbering(values)
  return {
    conditions: { ...conditionsOf(values), ...empty },
    /* What the part around sets inherits, what the element around sets on this
       one directly stands over it, and the element's own `style` over both. */
    custom: customOf({ ...outer?.custom, ...slotted?.custom, ...styleCustom(values.props.style) }),
    dir: direction(),
    hooks: { ...hooksOf(values.family, slotted), ...ownHooks(values.props.hooks) },
    inherited: { ...outer?.values, ...slotted?.values, ...numbers },
    reducedMotion,
    rem: theme.rem,
    ...(theme.mode === undefined ? {} : { scheme: theme.mode }),
    spaceRem: theme.spaceRem,
    tokens: theme.tokens,
    ...(slotted === undefined ? {} : { given: slotted.style }),
    ...(slotted?.deferred === undefined ? {} : { deferred: slotted.deferred }),
    ...(outer?.counters === undefined ? {} : { counters: outer.counters }),
    ...(outer === undefined ? {} : { within: outer.within }),
    ...(outer?.place === undefined ? {} : { place: outer.place }),
    ...(outer?.ofType === undefined ? {} : { ofType: outer.ofType }),
  }
}

/**
 * The style the element around gives the host, with a grown item in a line
 * that scrolls across sized from its own width: drawn at its own size while
 * it is measured, then growing from that width as `flex` says, and never
 * narrower, as a flex item's automatic minimum keeps it on the web.
 */
const sized = (given: Style | undefined, grown: Grown | undefined): Style | undefined => {
  if (given === undefined || grown === undefined || typeof given.flex !== 'number') {
    return given
  }
  const { flex, ...rest } = given
  return grown.least === undefined
    ? { ...rest, flexGrow: 0, flexShrink: 0 }
    : { ...rest, flexBasis: 0, flexGrow: flex, flexShrink: 1, minWidth: grown.least }
}

/**
 * The host's view props, telling the line its width as it lays out, where it
 * is measured, and telling the element its own width, where its rules read
 * it.
 */
const measuring = (
  props: Readonly<Record<string, unknown>>,
  grown: Grown | undefined,
  sized?: (width: number) => void,
  placed?: (event: LayoutChangeEvent) => void,
): Readonly<Record<string, unknown>> => {
  const report = grown?.report
  if (report === undefined && sized === undefined && placed === undefined) {
    return props
  }
  const own = props.onLayout
  return {
    ...props,
    onLayout: (event: LayoutChangeEvent) => {
      report?.(event.nativeEvent.layout.width)
      sized?.(event.nativeEvent.layout.width)
      placed?.(event)
      if (typeof own === 'function') {
        own(event)
      }
    },
  }
}

/** The text style a `::slotted()` rule gives the element. */
const textOf = (slotted: Slotted | undefined): Style => (slotted ? split(slotted.style)[1] : {})

/**
 * The host's own width once it is laid out, as the context its rules read it
 * from, and what measures it, where the family's rules read it.
 */
const useOwnWidth = (reads: boolean) => {
  const [width, setWidth] = useState<number | undefined>(undefined)
  return {
    context: width === undefined ? {} : { width },
    measure: reads ? setWidth : undefined,
  }
}

/** Whether a child's basis is a `calc()` with a percentage in it, which is of the host's width. */
const measuredBasis = ([property, value]: readonly [string, unknown]): boolean =>
  property === 'flex-basis' && /"calc".*"text":"-?[\d.]+%"/.test(JSON.stringify(value))

/**
 * The rules that read the host's own width, as a list's narrow layout does,
 * and as a child's basis in a `calc()` with a percentage does, as a flex's
 * `switch` basis is.
 */
const widthRules = (family: Family): Rule[] =>
  (family.rules ?? []).filter(
    (item): item is Rule =>
      item.kind === 'rule' &&
      (item.when.some((condition) => condition.kind === 'container') ||
        (item.slotted !== undefined && item.set.some(measuredBasis))),
  )

/**
 * Whether a rule that reads the width may hold under `conditions`: each of
 * its props holds the value it asks for. **The host measures its width only
 * then**, so a flex draws once, and again as it is laid out only in its
 * `switch` layout.
 */
const mayHold = (rule: Rule, conditions: Context['conditions']): boolean =>
  rule.when.every(
    (condition) =>
      condition.kind !== 'attribute' ||
      (condition.value === null
        ? Boolean(conditions[condition.name])
        : conditions[condition.name] === condition.value),
  )

/** The scope a subgrid's parts are drawn in, with what lines them up laid over their bindings. */
const linedUp = (scope: Scope, subgrid: Behavior): Scope =>
  Object.keys(subgrid.parts).length === 0
    ? scope
    : { ...scope, behavior: merged(scope.behavior, subgrid) }

/**
 * **The language is the nearest `lang`**: the element's own, then the one
 * around it, as `lang` inherits on the web. The reader's where neither names
 * one.
 */
const languageIn = (props: Props, outer: Around | undefined): string | undefined =>
  typeof props.lang === 'string' && props.lang !== '' ? props.lang : outer?.locale

/** The language a screen reader reads an element's words in, where it names one. */
const languageOf = (props: Props): { readonly accessibilityLanguage?: string } =>
  typeof props.lang === 'string' && props.lang !== '' ? { accessibilityLanguage: props.lang } : {}

/**
 * What an element's words are drawn under: their language, and how many
 * quotations they are inside, so a quotation's marks are that language's at
 * the depth it is drawn.
 */
const wordsIn = (
  locale: string,
  outer: Around | undefined,
): { readonly locale: string; readonly quoted?: number } =>
  outer?.quoted === undefined ? { locale } : { locale, quoted: outer.quoted }

/**
 * What a host is drawn as, and its style. **A host that runs its keyframes**,
 * as an icon spins as a whole, or that a machine moves, is Reanimated's view.
 * **An inline host is a run of words**, a `Text` the element's parts are
 * drawn in, so it flows and wraps in the words around it, as a `Code` does
 * in a paragraph, and its words take the host's text style. Any other host
 * is a view.
 */
const hostOf = (
  scope: Scope,
  moves: boolean,
  style: unknown,
  text: Style,
): { readonly Host: ComponentType<Readonly<Record<string, unknown>>>; readonly style: unknown } => {
  if (moves || scope.behavior.parts.host?.animated === true) {
    return { Host: Reanimated.View as ComponentType<Readonly<Record<string, unknown>>>, style }
  }
  /* A machine that only sets the host's states, as a clock's `now`, gives it no view. */
  if (
    scope.host.inline === true &&
    Object.keys(scope.behavior.parts.host?.view ?? {}).length === 0
  ) {
    return {
      Host: ScaledText as ComponentType<Readonly<Record<string, unknown>>>,
      style: { ...(style as Style), ...text },
    }
  }
  return { Host: View as ComponentType<Readonly<Record<string, unknown>>>, style }
}

/** Styling with the host's states as an element that hides itself stands. */
const shownIn = (styling: Styling, presence: Presence): Styling =>
  Object.keys(presence.states).length === 0
    ? styling
    : {
        ...styling,
        base: presence.entering ? { ...styling.base, entering: true } : styling.base,
        behavior: merged(styling.behavior, {
          marks: [],
          parts: { host: { states: presence.states } },
        }),
      }

/**
 * A component that draws `family`.
 *
 * **The renderer draws, and the machines say what a part does.**
 * `useBehavior` hosts the element's machines. Each part's binding is laid
 * over the part's view, and its states are conditions of the part's style.
 * The element's marks are conditions of every part.
 *
 * @throws Where `family` is in a major of the intermediate form this runtime
 * does not read.
 */
export const element = (
  family: Family,
  useBehavior: UseBehavior = () => STILL,
): ComponentType<Props> => {
  readable(family)
  const zeroed = readsZero(family)
  const reading = widthRules(family)
  const lined = isSubgrid(family) ? sizedParts(family) : []
  const enters = readsCondition(family, 'entering')
  const present = presenceOf(family)
  const presence = readsCondition(family, 'holds')
  const safe = readsSafeArea(family)
  const drawing = (given: Props) => {
    warnSharedCode(family, given)
    const passed = useFieldset(family, given)
    const props = folded(family, totaled(family, passed))
    const place = useRef({}).current
    const entering = useEntering(enters)
    const width = useOwnWidth(reading.length > 0)
    /* A host that reads the safe area stands clear of the share reaching into it. */
    const reach = useSafeReach(safe)
    /* `data-density` sets the control steps it and the elements inside draw with. */
    const stop = densityOf(passed)
    const theme = useDensity(useTheme(), stop)
    const tracks = useTracks(theme.rem)
    const outer = useAround()
    const behavior = useBehavior(family, props)
    const target = useHostTarget(passed.id)
    const reducedMotion = useReducedMotion()
    const lazy = useLazy(props)
    const locale = useLocale(languageIn(props, outer))
    const values: Values = {
      behavior,
      family,
      loaded: lazy.loaded,
      locale,
      parts: outer?.parts,
      props,
    }
    useFollowed(values)
    const slotted = outer?.children[family.tag] ?? outer?.children['*']
    /* **Words start in the page's text, then take what the element around
       them passes in**, as a web page's `body` sets the color and the size
       and a slotted element inherits from its slot. Native text has no page:
       without its color, words were black on a dark surface, and without its
       size, a panel's words stayed at 14 points at every text size. **A
       `::slotted()` rule's text style is the element's own**, as an empty
       view's icon takes its color, and the host's text style reaches every
       part, as a host's `color` and `text-align` inherit into its shadow
       tree on the web. */
    const text = inherit(pageText(theme), outer?.text ?? {}, textOf(slotted))
    const zero = useZero(zeroed, { fontSize: theme.rem, ...text })
    const context = contextOf(values, outer, slotted, reducedMotion, theme)
    const base = {
      ...context,
      ...heldBy(family, props, context.conditions, entering, presence),
      ...wordsIn(locale, outer),
      ...width.context,
      ...reach.context,
      ...(zero.share === undefined ? {} : { zero: zero.share }),
    }
    const texted: Styling = {
      ...values,
      base: typeof text.fontSize === 'number' ? { ...base, fontSize: text.fontSize } : base,
    }
    const styling = shownIn(texted, usePresencePhase(present, texted))
    const scope: Scope = { ...styling, host: resolve(styling, 'host'), lazy, theme, tracks }
    /* **A `::slotted()` text style wins over the host's own**, as the outer
       tree's win in the web's cascade: a dialog's title takes its size. */
    const hostText = inherit(text, split(scope.host.style)[1], textOf(slotted))
    const { moves, style } = hostStyle(
      scope,
      { ...sized(slotted?.style, outer?.grown), ...writtenSize(passed.style, theme.rem) },
      slotted?.transitions,
    )
    const { Host, style: hosted } = hostOf(scope, moves, style, hostText)
    /* **A subgrid lines its parts up with its siblings'** while they run in
       a row, as a description list's terms share one column. */
    const parts = linedUp(
      scope,
      useSubgrid(outer?.tracks, lined, scope.host.style.flexDirection === 'row'),
    )
    const drawn = wrapped(
      behavior,
      'host',
      <Host
        {...reach.placed(
          target(
            measuring(
              laid(behavior, 'host', {
                ...hostSemantics(values),
                ...languageOf(props),
                style: hosted,
              }),
              outer?.grown,
              reading.some((rule) => mayHold(rule, base.conditions)) ? width.measure : undefined,
              reach.measure,
            ),
          ),
        )}
      >
        <Backdrop radius={scope.host.blur} style={scope.host.style} />
        {marker(scope, slotted)}
        {drawGenerated(scope.host.generated?.before, hostText, 'host-before')}
        {drawEach(family.tree ?? [], (node) => draw(parts, node, hostText, {}, 'host'))}
        {drawGenerated(scope.host.generated?.after, hostText, 'host-after')}
        {zero.probe}
      </Host>,
    )
    /* It stands in a place of its own, where its children of one kind are siblings. */
    const placed = <PlaceOf place={place}>{drawn}</PlaceOf>
    return dense(theme, stop, behavior.provide === undefined ? placed : behavior.provide(placed))
  }
  /* The tag the element around finds this one's `::slotted()` style by. */
  const made = Object.assign(drawing, { displayName: family.tag, tag: family.tag })
  keepMade(family, made)
  return made
}

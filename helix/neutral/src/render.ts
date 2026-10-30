/**
 * A family's headless source written as one object with its part tree last,
 * as JSX in `headless.tsx`:
 *
 * ```tsx
 * export default headless('tab', {
 *   memberOf: set('tabs'),
 *   props: { disabled: false, dismissLabel: 'Close', href: string() },
 *   events: { dismiss: cancelable(['label']) },
 *   states: ['selected'],
 *   render: ({ props, send }) => (
 *     <Pressable disabled={props.disabled} part="tab" role="tab" selects>
 *       <Slot part="label" />
 *     </Pressable>
 *   ),
 * })
 * ```
 *
 * **Read as syntax and never run.** `helix system` parses the module
 * and compiles it to the intermediate
 * form, and nothing in it runs.
 *
 * **What a render may hold.** The nodes below, each with its attributes. An
 * attribute or a child reads `props.x`, `derived.x`, `state.x`, a value a
 * feature computes as `stack.label` or `stop.words.back`, `entry.x`, or
 * `index`, `!` before one, `x ? 'a' : 'b'`, `x === 'v' ? 'a' : 'b'`, a core
 * derivation, `derive('kbd-label')`, and string, number, and boolean
 * literals. A child is a node, `x && <Node />`, `!x && <Node />`, or
 * `x ? <A /> : <B />`. `onPress={send.x}` sends an event. A `<Wrap when>` and
 * a `<View hidden>` read whether a slot holds something, `slots.x`. A node's
 * `style` sets CSS custom properties. A lowercase tag is refused, and so is
 * every other expression, with its line.
 *
 * **Each name is the API's, spelled in camelCase.** A prop `dismissLabel` is
 * the attribute `dismiss-label` on the web, and an event `beforeSelect` is
 * `helix-before-select`.
 *
 * **What the editor checks.** The props, events, states, and computed values
 * a render reads are typed from the keys before it, so a misspelled one is a
 * type error. The parts a style table names are checked by the compiler
 * alone, since a JSX expression has one type whatever it draws.
 */

import type { Event, Headless, PropType } from './tree.js'

declare const reads: unique symbol
declare const sends: unique symbol
declare const drawn: unique symbol
declare const declared: unique symbol
declare const rendered: unique symbol

/**
 * A value a render reads: a prop, a computed value, a state, or a value a
 * feature computes. Typed as the values it holds, so a render may test one
 * against a literal, `props.type === 'dialog'`.
 */
export type Read = (boolean | number | string) & { readonly [reads]: true }

/** An event a press sends, as `send.dismiss` names it. */
export interface Send {
  readonly [sends]: true
}

/** A node a render draws. */
export interface Drawn {
  readonly [drawn]: true
}

/**
 * What a node holds: a node, a node drawn while a value holds, a comment,
 * or several.
 */
export type Child = Drawn | Read | boolean | undefined | readonly Child[]

/** A derivation in core, computed where the node is drawn, as `derive('kbd-label')` writes it. */
export interface Derivation {
  readonly derive: string
}

/**
 * An attribute's value: a literal, a value the render reads, or a
 * derivation. A field of a repeat's entry may be missing, so it is read as
 * possibly undefined.
 */
export type Given = boolean | number | string | Read | Derivation | undefined

/**
 * CSS custom properties a node sets, as `style={{ '--meter-fraction': derived.fraction }}`,
 * which its style table reads with `measured()`. Written as React's `style`
 * writes them, since each is the property the web element sets on the part.
 */
export type Style = Readonly<Record<`--${string}`, Given>>

/** A prop declared with no default, or with more than its default to say. */
export interface PropSpec<Type extends PropType = PropType> {
  readonly [declared]: 'prop'
  readonly attribute?: false
  readonly default?: boolean | number | string
  readonly platform?: 'web'
  readonly type: Type
}

/** A prop: its default, which also says its type, or a spec from the helpers below. */
export type PropValue = boolean | number | string | PropSpec

/** An event: the fields of its detail, or a spec from `cancelable()` and `bare()`. */
export type EventValue = readonly string[] | Omit<Event, 'name'>

/** `placed-top` as `placedTop`, the key a render reads a state by. */
export type Camel<Name extends string> = Name extends `${infer Head}-${infer Tail}`
  ? `${Head}${Capitalize<Camel<Tail>>}`
  : Name

/** `dismissLabel` as `dismiss-label`, the name the web gives the attribute. */
export type Kebab<Name extends string> = Name extends `${infer Head}${infer Tail}`
  ? `${Head extends Lowercase<Head> ? Head : `-${Lowercase<Head>}`}${Kebab<Tail>}`
  : Name

/** The type a prop's value says. */
type TypeOf<Value> =
  Value extends PropSpec<infer Type>
    ? Type
    : Value extends boolean
      ? 'boolean'
      : Value extends number
        ? 'number'
        : 'string'

/** The props as the compiler lists them, each by its attribute's name. */
export type PropsList<Props> = readonly {
  readonly [Key in keyof Props & string]: {
    readonly name: Kebab<Key>
    readonly type: TypeOf<Props[Key]>
  }
}[keyof Props & string][]

/** The part tree of a source written with `render`, whose parts the compiler checks. */
export interface Rendered {
  readonly [rendered]: true
  readonly kind: string
  readonly name: string
}

/** Values a feature computes, by the fields that name them. */
type Computes<Field extends string> = { readonly [Key in Field]: Read }

/** What a render is given, each typed from the keys before it. */
export interface Render<Props, Events, States extends readonly string[], Derived> {
  /** The prop `x`, by its name in camelCase. */
  readonly props: { readonly [Key in keyof Props]: Read }
  /** The event `x` a press sends, by its name in camelCase. */
  readonly send: { readonly [Key in keyof Events]: Send }
  /** The value `x` the element computes, by its name in camelCase. */
  readonly derived: { readonly [Key in keyof Derived]: Read }
  /** The custom state `x`, by its name in camelCase. */
  readonly state: { readonly [Key in States[number] as Camel<Key>]: Read }
  /** Whether the slot `x` holds something, which a `<Wrap when>` and a `<View hidden>` read. */
  readonly slots: Readonly<Record<string, Read>>
  /** A value the stack computes, by its field: `stack.title` is the words of the page showing. */
  readonly stack: Computes<'drilled' | 'title'>
  /** What a copy computes: whether it copied or failed, the words it is named by, and its status. */
  readonly copy: Computes<'copied' | 'failed' | 'label' | 'status'>
  /** Whether a countdown is paused. */
  readonly countdown: Computes<'paused'>
  /** Whether a delay is still running. */
  readonly delay: Computes<'pending'>
  /** Whether a notice is deferred past the stack's `maxVisible`. */
  readonly notice: Computes<'deferred'>
  /** Whether a stack of notices shows one. */
  readonly notices: Computes<'showing'>
  /** Whether the element waits its turn in its queue. */
  readonly queue: Computes<'queued'>
  /** The list of sections an element's sections give it. */
  readonly sections: Computes<'list'>
  /** What an element a reader builds a color in computes as the color moves. */
  readonly color: Computes<
    | 'brightness'
    | 'channels'
    | 'fields'
    | 'formatLabel'
    | 'formatWord'
    | 'hue'
    | 'markX'
    | 'markY'
    | 'painted'
    | 'presets'
    | 'reading'
    | 'sampleLabel'
    | 'saturation'
    | 'square'
    | 'squareReversed'
    | 'tint'
    | 'wheelGrid'
    | 'wheelX'
    | 'wheelY'
  >
  /** What a field that opens a color picker computes from its text. */
  readonly colorField: Computes<'painted' | 'picked' | 'said'>
  /** The list of files an element a reader picks files into holds. */
  readonly files: Computes<'list'>
  /** What a tour's stop computes, and the words of its Back, Next, and Skip. */
  readonly stop: Computes<'counted' | 'name' | 'place' | 'reach' | 'said' | 'shown'> & {
    readonly words: Computes<'back' | 'next' | 'skip'>
  }
  /**
   * Where a range's value sits along its track and where its fill starts
   * and ends, each 0 to 1, its value as a number, and its value as a reader
   * sees it and as a screen reader says it. A score picked from a row of
   * steps computes how many marks it fills whole and how much of the next,
   * and a split where its divider stands, as a percentage, whether that is
   * against an edge with no pane beside it, and the least and the most a
   * screen reader hears it may take.
   */
  readonly range: Computes<
    | 'basis'
    | 'fillFrom'
    | 'fillSpan'
    | 'fillTo'
    | 'flush'
    | 'fraction'
    | 'full'
    | 'highest'
    | 'lowest'
    | 'part'
    | 'reading'
    | 'said'
    | 'spoken'
    | 'thumbs'
  >
  /** Whether the presses that clear a field and show its password are drawn, and whether it shows. */
  readonly text: Computes<'clearShown' | 'revealShown' | 'revealed'>
  /** What a total computes: whether it holds any. */
  readonly total: Computes<'holds'>
  /** The sentence a form control's verdict shows under it, or `''`. */
  readonly validation: Computes<'message'>
  /** What a tour computes, and the lit box's lengths. */
  readonly tour: Computes<'lit' | 'veiled'> & {
    readonly spotlight: Computes<'height' | 'width' | 'x' | 'y'>
  }
  /** A field of the entry a copy of a repeat over a list draws, `entry['depth-2']` where it is no name. */
  readonly entry: Readonly<Record<string, Read>>
  /** Where a copy stands among the copies a repeat draws, counting from 0. */
  readonly index: Read
}

/** The features a source declares, each an object of its fields. */
type Passed = Omit<Headless, 'derived' | 'events' | 'item' | 'name' | 'props' | 'states' | 'tree'>

/** A source written with `render`, typed so a style table is checked against its props and states. */
export type RenderedHeadless<Props, States extends readonly string[], Derived> = Omit<
  Headless,
  'derived' | 'props' | 'states' | 'tree'
> & {
  readonly derived: { readonly [Key in keyof Derived & string as Kebab<Key>]: Derived[Key] }
  readonly props: PropsList<Props>
  readonly states: States
  readonly tree: readonly Rendered[]
}

/** `dismissLabel` as `dismiss-label`, at runtime. */
const kebab = (key: string): string => key.replace(/[A-Z]/g, (upper) => `-${upper.toLowerCase()}`)

/** Whether a value is a prop's spec. */
const isSpec = (value: PropValue): value is PropSpec => typeof value === 'object'

/**
 * Declares a family's headless source with its part tree last, as JSX.
 *
 * **The keys before `render` type what it reads.** `memberOf` is the
 * collection the element joins. `props`, `events`, and `derived` are objects
 * by name in camelCase, `states` an array of names in camelCase, and each
 * feature an object of its fields.
 */
export const headless = <
  const Props extends Readonly<Record<string, PropValue>> = Record<never, never>,
  const Events extends Readonly<Record<string, EventValue>> = Record<never, never>,
  const States extends readonly string[] = [],
  const Derived extends Readonly<Record<string, unknown>> = Record<never, never>,
>(
  name: string,
  body: Passed & {
    /** The collection the element joins, as `set('tabs')`. */
    readonly memberOf?: Member
    readonly props?: Props
    readonly events?: Events
    readonly states?: States
    readonly derived?: Derived
    /** The part tree, drawn from what the keys before it declare. */
    readonly render: (given: Render<Props, Events, States, Derived>) => Drawn
  },
): RenderedHeadless<Props, States, Derived> => {
  const { derived, events, memberOf, props, render, states, ...passed } = body
  return {
    ...passed,
    derived: Object.fromEntries(
      Object.entries(derived ?? {}).map(([key, value]) => [kebab(key), value]),
    ),
    events: Object.entries(events ?? {}).map(([key, value]) =>
      Array.isArray(value) ? { detail: value, name: kebab(key) } : { ...value, name: kebab(key) },
    ),
    ...(memberOf === undefined ? {} : { item: memberOf.item }),
    name,
    props: Object.entries(props ?? {}).map(([key, value]) =>
      isSpec(value)
        ? { ...value, name: kebab(key) }
        : { default: value, name: kebab(key), type: typeof value },
    ),
    render,
    states: states ?? [],
    tree: [],
  } as unknown as RenderedHeadless<Props, States, Derived>
}

/** The collection an element joins, as `memberOf` takes it. */
export interface Member {
  readonly item: NonNullable<Headless['item']>
}

/**
 * The collection an element joins, by its family, as `item()` says.
 * Pressing the element chooses it where a `<Pressable>` in its render says
 * `chooses`, which `helix system` reads from the render, so it is said once.
 */
export const set = (of: string, extra: Omit<NonNullable<Headless['item']>, 'of'> = {}): Member => ({
  item: { of, ...extra },
})

const spec = <Type extends PropType>(
  type: Type,
  fallback?: boolean | number | string,
): PropSpec<Type> =>
  (fallback === undefined ? { type } : { default: fallback, type }) as PropSpec<Type>

/** A string prop with no default. */
export const string = (): PropSpec<'string'> => spec('string')

/** A boolean prop with no default. */
export const boolean = (): PropSpec<'boolean'> => spec('boolean')

/** A number prop with no default. */
export const number = (): PropSpec<'number'> => spec('number')

/** A prop that holds a number or a string, as a badge's `value` holds `8` or `New`, with its default where it has one. */
export const numberOrString = (fallback?: number | string): PropSpec<'number | string'> =>
  spec('number | string', fallback)

/** A prop that holds an object, which the web's attribute writes as JSON. */
export const object = (): PropSpec<'object'> => spec('object')

/**
 * A prop that holds a function the element calls, by the signature a phone's
 * component types it with, written out whole, as a file input's `validate`.
 * No attribute holds one, so it is a property alone.
 */
export const callback = (signature: string): PropSpec<{ readonly function: string }> =>
  ({ attribute: false, type: { function: signature } }) as PropSpec<{ readonly function: string }>

/** A prop that holds a moment, as `tree.ts` says of `time`, with its default where it has one. */
export const time = (fallback?: string): PropSpec<'time'> => spec('time', fallback)

/**
 * A prop that takes one of `values`, with `fallback` as its default where it
 * has one. A prop that takes `true` as one of them is off by default with
 * `false`, as a flex's `wrap`.
 */
export const oneOf = <const Values extends readonly (string | true)[]>(
  values: Values,
  fallback?: Exclude<Values[number], true> | (true extends Values[number] ? false : never),
): PropSpec<Values> => spec(values, fallback)

/** A prop that is a property only on the web element, with no attribute, such as `expanded`. */
export const property = (value: PropValue): PropSpec =>
  ({ ...(isSpec(value) ? value : spec(typeOf(value), value)), attribute: false }) as PropSpec

/** A prop or an event only the web element has. */
export function web<const Value extends PropValue>(value: Value): PropSpec<TypeOf<Value>>
export function web(value: EventValue): Omit<Event, 'name'>
export function web(value: PropValue | EventValue): PropSpec | Omit<Event, 'name'> {
  if (Array.isArray(value)) {
    return { detail: value, platform: 'web' }
  }
  if (typeof value === 'object' && !('type' in value)) {
    return { ...value, platform: 'web' }
  }
  const prop = value as PropValue
  return { ...(isSpec(prop) ? prop : spec(typeOf(prop), prop)), platform: 'web' } as PropSpec
}

/** An event a handler may cancel, with the fields of its detail. */
export const cancelable = (detail: readonly string[] = []): Omit<Event, 'name'> => ({
  cancelable: true,
  detail,
})

/** An event the web sends under its own name, as `change`, with the fields of its detail. */
export const bare = (detail: readonly string[] = []): Omit<Event, 'name'> => ({
  bare: true,
  detail,
})

/** The type a literal default says. */
const typeOf = (value: boolean | number | string): 'boolean' | 'number' | 'string' =>
  typeof value as 'boolean' | 'number' | 'string'

/* The nodes. Each is declared for the editor and returns nothing a reader
   uses: `helix system` reads the JSX as syntax. */

const node = (): Drawn => ({}) as Drawn

/** What every node takes. */
interface Common {
  /** `web` for a node only the web draws, `native` for one only a phone draws. */
  readonly platform?: 'native' | 'web'
  /**
   * A `data-` attribute the part carries, which its style table reads by
   * its name, as a badge's indicator is `data-dot` while it draws a dot.
   * Written as HTML writes it, since it is the attribute the web element
   * puts on the part: a word of the vocabulary in its place would be a
   * second name for the same attribute.
   */
  readonly [data: `data-${string}`]: Given
}

/** What a node a screen reader reaches as one thing takes. */
interface Named extends Common {
  readonly also?: Readonly<Record<string, boolean | Read | undefined>>
  /** Out of what a screen reader reaches, with what it holds: `aria-hidden`. */
  readonly ariaHidden?: boolean | Read
  readonly busy?: Given
  readonly describedby?: string
  readonly description?: Given
  readonly label?: Given
  /**
   * The regions whose words name the node, separated by spaces, where the
   * node's own part name reads its `label`, as a stepper is named by
   * `labelledby="decrement label"`: "Decrease Guests".
   */
  readonly labelledby?: string
  readonly readonly?: Given
  readonly required?: Given
  readonly role?: Given
  readonly valuemax?: Given
  readonly valuemin?: Given
  readonly valuenow?: Given
  readonly valuetext?: Given
}

/** A box that draws another element, by its tag without `helix-`. */
interface Drawing {
  readonly bubbles?: string
  readonly draws?: string
  readonly exports?: Readonly<Record<string, boolean | string | Read | undefined>>
  readonly gives?: Readonly<Record<string, boolean | string | Read | undefined>>
  readonly into?: string
}

/** A box: a part that groups or draws, as `box()` says. */
export interface ViewAttributes extends Named, Drawing {
  readonly children?: Child
  readonly style?: Style
  readonly current?: Given
  /** Whether a reader can move it, where its role is `slider`, `spinbutton`, or a range's `radiogroup`. */
  readonly disabled?: Given
  readonly element?: Given
  readonly hidden?: Given
  /** A glyph a phone draws in the box, by its name. */
  readonly icon?: Given
  /** The box stands at the item its set has selected, as a tab set's moving mark does. */
  readonly indicator?: boolean
  readonly inert?: Given
  readonly level?: number | Read
  readonly lines?: Given
  /**
   * Whether the box shows, where it stays drawn while closed, as a
   * `<details>`'s content does: `hidden="until-found"` and `inert` on the
   * web while it does not.
   */
  readonly open?: Given
  readonly orientation?: Given
  readonly part: string
  readonly run?: boolean
  readonly translate?: 'no'
}

/** A box. */
export const View = (_: ViewAttributes): Drawn => node()

/** Words a node says: a prop's, a computed value's, or a field of a repeat's entry. */
export interface TextAttributes extends Common {
  readonly ariaHidden?: boolean | Read
  readonly children?: Read | Derivation | string | undefined
  readonly label?: Given
  readonly lines?: Given
  readonly part: string
  readonly widest?: Readonly<Record<string, boolean | Read | undefined>>
}

/** Words drawn as text, as `text()` says. */
export const Text = (_: TextAttributes): Drawn => node()

/** A picture loaded from its `src`, as `image()` says. */
export interface ImageAttributes extends Common {
  readonly alt?: Given
  readonly empty?: 'error' | 'loading'
  /** The event sent once the picture fails to load. */
  readonly onError?: string
  /** The event sent once the picture has loaded. */
  readonly onLoad?: string
  readonly part: string
  readonly src?: Given
}

/** A picture. */
export const Image = (_: ImageAttributes): Drawn => node()

/** What a person presses, as `pressable()` says. */
export interface PressableAttributes extends Named {
  readonly checked?: Given
  readonly children?: Child
  /** The press empties the element's field, as its `entry` says. */
  readonly clears?: boolean
  readonly reveals?: boolean
  readonly copies?: boolean
  readonly current?: Given
  readonly disabled?: Given
  readonly expanded?: Given
  readonly 'focusable-when-disabled'?: Given
  readonly href?: Given
  readonly into?: string
  /** The event a press sends first. */
  readonly onPress?: Send
  readonly part: string
  /** The press opens the picker of the element's `files`. */
  readonly picks?: boolean
  readonly popup?: Given
  /** The one key that presses it, where Enter and Space do not both, as Space alone presses a checkbox. */
  readonly pressKey?: 'enter' | 'space'
  readonly pressed?: Given
  /** The press takes the file of its row out of the element's `files`. */
  readonly removes?: boolean
  readonly scrolls?: 'end' | 'start'
  readonly selected?: Given
  /** The press asks the collection its element joins to select it. */
  readonly selects?: boolean
  /** The press steps the element's range down or up, and again while it is held. */
  readonly steps?: 'down' | 'up'
  readonly toggles?: boolean
}

/** A press. */
export const Pressable = (_: PressableAttributes): Drawn => node()

/**
 * Text a reader types, as `field()` says: an `<input>`, or a `<textarea>`
 * where it is `multiline`, on the web, and React Native's `TextInput` on a
 * phone. Its text is what the element's `entry` holds.
 *
 * **Each attribute takes the web's word, and a phone maps it.** `type` picks
 * the keyboard and hides a password, `inputMode` and `enterKeyHint` pick the
 * keyboard and its Enter key, and `autoComplete` the platform's autofill.
 */
export interface TextInputAttributes extends Common {
  readonly autoCapitalize?: Given
  readonly autoComplete?: Given
  readonly autoCorrect?: Given
  /** A field of several lines grows with its text, to `maxRows` lines. */
  readonly autoGrow?: Given
  /** The regions whose words describe the field, as its hint. */
  readonly describedby?: string
  readonly disabled?: Given
  readonly enterKeyHint?: Given
  readonly inputMode?: Given
  readonly label?: Given
  /** The region whose words name the field, as its label. */
  readonly labelledby?: string
  readonly maxLength?: Given
  readonly maxRows?: Given
  /** Several lines, a `<textarea>` on the web. */
  readonly multiline?: boolean
  readonly part: string
  readonly placeholder?: Given
  readonly readonly?: Given
  readonly required?: Given
  /** `spinbutton` alone, for a number a reader types and steps, which its `range` holds. */
  readonly role?: 'spinbutton'
  /** How many lines tall a field of several lines stands. */
  readonly rows?: Given
  readonly type?: Given
  readonly valuemax?: Given
  readonly valuemin?: Given
  readonly valuenow?: Given
  readonly valuetext?: Given
}

/** A field a reader types into. */
export const TextInput = (_: TextInputAttributes): Drawn => node()

/** Content passed in, as `region()` says: the default region, or the one `name` names. */
export interface SlotAttributes extends Common {
  readonly ariaHidden?: boolean | Read
  /** What is drawn while nothing is passed in. */
  readonly children?: Child
  readonly hidden?: Given
  readonly lazy?: Given
  readonly name?: string
  readonly names?: boolean
  readonly part?: string
}

/** A region. */
export const Slot = (_: SlotAttributes): Drawn => node()

/** What the element opens over the page, as `layer()` says. */
export interface LayerAttributes extends Common {
  readonly alone?: boolean
  readonly style?: Style
  readonly also?: Readonly<Record<string, boolean | Read | undefined>>
  readonly anchor?: string
  /** What a press drawn in the anchor does to the layer once its own event stands. */
  readonly anchorPress?: 'close' | 'none' | 'toggle' | Read
  readonly ariaHidden?: boolean | Read
  readonly arrow?: string
  readonly arrows?: Given
  readonly band?: boolean
  readonly children?: Child
  readonly closedby?: Given
  readonly 'cross-offset'?: Given
  readonly describedby?: string
  readonly description?: Given
  readonly flip?: Given
  readonly hint?: Given
  /** When opening moves focus into the layer, as a dialog's `initialFocus` says where it lands. */
  readonly initialFocus?: 'always' | 'down' | 'press'
  readonly label?: Given
  readonly labelledby?: string
  /** A long press of a press drawn in the anchor opens the layer. */
  readonly longPress?: Given
  readonly modal?: Given
  readonly notice?: Given
  readonly offset?: Given
  readonly open?: Given
  readonly part: string
  readonly placement?: Given
  readonly presentation?: Given
  readonly refuses?: Given
  /** When closing gives focus back to the anchor. */
  readonly restoreFocus?: 'always' | 'dismissed' | 'held'
  readonly role?: Given
  /** The edge of the window the layer stands along: `top`, `bottom`, `start`, or `end`. */
  readonly side?: Given
  /** The shares of the layer a reader can leave on screen, as a drawer's `snap-points`. */
  readonly snapPoints?: Given
  readonly swipe?: Given
  readonly target?: Given
}

/** A layer. */
export const Layer = (_: LayerAttributes): Drawn => node()

/** Words said to a screen reader, as `live()` says. */
export interface AnnounceAttributes extends Common {
  readonly arrives?: boolean
  /** What it says, where it says anything of its own. */
  readonly children?: Read | Derivation | string | undefined
  readonly follows?: string | Read
  readonly part: string
  readonly urgent?: Given
  /** Said only while this holds. */
  readonly when?: Given
}

/** Words said to a screen reader. */
export const Announce = (_: AnnounceAttributes): Drawn => node()

/** What it holds, drawn `count` times or once for each entry of a list, as `repeat()` says. */
export interface RepeatAttributes extends Common {
  readonly children?: Child
  readonly count?: number | Read
  readonly each?: Read | Derivation
  readonly key?: string
  readonly part: string
}

/** A repeat. */
export const Repeat = (_: RepeatAttributes): Drawn => node()

/**
 * A box drawn around its children, as `wrap()` says: always, or only while
 * `when` holds. With an `href`, it is the link around what it holds.
 */
export interface WrapAttributes extends Common, Drawing {
  readonly also?: Readonly<Record<string, boolean | Read | undefined>>
  readonly children?: Child
  readonly current?: Given
  readonly href?: Given
  readonly part: string
  /** What a `renders` function is given first, as a row's file. */
  readonly passes?: Given
  /**
   * The prop that holds a function whose content stands in what the wrap
   * holds, called with `passes` and the copy's place, as a file input's
   * `renderFile`. Where the prop holds none, the wrap draws what it holds.
   */
  readonly renders?: Read
  /** Drawn only while this holds. */
  readonly when?: Read | undefined
}

/** A wrap. */
export const Wrap = (_: WrapAttributes): Drawn => node()

/** A box that draws a vector, an `<svg>` on the web, at the units its `viewBox` gives. */
export interface SvgAttributes extends Named {
  readonly children?: Child
  readonly part: string
  readonly viewBox: string
}

/** A vector. */
export const Svg = (_: SvgAttributes): Drawn => node()

/** What every shape inside a vector takes. */
interface Shape extends Common {
  readonly also?: Readonly<Record<string, boolean | Read | undefined>>
  readonly ariaHidden?: boolean | Read
  readonly part: string
  readonly pathLength?: number
  readonly style?: Style
}

/** A path inside a vector. */
export const Path = (_: Shape & { readonly d: string | Read }): Drawn => node()

/** A circle inside a vector, its geometry its style table's where it gives none. */
export const Circle = (
  _: Shape & { readonly cx?: Given; readonly cy?: Given; readonly r?: Given },
): Drawn => node()

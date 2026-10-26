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
 *     <Pressable chooses disabled={props.disabled} part="tab" role="tab">
 *       <Slot part="label" />
 *     </Pressable>
 *   ),
 * })
 * ```
 *
 * **Read as syntax and never run**, as `tree.ts` says of the builder form.
 * `helix family` parses the module and rewrites it into the builder form
 * (`helix/cli/src/family/read/jsx.rs`), so both forms compile to the same
 * intermediate form while the families move.
 *
 * **What a render may hold.** The nodes below, each with its attributes. An
 * attribute or a child reads `props.x`, `derived.x`, `state.x`, or
 * `stack.x`, `!` before one, `x ? 'a' : 'b'`, and string, number, and
 * boolean literals. A child is a node, `x && <Node />`, `!x && <Node />`, or
 * `x ? <A /> : <B />`. `onPress={send.x}` sends an event. A lowercase tag is
 * refused, and so is every other expression, with its line.
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

/** A value a render reads: a prop, a computed value, a state, or a value of a stack. */
export interface Read {
  readonly [reads]: true
}

/** An event a press sends, as `send.dismiss` names it. */
export interface Send {
  readonly [sends]: true
}

/** A node a render draws. */
export interface Drawn {
  readonly [drawn]: true
}

/** What a node holds: a node, a node drawn while a value holds, or several. */
export type Child = Drawn | boolean | readonly Child[]

/** An attribute's value: a literal, or a value the render reads. */
export type Given = boolean | number | string | Read

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

/** The props as the builder form lists them, each by its attribute's name. */
type PropsList<Props> = readonly {
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

/** What a render is given, each typed from the keys before it. */
export interface Render<Props, Events, States extends readonly string[], Derived> {
  /** The prop `x`, by its name in camelCase. */
  readonly props: { readonly [Key in keyof Props]: Read }
  /** The event `x` a press sends, by its name in camelCase. */
  readonly send: { readonly [Key in keyof Events]: Send }
  /** The value `x` the element computes, by its name in camelCase. */
  readonly derived: { readonly [Key in keyof Derived]: Read }
  /** The custom state `x`. */
  readonly state: { readonly [Key in States[number]]: Read }
  /** A value the stack computes, by its field: `stack.label` is the words of the page showing. */
  readonly stack: { readonly [Key in 'drilled' | 'label']: Read }
  /** A field of the entry a copy of a repeat over a list draws. */
  readonly entry: Readonly<Record<string, Read>>
  /** Where a copy stands among the copies a repeat draws, counting from 0. */
  readonly index: Read
}

/** The keys a source written with `render` passes through as the builder form has them. */
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
 * collection the element joins. `props` and `events` are objects by name in
 * camelCase. `states`, `derived`, and every other key the builder form has
 * are written as the builder form writes them.
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
 * `chooses`, which `helix family` reads from the render, so it is said once.
 */
export const set = (
  of: string,
  extra: Omit<NonNullable<Headless['item']>, 'chooses' | 'of'> = {},
): Member => ({ item: { of, ...extra } })

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

/** A prop that holds a number or a string, as a badge's `value` holds `8` or `New`. */
export const numberOrString = (): PropSpec<'number | string'> => spec('number | string')

/** A prop that holds an object, which the web's attribute writes as JSON. */
export const object = (): PropSpec<'object'> => spec('object')

/** A prop that holds a moment, as `tree.ts` says of `time`. */
export const time = (): PropSpec<'time'> => spec('time')

/** A prop that takes one of `values`, with `fallback` as its default where it has one. */
export const oneOf = <const Values extends readonly (string | true)[]>(
  values: Values,
  fallback?: Exclude<Values[number], true>,
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
   uses: `helix family` reads the JSX as syntax. */

const node = (): Drawn => ({}) as Drawn

/** What every node takes. */
interface Common {
  /** `web` for a node only the web draws, `native` for one only a phone draws. */
  readonly platform?: 'native' | 'web'
}

/** What a node a screen reader reaches as one thing takes. */
interface Named extends Common {
  readonly also?: Readonly<Record<string, boolean | Read>>
  /** Out of what a screen reader reaches, with what it holds: `aria-hidden`. */
  readonly ariaHidden?: boolean | Read
  readonly busy?: Given
  readonly describedby?: string
  readonly description?: Given
  readonly invalid?: Given
  readonly label?: Given
  readonly labelledby?: string
  readonly readonly?: Given
  readonly required?: Given
  readonly role?: string
  readonly roledescription?: Given
  readonly valuemax?: Given
  readonly valuemin?: Given
  readonly valuenow?: Given
  readonly valuetext?: Given
}

/** A box that draws another element, by its tag without `helix-`. */
interface Drawing {
  readonly bubbles?: string
  readonly draws?: string
  readonly exports?: Readonly<Record<string, boolean | string | Read>>
  readonly gives?: Readonly<Record<string, boolean | string | Read>>
  readonly into?: string
}

/** A box: a part that groups or draws, as `box()` says. */
export interface ViewAttributes extends Named, Drawing {
  readonly children?: Child
  readonly closed?: Given
  readonly current?: Given
  readonly element?: string
  readonly hidden?: Given
  /** A glyph a phone draws in the box, by its name. */
  readonly icon?: Given
  readonly inert?: Given
  readonly level?: number
  readonly lines?: Given
  readonly marks?: 'chosen'
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
  readonly children: Read | string
  readonly label?: Given
  readonly lines?: Given
  readonly part: string
  readonly widest?: Readonly<Record<string, boolean | Read>>
}

/** Words drawn as text, as `text()` says. */
export const Text = (_: TextAttributes): Drawn => node()

/** A picture loaded from its `src`, as `image()` says. */
export interface ImageAttributes extends Common {
  readonly alt?: Given
  readonly empty?: 'error' | 'loading'
  readonly fails?: string
  readonly loads?: string
  readonly part: string
  readonly src?: Given
}

/** A picture. */
export const Image = (_: ImageAttributes): Drawn => node()

/** What a person presses, as `pressable()` says. */
export interface PressableAttributes extends Named {
  readonly checked?: Given
  readonly children?: Child
  /** The press asks the collection its element joins to choose it. */
  readonly chooses?: boolean
  readonly copies?: boolean
  readonly current?: Given
  readonly disabled?: Given
  readonly expanded?: Given
  readonly 'focusable-when-disabled'?: Given
  readonly held?: Given
  readonly href?: Given
  readonly into?: string
  readonly keys?: 'enter' | 'space'
  /** The event a press sends first. */
  readonly onPress?: Send
  readonly part: string
  readonly popup?: Given
  readonly pressed?: Given
  readonly scrolls?: 'end' | 'start'
  readonly selected?: Given
  readonly toggles?: boolean
}

/** A press. */
export const Pressable = (_: PressableAttributes): Drawn => node()

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
  readonly also?: Readonly<Record<string, boolean | Read>>
  readonly anchor?: string
  readonly ariaHidden?: boolean | Read
  readonly arrow?: string
  readonly arrows?: Given
  readonly band?: boolean
  readonly children?: Child
  readonly closedby?: Given
  readonly 'cross-offset'?: Given
  readonly describedby?: string
  readonly description?: Given
  readonly edge?: Given
  readonly enters?: 'always' | 'down' | 'press'
  readonly flip?: Given
  readonly hint?: Given
  readonly holds?: Given
  readonly label?: Given
  readonly labelledby?: string
  readonly modal?: Given
  readonly notice?: Given
  readonly offset?: Given
  readonly open?: Given
  readonly part: string
  readonly placement?: Given
  readonly presentation?: Given
  readonly presses?: 'close' | 'none' | 'toggle' | Read
  readonly refuses?: Given
  readonly returns?: 'always' | 'dismissed' | 'held'
  readonly role?: string
  readonly roledescription?: Given
  readonly snap?: Given
  readonly swipe?: Given
  readonly target?: Given
}

/** A layer. */
export const Layer = (_: LayerAttributes): Drawn => node()

/** Words said to a screen reader, as `live()` says. */
export interface AnnounceAttributes extends Common {
  readonly arrives?: boolean
  readonly children: Read | string
  readonly follows?: string
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
  readonly each?: Read
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
  readonly also?: Readonly<Record<string, boolean | Read>>
  readonly children?: Child
  readonly current?: Given
  readonly href?: Given
  readonly part: string
  /** Drawn only while this holds. */
  readonly when?: Read
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
  readonly ariaHidden?: boolean | Read
  readonly part: string
  readonly pathLength?: number
}

/** A path inside a vector. */
export const Path = (_: Shape & { readonly d: string }): Drawn => node()

/** A circle inside a vector. */
export const Circle = (
  _: Shape & { readonly cx: Given; readonly cy: Given; readonly r: Given },
): Drawn => node()

/** An ellipse inside a vector. */
export const Ellipse = (
  _: Shape & { readonly cx: Given; readonly cy: Given; readonly rx: Given; readonly ry: Given },
): Drawn => node()

/** A line inside a vector. */
export const Line = (
  _: Shape & { readonly x1: Given; readonly x2: Given; readonly y1: Given; readonly y2: Given },
): Drawn => node()

/** A rectangle inside a vector. */
export const Rect = (
  _: Shape & {
    readonly height: Given
    readonly rx?: Given
    readonly ry?: Given
    readonly width: Given
    readonly x?: Given
    readonly y?: Given
  },
): Drawn => node()

/**
 * A style table written as groups of rules, each group on one target, checked
 * against the family's headless source as it is typed.
 *
 * ```ts
 * import { token } from '../../../style.js'
 * import { styles } from '../../../table.js'
 * import button from './headless.js'
 *
 * export default styles(
 *   button,
 *   { prefix: 'button', hooks: ['background-color'], own: ['button-fill'], stylesheet: '…' },
 *   ({ hook, on, own, rule }) => [
 *     on('button', [
 *       rule({ emphasis: 'solid' }, {
 *         backgroundColor: hook.backgroundColor(own.fill),
 *         own: { fill: token('color-primary') },
 *       }),
 *     ]),
 *   ],
 * )
 * ```
 *
 * **Read as syntax and never run**, as `style.ts` says. `helix family`
 * rewrites a table into the shape `rules.ts` describes before it reads
 * anything else (`helix/cli/src/family/ir/sugar`).
 *
 * - `on(target, [...])` is a group: every rule in it is on the target. A
 *   target is `'host'`, a part, a part a box exports, `select-all-box`, an
 *   array of parts, `{ region }` or `{ region, slotted }` for the children
 *   passed in, `{ slotted: tag }` for the children the host styles, `{ part,
 *   slotted: '*' }` for the content passed in through a part that is a
 *   region's slot, `{ before: part }` and `{ after: part }` for the
 *   pseudo-elements, `{ backdrop: layer }` for a layer's scrim, `{ part,
 *   exact: true }` for the part alone, and, on the web alone, `{ part, inner }`
 *   for a descendant the tree does not draw and `{ part, selector }`.
 * - `rule(set)` or `rule(when, set)`. `platform` and `supports` are
 *   conditions in `when`, and every alternative of a `when` says the same.
 * - `variants(prop, { value: set })` is one rule per value of `prop`.
 * - `set` is an object: a CSS property in camelCase, `backgroundColor`; a
 *   custom property quoted, `'--icon-size'`; and `own: { fill: … }`, the
 *   private values the rule sets. Its order is the cascade's, which is why
 *   these files keep their keys in the order written: `all` first, and a
 *   shorthand before its own longhands. An array of such objects and imported
 *   fragments of declarations takes the fragment's in where it stands.
 * - `hook.backgroundColor(fallback)` reads a hook `hooks` declares, and
 *   `own.fill` a private value `own` declares, its name less the family's
 *   prefix in camelCase; another family's keeps its whole name,
 *   `own.fieldControlInlineSize`. `own.fill(fallback)` gives it a fallback.
 * - `hooks` may be each hook's default by its name in camelCase, `null` for
 *   one with none, as `({ own }) => ({ radius: first(own.tabRadius, 0) })`,
 *   and `own` each private value's by its whole name in camelCase. A rule
 *   reads `hook.radius` with the default, and `hook.radius(x)` with its own.
 * - A set's `web: { cursor: 'pointer' }` holds declarations a phone does not
 *   have, and `web([...])` and `native([...])` in a group hold rules one
 *   platform's alone.
 * - Over a headless source written with `render`, a name alone in a `when`
 *   is a prop, a state, or an attribute of the part the rule is on, which
 *   the compiler resolves from the source.
 * - `include(fragment)` takes in a fragment of rules imported from
 *   `src/fragments`, and `keyframes(name, { to: { rotate: '1turn' } })` is an
 *   animation.
 * - The rules function may declare `const`s before one `return`, and an
 *   object or an array may spread a constant the module or the function
 *   names.
 *
 * The value helpers are `style.ts`'s, beside the given `hook` and `own`:
 * `token`, `mix`, `list`, `web`, `derive`, `fit`, `measured`, `product`, `sum`,
 * `difference`, `quotient`, `fn`, `safeArea`, `scheme`, `quote`, `inherit`,
 * `inherited` and `hookOf`.
 *
 * **What the editor refuses**: a part the tree does not draw, a region it
 * does not hold, a `when` key that is none of the family's props, states or
 * the conditions every rule takes, a value a prop cannot hold, a CSS property
 * that does not exist, a hook or a private value the source does not
 * declare, and a fragment that styles a part the tree does not draw. The
 * compiler refuses the same names, a declared one no rule uses, and two rules
 * in different groups that compete for one property on one node.
 */

import type { Properties } from 'csstype'
import type { PropsList, PropValue, Rendered } from './render.js'
import type { Around, When as Conditions, Family, Holds, Interaction } from './rules.js'
import type { Read, Tagged, Value } from './style.js'
import type { Headless, Prop } from './tree.js'

/** A lost `csstype` import makes `Properties` empty and passes every property: this fails instead. */
type Resolved = Properties extends Record<string, never> ? never : true
export const csstypeResolved: Resolved = true

/** `background-color` as `backgroundColor`. */
export type Camel<Name extends string> = Name extends `${infer Head}-${infer Tail}`
  ? `${Head}${Capitalize<Camel<Tail>>}`
  : Name

/**
 * Every part a tree draws: each node's name but a region's or a `when`'s, a
 * region's `part`, the parts a node is as well through `also`, and the parts
 * of an element a box draws, as its `exports` names them: `select-all-box`.
 */
export type PartsOf<Tree> = Tree extends readonly Rendered[]
  ? string
  : Tree extends readonly unknown[]
    ? PartOf<Tree[number]>
    : never
type PartOf<One> = One extends { readonly kind: infer Kind; readonly name: infer Name }
  ? string extends Name
    ? never
    :
        | (Kind extends 'region' | 'when' ? never : Name)
        | (One extends { readonly attributes: { readonly part: infer Part } } ? Part : never)
        | (One extends { readonly attributes: { readonly also: infer Also } }
            ? keyof Also & string
            : never)
        | (One extends { readonly attributes: { readonly exports: infer Exports } }
            ? `${Name & string}-${keyof Exports & string}`
            : never)
        | (One extends { readonly children?: infer Children } ? PartsOf<Children> : never)
  : never

/** Every part a node is as well, through `also`, as a mark is `mark-dash`. */
export type AliasesOf<Tree> = Tree extends readonly Rendered[]
  ? string
  : Tree extends readonly unknown[]
    ? AliasOf<Tree[number]>
    : never
type AliasOf<One> = One extends { readonly kind: unknown; readonly name: infer Name }
  ? string extends Name
    ? never
    :
        | (One extends { readonly attributes: { readonly also: infer Also } }
            ? keyof Also & string
            : never)
        | (One extends { readonly children?: infer Children } ? AliasesOf<Children> : never)
  : never

/** Every region a tree holds, by its slot's name. */
export type RegionsOf<Tree> = Tree extends readonly Rendered[]
  ? string
  : Tree extends readonly unknown[]
    ? RegionOf<Tree[number]>
    : never
type RegionOf<One> = One extends { readonly kind: infer Kind; readonly name: infer Name }
  ? string extends Name
    ? never
    :
        | (Kind extends 'region' ? Name : never)
        | (One extends { readonly children?: infer Children } ? RegionsOf<Children> : never)
  : never

/**
 * What a `when` may ask of a prop. `false` is the prop absent, and `true`
 * present; `{ not }` refuses a value, for a prop of any type.
 */
type Asks<Type> = Type extends readonly (infer Values)[]
  ?
      | boolean
      | Exclude<Values, true>
      | readonly Exclude<Values, true>[]
      | { readonly not: Exclude<Values, true> | readonly Exclude<Values, true>[] }
  : boolean | string | { readonly not: string | readonly string[] }

/** The conditions every rule takes, without the index signature that lets a prop's name through. */
type Common = { [Key in keyof Conditions as string extends Key ? never : Key]: Conditions[Key] }

/** The parts of a headless source the rules are checked against. */
type Source = Pick<Headless, 'props' | 'states' | 'tree'> & {
  readonly derived?: Readonly<Record<string, unknown>>
}

/**
 * The states a rule names, in camelCase as the source declares them: the
 * custom states, and the values the element computes.
 */
export type StatesOf<H extends Source> =
  | Camel<H['states'][number]>
  | (H extends { readonly derived: infer Derived } ? Camel<keyof Derived & string> : never)

/** What a `when` may ask of each prop, by its name in camelCase. */
type AsksOf<P extends Prop> = { readonly [One in P as Camel<One['name']>]?: Asks<One['type']> }

/** An interaction on the host that a rule on a part may ask for, any of several in an array. */
type HostAround = Around

/**
 * The conditions a rule applies under: the family's props, its states, and what every rule takes.
 *
 * Over a headless source written with `render`, a name alone is a prop, a
 * state, or an attribute of the part the rule is on, which the compiler
 * resolves from the source: `{ hover: true, disabled: false }`.
 */
export type When<Asked, State extends string, Part extends string, Alias extends string> = Omit<
  Common,
  'also' | 'holds' | 'state' | 'within'
> &
  Asked &
  (string extends State ? unknown : { readonly [Name in State]?: boolean }) & {
    /** The part's own `hidden` or `href`, over a source written with `render`. */
    readonly hidden?: boolean
    readonly href?: boolean
    /** A `data-` attribute the part carries, present, absent, or holding a value, over a source written with `render`. */
    readonly [data: `data-${string}`]: boolean | string | undefined
    /** Where the node is the part `name` as well, or is not. */
    readonly also?: Readonly<Partial<Record<Alias, boolean>>>
    readonly holds?: Partial<Record<Part, boolean | Interaction | readonly Interaction[]>> & Holds
    /** The web's alone, or a phone's alone. */
    readonly platform?: 'native' | 'web'
    /** A feature query around the rule, on the web. */
    readonly supports?: string
    /**
     * A part the target is drawn inside, with what holds of it, or `host`,
     * for the host's own interaction on a part: `:host(:hover) [part="x"]`.
     */
    /*
     * On `host`, an array is any one of several interactions:
     * `within: { host: ['hover', 'focusWithin'] }`.
     */
    readonly within?:
      | Part
      | Readonly<
          Partial<
            Record<
              Part | 'host',
              HostAround | readonly ('active' | 'focusVisible' | 'focusWithin' | 'hover')[]
            >
          >
        >
  }

/** The host, or a part. */
type One<Part extends string> = 'host' | Part

/** What a group is on, wholly: which nodes its rules match. */
export type Target<Part extends string, Region extends string> =
  | One<Part>
  | readonly Part[]
  /* `slotted`: the children passed in, `'*'` or by their tag. */
  | { readonly region: Region | '*' | readonly Region[]; readonly slotted?: string }
  | { readonly slotted: string }
  /* The content passed into a region, through the part that is its slot. */
  | { readonly part: Part | readonly Part[]; readonly slotted: '*' }
  | { readonly before: One<Part> }
  | { readonly after: One<Part> }
  /* The scrim a layer draws behind itself, `::backdrop` on the web. */
  | { readonly backdrop: Part }
  | { readonly part: Part; readonly exact: true }
  /* The web's alone: a descendant the tree does not draw, `svg` or `> *`. */
  | { readonly part: One<Part>; readonly inner: string }
  /* The web's alone, and opaque to the compiler's checks: the last resort. */
  | { readonly part: One<Part>; readonly selector: string }

/** CSS properties in camelCase, each a value. */
type Css = { readonly [Key in keyof Properties]?: Value }

/** A rule's declarations: CSS properties, custom properties, and the private values it sets. */
export type Set<Own extends string> = Css & {
  readonly own?: { readonly [Key in Own]?: Value }
  /** Declarations a phone does not have, such as `cursor` and `font`, written where they stand. */
  readonly web?: Css
} & { readonly [custom: `--${string}`]: Value }

declare const written: unique symbol

/** One rule, as `rule()` writes it. */
export interface Rule {
  readonly [written]: 'rule'
}

/** What a rules function returns: a group, an animation, or a fragment taken in. */
export interface Group {
  readonly [written]: 'group'
}

/** A fragment of rules, with the parts every family that takes it in draws. */
export interface Fragment<Need extends string, Props extends string = never> {
  readonly [written]: 'fragment'
  readonly need: Need
  readonly props: Props
}

/** A fragment of declarations, which a rule's `set` takes in. */
export interface Declarations {
  readonly [written]: 'declarations'
}

/** A private value: a value, with the header's default, and with a fallback when called. */
export type OwnValue = Extract<Read, { readonly own: string }> & ((fallback: Value) => Tagged)

/** A hook: a value, with the header's default, and with a fallback of the site's own when called. */
export type HookValue = Extract<Read, { readonly hook: string }> & ((fallback?: Value) => Tagged)

/** The defaults a header gives, by name in camelCase, `null` for one with none. */
type Defaults = Readonly<Record<string, Value | null>>

/**
 * A table's hooks: each one's default by its name in camelCase, `null` for
 * one with none, given the private values to read.
 */
type HooksField<Own extends string> =
  | Defaults
  | ((given: { readonly own: { readonly [Key in Own]: OwnValue } }) => Defaults)

/** The hooks a `hooks` field declares, as the rules read them. */
type HookKeys<Field> = Field extends (given: never) => infer Returned
  ? keyof Returned & string
  : keyof Field & string

/** The values a prop's `when` may ask for, as strings, which `variants` keys. */
type ValuesOf<Asked, Key extends keyof Asked> = Extract<NonNullable<Asked[Key]>, string>

/**
 * What the rules function is given, by what it is checked against: the
 * parts and regions, the `when` keys, the states, the hooks and the private
 * values, each as the rules write it.
 */
export interface Given<
  Part extends string,
  Region extends string,
  Asked,
  State extends string,
  Hook extends string,
  Own extends string,
  Alias extends string = never,
> {
  /** Each hook `hooks` declares, by its name in camelCase. */
  readonly hook: { readonly [Key in Hook]: HookValue }
  /** A fragment of rules, which must style only parts this tree draws. */
  readonly include: <Need extends Part | 'host', Props extends keyof Asked & string = never>(
    fragment: Fragment<Need, Props>,
  ) => Group
  /** An animation and its frames, each an object of declarations. */
  readonly keyframes: (name: string, frames: Readonly<Record<string, Css>>) => Group
  /** A group: every rule in it is on `target`. */
  readonly on: (target: Target<Part, Region>, rules: readonly Rule[]) => Group
  /** Each private value `own` declares, by its whole name in camelCase. */
  readonly own: { readonly [Key in Own]: OwnValue }
  /** One rule. */
  readonly rule: {
    (set: Set<Own> | readonly (Declarations | Set<Own>)[]): Rule
    (
      when: When<Asked, State, Part, Alias> | readonly When<Asked, State, Part, Alias>[],
      set: Set<Own> | readonly (Declarations | Set<Own>)[],
    ): Rule
  }
  /** One rule per value of `prop`, in the order written. */
  readonly variants: <Key extends keyof Asked & string>(
    prop: Key,
    entries: { readonly [Value in ValuesOf<Asked, Key>]?: Set<Own> },
  ) => Rule
}

/** Kebab case from camelCase, for the helpers' runtime values. */
const kebab = (key: string): string => key.replace(/[A-Z]/g, (upper) => `-${upper.toLowerCase()}`)

/**
 * The values the editor sees at runtime. The compiler never runs them: it
 * reads the call as syntax and rewrites it.
 */
const given = (): Record<string, unknown> => ({
  hook: new Proxy(
    {},
    {
      get: (_, key: string) =>
        Object.assign(
          (fallback?: Value) =>
            fallback === undefined ? { hook: kebab(key) } : { fallback, hook: kebab(key) },
          { hook: kebab(key) },
        ),
    },
  ),
  include: (fragment: unknown) => ({ include: fragment }),
  keyframes: (name: string, frames: object) => ({ frames, keyframes: name }),
  on: (target: unknown, rules: readonly unknown[]) => ({ on: target, rules }),
  own: new Proxy(
    {},
    {
      get: (_, key: string) =>
        Object.assign((fallback: Value) => ({ fallback, own: kebab(key) }), {
          own: kebab(key),
        }),
    },
  ),
  rule: (...rule: unknown[]) => ({ rule }),
  variants: (prop: string, entries: object) => ({ entries, variants: prop }),
})

/** Declares an element's styled tier, `styles(headless, declared, rules)`, its names inferred. */
export const styles = <
  const H extends Source,
  const Prefix extends string,
  /* No default: a header's `({ own }) => ({...})` takes its parameter's type from this constraint. */
  const Hooks extends HooksField<keyof Own & string>,
  const Own extends Defaults = Record<never, never>,
  const StyledProps extends Readonly<Record<string, PropValue>> = Record<never, never>,
>(
  _headless: H,
  declared: {
    /** The hooks' prefix, `--<prefix>-...`, which is not always the element's name. */
    readonly prefix: Prefix
    /**
     * Each hook's default by its name in camelCase, `null` for one with none,
     * which a rule reads as `hook.color` and overrides at its site as
     * `hook.color(fallback)`. The web's name is `--<prefix>-color`.
     */
    readonly hooks?: Hooks
    /** The element drawn under this one, `icon-button`, whose rules a phone lays first. */
    readonly over?: string
    /**
     * Each private value's default by its whole name in camelCase, `null`
     * for one with none, which a rule reads as `own.tabJustify` and the web
     * names `--_tab-justify`: the table's own, and another family's it reads
     * or sets.
     */
    readonly own?: Own
    /** The props only the styled tier has, by name in camelCase, as a headless source declares its own. */
    readonly props?: StyledProps
    readonly stylesheet: string
  },
  rules: (
    given: Given<
      PartsOf<H['tree']> & string,
      RegionsOf<H['tree']> & string,
      AsksOf<H['props'][number] | PropsList<StyledProps>[number]>,
      StatesOf<H>,
      HookKeys<Hooks>,
      keyof Own & string,
      AliasesOf<H['tree']> & string
    >,
  ) => readonly Group[],
): Family => {
  return {
    name: declared.prefix,
    props: [],
    rules: rules(given() as never) as unknown as Family['rules'],
    stylesheet: declared.stylesheet,
  }
}

/**
 * A fragment of rules several families take in: `parts` names what it
 * styles, and every family that takes it in must draw them; `props` names
 * the includer's props its rules ask of, which every includer must have. Its hooks are
 * the includer's, and its private values keep their whole names.
 */
export const fragment = <
  const Need extends string,
  const Hooks extends Defaults = Record<never, never>,
  const Own extends Defaults = Record<never, never>,
  const Props extends string = never,
>(
  name: string,
  declared: {
    readonly parts: readonly Need[]
    /** The includer's hooks the rules read, each by its name in camelCase. */
    readonly hooks?: Hooks
    /** The private values the rules read or set, each by its whole name in camelCase. */
    readonly own?: Own
    /** The includer's props the rules ask of, which every includer has. */
    readonly props?: readonly Props[]
  },
  rules: (
    given: Omit<
      Given<
        Need,
        never,
        { readonly [Key in Props]?: Asks<string[]> },
        string,
        keyof Hooks & string,
        keyof Own & string,
        string
      >,
      'include' | 'variants'
    >,
  ) => readonly Group[],
): Fragment<Need, Props> =>
  ({
    name,
    need: declared.parts,
    rules: rules(given() as never),
  }) as unknown as Fragment<Need>

/** A fragment of declarations, which a rule's `set` takes in where it stands. */
export const declarations = (name: string, set: Css): Declarations =>
  ({ name, set }) as unknown as Declarations

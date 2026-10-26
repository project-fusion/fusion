/**
 * The shape a style table compiles to: what each rule is on, when it
 * applies, and what it sets. A table is written with `styles()` in
 * `table.ts`, which `helix family` rewrites into this shape, and the `When`
 * here is what every rule's conditions may say.
 *
 * **Each condition has a web output and a native meaning, or says it has
 * none.** Print, forced colors and an element that has not upgraded are the
 * web's alone, and `helix family` leaves a rule under one out of the native
 * output.
 */

import type { Declaration } from './style.js'
import type { Prop } from './tree.js'

/** A window narrower than a length in rems, which a layer's rules alone read. */
export interface Below {
  readonly below: string
}

/** An interaction a part holds. */
export type Interaction = 'active' | 'focusVisible' | 'hover'

/**
 * A part inside the target, and the interaction it holds or any one of
 * several: `:has([part="control"]:focus-visible)`.
 */
export type Holds = Readonly<Record<string, boolean | Interaction | readonly Interaction[]>>

/** What holds of a part the target is drawn inside: an interaction, or a part inside it that holds one. */
export interface Around {
  readonly active?: true
  readonly focusVisible?: true
  readonly focusWithin?: true
  readonly holds?: Holds
  readonly hover?: true
}

/** Where a node stands among its siblings. */
export type Place = 'earlier' | 'even' | 'first' | 'last' | 'later' | 'odd' | 'only'

/**
 * The conditions a rule applies under. Every key must hold.
 *
 * - A prop's name takes a value, `[tone="danger"]`; `true` or `false`, present
 *   or absent; an array, any one of its values,
 *   `:is([separation="filled"], [separation="outlined"])`; or `{ not }`, none
 *   of the values given, `:not([emphasis="solid"])`.
 * - `has` names an attribute that is present, as `[disabled]` on an element
 *   no form owns.
 * - `state` names a custom state, `:state(open)`; an array, every one of them;
 *   or an object, each state that must hold and each that must not.
 * - `disabled`, `:disabled` or `:not(:disabled)`, and `dir`, `:dir(rtl)`.
 * - `formDisabled`, the host's `:disabled`, which a disabled fieldset around
 *   it sets too, on the host and on a part.
 * - `hover`, `focusVisible`, `focusWithin` and `active`, an interaction that
 *   holds or does not; `interaction`, any one of several. On the host they
 *   are the host's, `:host(:focus-within)`; on a part, the part's; on a rule
 *   with `slotted`, each child's, `::slotted(*:hover)`, which a native view
 *   cannot read from the element around and leaves out.
 * - `part`, the part's own states: `hidden`, `disabled`, `href` where a
 *   link has somewhere to go, or a `data-` attribute, present, absent, or
 *   holding a value, `[data-band="good"]`.
 * - `child`, where the target stands among its siblings: `first`, `later`,
 *   `last`, `earlier`, `only`, `even` or `odd`, counting from one, or several
 *   that all hold, `['last', 'later']`,
 *   `:last-child:not(:first-child)`. On a rule with `slotted`, each child's; on a
 *   part, the part's; on the host, the host's. `place` is always the host's,
 *   `:host(:first-child)`, as a crumb that is first draws no separator.
 * - `nth` and `nthLast`, where the target stands counting from one, from the
 *   start or from the end, `:nth-child(2)` and `:nth-last-child(2)`, or that
 *   place and every one after it, `{ from: 5 }`, `:nth-last-child(n + 5)`,
 *   as a speed dial's actions arrive one after another. Read as `child` is.
 * - `ofType`, the host's place among the siblings of its own kind, counting
 *   from one, `:host(:nth-of-type(2))`, as a meter's second segment takes the
 *   second color of the series.
 * - `within` names a part the target is drawn inside, `[part="field"]` before
 *   it, or an object of one part and what holds of it: an interaction,
 *   `{ field: { hover: true } }`, `[part="field"]:hover`, or a part inside it
 *   that holds one, `{ track: { holds: { control: 'focusVisible' } } }`.
 *   `{ host: { hover: true } }` is the host's own interaction on a part,
 *   `:host(:hover) [part="dismiss"]`.
 * - `holds`, a part inside the target that holds an interaction,
 *   `:has([part="control"]:focus-visible)`, or `true` where the part is
 *   drawn at all and `false` where it is not, `:has([part="icon"])`. A phone
 *   reads which parts its tree draws.
 * - `filled`, a region that holds something: `:state(has-label)` on the
 *   web, which the element sets and declares, and what is passed into the
 *   region on a phone. Several regions, or an object of regions that hold
 *   something and regions that do not.
 * - `startingStyle`, the values a part starts from as it is drawn, which its
 *   transitions move away from: `@starting-style` on the web, and the
 *   element's first render on a phone.
 * - `also`, the parts the target is as well, or is not, as a mark is
 *   `mark-dash` while it draws the dash: `[part~="mark-dash"]` or
 *   `:not([part~="mark-dash"])`.
 * - `lacks` names an attribute that is absent, `:not([disabled])`, as on an
 *   element no form owns, which `disabled: false` does not read.
 * - `inlineSize`, the element's own width below a length in rems,
 *   `{ below: '22rem' }`: `@container (inline-size < 22rem)` on the web, on a
 *   host that is its own size container, and its laid-out width on a phone.
 * - `window`, the window narrower than a length in rems, `{ below: '30rem' }`:
 *   `@media (width < 30rem)` on the web, and the window's width on a phone
 *   less what the theme's rem makes it, at the reader's text size. **A rule
 *   on a layer alone reads it**, as a dialog becomes a sheet on a phone, since
 *   a component cannot know the window and a layer's box is placed in it.
 *   A layer's rules alone write a viewport length, such as `100dvh`, too.
 * - `reducedMotion`, the reader's motion preference either way. A native view
 *   reads the system's setting.
 * - `forcedColors`, `print`, `canHover: true`, `coarsePointer: false` and
 *   `defined: false`: the web's alone. A rule under one is left out of the
 *   native output. `canHover` is a pointer that can hover, `@media (hover:
 *   hover)`, which a finger cannot, and `defined: false` is the element
 *   before it upgrades, which a native element never is.
 * - `canHover: false`, `@media (hover: none)`, and `coarsePointer: true`,
 *   `@media (pointer: coarse)`, always hold on a phone.
 */
export interface When {
  readonly active?: boolean
  readonly also?: Readonly<Record<string, boolean>>
  readonly canHover?: boolean
  readonly coarsePointer?: boolean
  readonly child?: Place | readonly Place[]
  readonly defined?: boolean
  readonly dir?: 'ltr' | 'rtl'
  readonly disabled?: boolean
  readonly focusVisible?: boolean
  readonly focusWithin?: boolean
  readonly filled?: string | readonly string[] | Readonly<Record<string, boolean>>
  readonly forcedColors?: boolean
  /**
   * The host is disabled as a form control is, `:host(:disabled)`: by its
   * own `disabled`, or by a disabled fieldset around it. On a part, the
   * host's, `:host(:disabled) [part="x"]`.
   */
  readonly formDisabled?: boolean
  /** An attribute present, or each of several. */
  readonly has?: string | readonly string[]
  readonly holds?: Holds
  readonly hover?: boolean
  readonly inlineSize?: Below
  readonly interaction?: readonly Interaction[]
  /** An attribute absent, or each of several. */
  readonly lacks?: string | readonly string[]
  readonly nth?: number | { readonly from: number }
  readonly nthLast?: number | { readonly from: number }
  readonly ofType?: number
  readonly part?: Readonly<Record<string, boolean | string>>
  readonly place?: Place
  readonly print?: true
  readonly reducedMotion?: boolean
  readonly startingStyle?: true
  readonly state?: string | readonly string[] | Readonly<Record<string, boolean>>
  readonly window?: Below
  readonly within?: string | Readonly<Record<string, Around>>
  readonly [prop: string]:
    | boolean
    | number
    | string
    | readonly string[]
    | { readonly not: string | readonly string[] }
    | Holds
    | Readonly<Record<string, Around>>
    | Readonly<Record<string, boolean | string>>
    | Below
    | { readonly from: number }
    | undefined
}

/**
 * A region, by its slot's name: `default` for the one with no name, `*` for
 * every one, or several, which are several rules.
 *
 * **The web writes the slot**, `slot[name="label"]`, `slot:not([name])` or
 * `slot`, with that selector's specificity, and with `slotted` the content
 * passed in, `slot[name="label"]::slotted(*)`. **A native view gives the
 * region's style to what is passed in**: its text style is what the content
 * inherits, the rest the box the region is drawn in, and with `slotted` the
 * style goes to each child.
 */
export interface Region {
  readonly region: string | readonly string[]
}

/** One rule: what it targets, when it applies, and what it sets. */
export interface Rule {
  /**
   * The part alone, `[part="skeleton"]`, and not a node that is another part
   * as well, as each line of a skeleton's paragraph is `skeleton line`.
   * Without it, a part that shares its `part` attribute is matched by token.
   */
  readonly exact?: true
  /**
   * CSS written after the target's selector, such as `> slot`. Web only.
   */
  readonly inner?: string
  /**
   * `host`, the name of a part, several parts that share the rule, or a
   * region.
   */
  readonly on: Region | string | readonly string[]
  /**
   * `web` for a rule the native output leaves out, and `native` for one the
   * web output leaves out because the web already makes the same turn
   * another way.
   */
  readonly platform?: 'web' | 'native'
  /**
   * A selector written out, for what the vocabulary cannot name yet. Web only.
   */
  readonly selector?: string
  /**
   * The declarations, in the order they apply, with any fragment of
   * declarations taken in where it stands.
   */
  readonly set?: readonly (Declaration | Include)[]
  /**
   * The children the rule styles: on the host, the slotted children of a
   * tag, such as `helix-tab`; on a part that is a region's slot, or on a
   * region, `*`, the content passed into it.
   */
  readonly slotted?: string
  /**
   * A feature query the rule sits inside. Web only.
   */
  readonly supports?: string
  /**
   * Private values the element's rules read through `own`, in order.
   */
  readonly values?: readonly Declaration[]
  /**
   * The conditions it applies under, or several sets of them, any of which.
   */
  readonly when?: When | readonly When[]
}

/** A named animation and its frames. */
export interface Keyframes {
  /**
   * Each frame's selector, such as `to`, and its declarations.
   */
  readonly frames: readonly (readonly [frame: string, declarations: readonly Declaration[]])[]
  /**
   * The animation's name.
   */
  readonly keyframes: string
}

/** A fragment taken in by name, read where it stands as if written there. */
export interface Include {
  readonly include: string
}

/** An element's styled tier. */
export interface Family {
  /**
   * The prefix of the element's hooks, such as `tabs-tab` for `--tabs-tab-color`.
   */
  readonly name: string
  /**
   * The props only the styled tier has, such as `tone`.
   */
  readonly props?: readonly Prop[]
  /**
   * The rules and animations, in cascade order, with any fragment of rules
   * taken in where it stands.
   */
  readonly rules: readonly (Include | Keyframes | Rule)[]
  /**
   * The stylesheet's path under the styled package's `src`.
   */
  readonly stylesheet: string
}

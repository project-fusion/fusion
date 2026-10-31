/**
 * The shape of a family's headless source as the compiler reads it: its
 * props, events, features, and part tree, and the helpers a source's
 * `derived` and `host` take, `derive()`, `bind()`, and `not()`.
 *
 * **Read as syntax, like a style table.** `helix system` recognizes each
 * helper by name and never runs the module. A source is written in
 * `headless.tsx` with `render.ts`'s `headless()`, and these types are what it
 * compiles from.
 *
 * **The tree names parts and props, and never a platform.** A pressable is
 * whatever a platform presses, a `<button>` on the web and a `Pressable` in
 * React Native, and an attribute bound to a prop says which prop drives it.
 * How a platform spells that attribute is the platform's.
 */

export * from './clock.js'
export * from './collection.js'
export * from './color.js'
export * from './copy.js'
export * from './countdown.js'
export * from './delay.js'
export * from './entry.js'
export * from './files.js'
export * from './fold.js'
export * from './notices.js'
export * from './page.js'
export * from './range.js'
export * from './scroll.js'
export * from './stack.js'
export * from './toggle.js'
export * from './toolbar.js'
export * from './total.js'
export * from './tour.js'
export * from './tree-choice.js'
export * from './validation.js'
export * from './window.js'

import type { Clock } from './clock.js'
import type { Collection, Item } from './collection.js'
import type { ColorFieldComputed, ColorPicked } from './color.js'
import type { Copy } from './copy.js'
import type { Countdown, Queue } from './countdown.js'
import type { Delay } from './delay.js'
import type { Entry } from './entry.js'
import type { Files } from './files.js'
import type { Fold } from './fold.js'
import type { Notice, Notices } from './notices.js'
import type { Page } from './page.js'
import type { ValueRange } from './range.js'
import type { Scroll, Section, Sections } from './scroll.js'
import type { Stack } from './stack.js'
import type { Toggle } from './toggle.js'
import type { Toolbar } from './toolbar.js'
import type { Total } from './total.js'
import type { Stop, Tour } from './tour.js'
import type { InspectorChoice, TreeChoice, TreeItemChoice } from './tree-choice.js'
import type { Validation } from './validation.js'
import type { Window } from './window.js'

/**
 * A prop's type: a primitive, or the values a string may take. `true` among
 * the values is the attribute present with no value, so `[true, 'reverse']`
 * is a switch with one named value, as Flex's `wrap` is.
 *
 * `number | string` holds either, as a badge's `value` holds `8` or `New`.
 * `object` holds an object, which the web's attribute writes as JSON, as
 * `Intl.NumberFormat` options are. `time` holds a moment: a `Date`, a count
 * of milliseconds since 1970, or an ISO 8601 string, which the web's
 * attribute writes, as a timeline entry's `datetime` is.
 *
 * `{ function }` holds a function the element calls, by the signature a
 * phone's component types it with, as `callback()` writes it.
 */
export type PropType =
  | 'boolean'
  | 'number'
  | 'number | string'
  | 'object'
  | 'string'
  | 'time'
  | readonly (string | true)[]
  | { readonly function: string }

/** A prop, its type, and its default. */
export interface Prop {
  /**
   * Whether the prop is an attribute on the web element. A property only,
   * such as `expanded`, is `false`.
   */
  readonly attribute?: false
  /**
   * The value when the prop is not set: a number for a number prop, as a
   * loader's `delay` of `0`.
   */
  readonly default?: boolean | number | string
  /**
   * The prop's name, as its attribute is spelled.
   */
  readonly name: string
  /**
   * `web` for a prop only the web element has, such as a form's.
   */
  readonly platform?: 'web'
  /**
   * What the prop holds.
   */
  readonly type: PropType
}

/** An event a family sends. */
export interface Event {
  /**
   * Whether an event that `follows` a value is sent on the first render too,
   * where the value already holds, as a QR code whose value is too long from
   * the start sends `error`.
   */
  readonly arrives?: boolean
  /**
   * Whether the web sends it under its own name, as `change`, and not under
   * `helix-` and the name. A phone's event carries its detail's fields on
   * itself as well, as the platform's `ToggleEvent` carries `newState`.
   */
  readonly bare?: boolean
  /**
   * Whether a handler can cancel what the event announces.
   */
  readonly cancelable?: boolean
  /**
   * The fields its detail carries.
   */
  readonly detail?: readonly string[]
  /**
   * The value the element computes, in its `derived`, whose change sends the
   * event after the first render, unless it `arrives`: each change of its words, and a flag's
   * turn on, as a meter sends `band` as its reading moves into another band.
   */
  readonly follows?: string
  /**
   * What each field of the detail holds where `follows` sends the event: a
   * computed value or a prop, by name, as a progress bar's `complete` gives
   * its `value` as the top of its range. A field not named holds the value
   * `follows` names.
   */
  readonly gives?: Readonly<Record<string, string>>
  /**
   * Its name, without the `helix-` the web prefixes.
   */
  readonly name: string
  /**
   * `web` for an event only the web element sends, such as an icon's `load`
   * once a file it fetched is drawn. A phone's component has no handler for
   * it.
   */
  readonly platform?: 'web'
}

/**
 * An attribute value: a literal, the prop that drives it, the prop it is the
 * opposite of, or words derived from the props. A number is a reading, a level, a count of lines, or a
 * shape's geometry.
 */
export type Attribute =
  | boolean
  | number
  | string
  | { readonly bind: string }
  | { readonly derive: string }
  | { readonly not: string }
  | { readonly field: string }
  | { readonly index: true }
  | {
      readonly otherwise: string
      readonly pick: string
      readonly values: Readonly<Record<string, string>>
    }

/**
 * A node's attributes, by name. `also` names the parts the node is as well
 * while a prop holds, as a row is `row-current` while it is current.
 */
export type Attributes = Readonly<Record<string, Attribute | Readonly<Record<string, Attribute>>>>

/** A node of the part tree. */
export interface Node {
  /**
   * Semantics and behavior the node carries, by name. `helix system` holds
   * each to the attributes its kind of node takes, and each value to the
   * shape the attribute has.
   */
  readonly attributes?: Attributes
  /**
   * The nodes inside it, in order.
   */
  readonly children?: readonly Node[]
  /**
   * What the node is: `box`, `image`, `layer`, `live`, `pressable`,
   * `region`, `repeat`, `text`, `when`, or `wrap`.
   */
  readonly kind: string
  /**
   * The part it exposes, or the region it is.
   */
  readonly name: string
}
/** A family's headless source. */
export interface Headless {
  /**
   * A tick on the time of day, and the derivation that says when what is
   * drawn from it goes stale, as a relative time's.
   */
  readonly clock?: Clock
  /**
   * What the items that join it share.
   */
  readonly collection?: Collection
  /**
   * A copy to the clipboard as its pressable that `copies` is pressed, and
   * the result it holds for a moment, as a copy button's.
   */
  readonly copy?: Copy
  /**
   * A time the element spends once it is drawn, and the event it sends once
   * the time is spent, as an announcement's `duration`.
   */
  readonly countdown?: Countdown
  /**
   * A wait the element starts as it is drawn, and the state that holds
   * while it runs, as a loader waits out its `delay`.
   */
  readonly delay?: Delay
  /** What it holds where a reader types into it: its text, and the events an edit sends. */
  readonly text?: Entry
  /**
   * What it holds where a reader moves it along a track: its value, the
   * props that bound and step it, and the events a move sends.
   */
  readonly range?: ValueRange
  /**
   * The values the element computes from its props, by name: `derive()`, a
   * derivation in `@fusion.dev/helix-core/derivations`, or `bind()`, a prop
   * or whether a region holds something. `bind()`, `not()`, `when()` and a
   * rule's `state` read one by its name, as they read a prop: a trend is
   * `better` while `derive('trend-better')` holds. The web element works
   * each out itself, and a native view calls the derivation.
   */
  readonly derived?: Readonly<
    Record<string, { readonly bind: string } | { readonly derive: string }>
  >
  /**
   * What the family sends.
   */
  readonly events: readonly Event[]
  /**
   * What it holds where a reader picks files into it: the files chosen,
   * the props that say which it takes, and the events a change sends.
   */
  readonly files?: Files
  /**
   * What it reads and sends where it windows a long set of items: the rows
   * near the screen, the props that lay them out, and the events a reader's
   * moves send.
   */
  readonly window?: Window
  /** What it reads and sends where it holds the items of a tree. */
  readonly treeRoot?: TreeChoice
  /** What it reads, sends, and computes where it is an item of a tree. */
  readonly treeItem?: TreeItemChoice
  /** What it reads, sends, and computes where it shows a value as a tree of rows. */
  readonly inspector?: InspectorChoice
  /** What it holds where a reader builds a color in it. */
  readonly color?: ColorPicked
  /** What a field that opens a color picker computes from its text. */
  readonly colorField?: ColorFieldComputed
  /**
   * The prop that says how many of the elements passed in are drawn, as an
   * avatar group folds the people past its `max` into a count.
   */
  readonly maxVisible?: Fold
  /**
   * What a screen reader hears of the host, where the web element sets it
   * through `ElementInternals` and draws no part to carry it: its `role`, and
   * its `label`, which may bind a region's words, as a stat is named by its
   * label. A phone gives a `group` no role while it has no name.
   *
   * A range's reading is the host's too, as a meter's and a progress bar's
   * are, `valuemin`, `valuemax`, `valuenow` and `valuetext`, and so are
   * `busy` and `ariaHidden`, as a skeleton is busy while what it holds
   * loads. A role may bind a value the element computes, as a skeleton is a
   * progress bar only while it has a name.
   */
  readonly host?: Readonly<{
    ariaHidden?: Attribute
    busy?: Attribute
    label?: Attribute
    role?: string | { readonly bind: string }
    valuemax?: Attribute
    valuemin?: Attribute
    valuenow?: Attribute
    valuetext?: Attribute
  }>
  /**
   * The collection it joins.
   */
  readonly item?: Item
  /**
   * The family's name.
   */
  readonly name: string
  /** The message it is in the `notices` around it, as a toast item in its region. */
  readonly notice?: Notice
  /** The messages passed into it, which it stacks and holds, as a toast's region does. */
  readonly notices?: Notices
  /** The page it follows as it scrolls, as an app header lifts off it. */
  readonly pageScroll?: Page
  /**
   * `web` for an element only the web has, such as a skip link. A phone's
   * component of the same name draws nothing.
   */
  readonly platform?: 'web'
  /** What the family takes. */
  readonly props: readonly Prop[]
  /** A turn it waits for behind the queued elements of its kind before it. */
  readonly queue?: Queue
  /**
   * A part of its own that scrolls, and the states and events it gives as
   * the part stands, moves and comes to rest.
   */
  readonly scroll?: Scroll
  /** The section of the page it is, which an outline draws a link for. */
  readonly section?: Section
  /** The sections of the page it follows as it scrolls. */
  readonly sections?: Sections
  /**
   * The stack of pages it shows one at a time, where its rows hold pages of
   * their own, as a drilldown's.
   */
  readonly stack?: Stack
  /** The custom states it sets. */
  readonly states: readonly string[]
  /** The stop it is of the `tour` around it. */
  readonly stop?: Stop
  /** What it holds where it turns on and off. */
  readonly toggle?: Toggle
  /**
   * What it holds where it is a toolbar: the props that turn it and stop its
   * arrow keys at the ends.
   */
  readonly toolbar?: Toolbar
  /**
   * A prop it reads as the sum of a prop of the elements of another family
   * passed into it, while it holds any of them.
   */
  readonly total?: Total
  /** The stops passed into it, which it shows one at a time. */
  readonly tour?: Tour
  /** Its parts, in render order. */
  readonly tree: readonly Node[]
  /** What its verdict reads, where it is a form control. */
  readonly validation?: Validation
}

/** An attribute the prop `name` drives. */
export const bind = (name: string): { readonly bind: string } => ({ bind: name })

/**
 * Words the element computes from its props, by the name of a derivation in
 * `@fusion.dev/helix-core/derivations`, such as a key's chord in the reader's
 * keyboard's glyphs. The web element writes them, and a native view calls the
 * derivation with the element's props. `helix system` refuses a name with no
 * derivation.
 */
export const derive = (name: string): { readonly derive: string } => ({ derive: name })

/** An attribute that is set while the prop `name` is not. */
export const not = (name: string): { readonly not: string } => ({ not: name })

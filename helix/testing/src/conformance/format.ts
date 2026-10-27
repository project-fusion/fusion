/**
 * The format Helix's conformance scenarios are written in, which holds a
 * family's web element and its React Native component to one behavior.
 *
 * **A scenario says what a reader does, and never what should happen.** It
 * names a family, an example setup written once for both platforms, and a
 * list of intents. Each platform's harness turns an intent into its own
 * input, records the events the elements sent and what the intent left, and
 * the suite compares the records intent by intent.
 *
 * **Each half writes its own record, and no record is committed.** The web
 * half writes what the elements did in each browser it runs in, and the
 * native half writes what React Native did, each as a `Written` file. Once
 * both exist, `compareWritten` holds every browser to Chromium exactly, and
 * React Native to the web after keeping only the events and the detail fields
 * the neutral form declares.
 */

import type { Family, Staged } from './families.js'

export type { Family, Staged } from './families.js'

/** A value a prop takes in a setup, as its attribute is written. */
export type PropValue = boolean | number | string

/**
 * One element of a setup: its web tag, which also names its React Native
 * component, its props by the names the neutral form gives them, the region of
 * its parent it fills, and what it holds.
 */
export interface Setup {
  /** The elements and the words inside it, in order. */
  readonly children?: readonly (Setup | string)[]
  /**
   * Its props, by their attribute names, such as `selection-mode`. A prop
   * set to `false` is left out.
   */
  readonly props?: Readonly<Record<string, PropValue>>
  /**
   * The region of its parent it fills, such as `panels`. Left out, it fills
   * the default region.
   */
  readonly slot?: string
  /** The web element's tag, such as `helix-tabs`. */
  readonly tag: string
}

/** The modifier keys held with a press or a key. Each one left out is not held. */
export interface Held {
  /** Alt, or Option on a Mac. */
  readonly alt?: boolean
  /** Shift. */
  readonly shift?: boolean
  /**
   * The key that adds an item to a selection: Control, or Command on a Mac.
   */
  readonly toggle?: boolean
}

/**
 * What a reader does.
 *
 * - `press`: a tap or a click on the item with this value, or on the
 *   element itself where no item is named. With `part`, on that part of the
 *   item, as a tag's remove button is its `dismiss`: the web taps the part
 *   in the item's shadow root, and a phone the press drawn inside the
 *   item's own. With `link`, on the link an outline draws to the section
 *   with that id.
 * - `focus`: puts keyboard focus on the item, as Tab does. With `page`, on
 *   a control of the page outside the setup, as focus stands before a
 *   reader opens a layer, which a record then names `page`.
 * - `dismiss`: dismisses the element's open layer as a reader does, `by`:
 *   `escape`, the Escape key; `back`, a phone's back, which the web performs
 *   as the close request a browser makes of Escape; `reader`, a screen
 *   reader's escape, which the web performs the same way; or `outside`, a
 *   press outside the layer, on a modal layer's scrim.
 * - `key`: a key pressed where focus is, by the web's `KeyboardEvent.key`.
 * - `refuse`: from now on, the page refuses the event wherever it hears it,
 *   as a listener calling `preventDefault()` does.
 * - `remove`: from now on, the page takes the item that sent the event out
 *   of the setup where nothing refused it, as a page removes a tag from its
 *   list on its `dismiss`.
 * - `move`: moves an item one place without a pointer. The web presses Alt
 *   with an arrow on the item, and a phone adjusts the item's grip, as a
 *   screen reader does.
 * - `drag`: drags an item by its grip and drops it beside another. The web
 *   drags with a pointer and a phone with a pan gesture, so each harness
 *   performs it its own way, or says it cannot.
 * - `open` and `close`: opens or closes the item, or the element, as a reader
 *   does, with a press on its trigger where it stands the other way, and
 *   nothing where it already stands so.
 * - `set`: the page writes a prop of the item, or of the element, as a
 *   script sets its property: the web writes the attribute, and a phone
 *   draws the setup again with the prop. `false` takes it away.
 * - `wait`: `ms` milliseconds pass on the fake clock, and each timeout due
 *   in them runs.
 * - `hide` and `show`: the page or the app leaves the front, as a reader
 *   switches tabs or apps, and comes back.
 * - `scroll`: scrolls the element's part that scrolls to the offset `x` and
 *   `y`, where it comes to rest. The web sets the scroller's offset and sends
 *   `scroll` and `scrollend`, and a phone sends its scroll view's scroll and
 *   the end of a glide.
 * - `type`: types `text` into the element's field, one character an edit,
 *   with focus in the field first, or `erase`s that many characters from its
 *   end, one an edit. The web writes each edit into the `<input>` and sends
 *   `input`, as a keystroke does, and a phone changes its `TextInput`'s text.
 * - `leave`: focus leaves the element's field, as a reader moves on. The web
 *   sends `change` where the text differs from the text it gained focus
 *   with, as a browser does on a reader's edit, and blurs it. A phone blurs
 *   its `TextInput`.
 */
export type Intent =
  | { readonly by: -1 | 1; readonly item: string; readonly kind: 'move' }
  | {
      readonly edge: 'after' | 'before'
      readonly item: string
      readonly kind: 'drag'
      readonly to: string
    }
  | { readonly event: string; readonly kind: 'refuse' }
  | { readonly event: string; readonly kind: 'remove' }
  | { readonly held?: Held; readonly key: string; readonly kind: 'key' }
  | {
      readonly held?: Held
      readonly item?: string
      readonly kind: 'press'
      readonly link?: string
      readonly part?: string
    }
  | { readonly item?: string; readonly kind: 'focus'; readonly page?: true }
  | { readonly by: 'back' | 'escape' | 'outside' | 'reader'; readonly kind: 'dismiss' }
  | { readonly item?: string; readonly kind: 'close' | 'open' }
  | {
      readonly item?: string
      readonly kind: 'set'
      readonly prop: string
      readonly value: PropValue
    }
  | { readonly kind: 'hide' }
  | { readonly kind: 'show' }
  | { readonly kind: 'wait'; readonly ms: number }
  | { readonly kind: 'scroll'; readonly x: number; readonly y: number }
  | { readonly erase?: number; readonly kind: 'type'; readonly text?: string }
  | { readonly kind: 'leave' }

/** A setup and what a reader does to it. */
export interface Scenario {
  /**
   * The family whose elements the setup draws.
   */
  readonly family: Family | Staged
  /**
   * What the reader does, in order.
   */
  readonly intents: readonly Intent[]
  /**
   * What the scenario covers, unique within its family.
   */
  readonly name: string
  /**
   * The element the reader acts on, with what it holds.
   */
  readonly setup: Setup
}

/** An event an element sent while an intent ran. */
export interface Sent {
  /**
   * Whether a listener refused it, read once the intent had run.
   */
  readonly canceled: boolean
  /**
   * What its detail carried, by field.
   */
  readonly detail: Readonly<Record<string, unknown>>
  /**
   * The value of the item that sent it, or `null` for the element that holds
   * the items.
   */
  readonly from: string | null
  /**
   * Its name, without the `helix-` the web gives it.
   */
  readonly name: string
}

/** What an intent left behind. */
export interface Left {
  /**
   * Whether the element is checked, on, pressed, or paused, or `mixed` where
   * it shows neither, for a family that turns on and off. The web reads its
   * custom states, and React Native the `checked` its toggling press tells a
   * screen reader.
   */
  readonly checked?: boolean | 'mixed'
  /**
   * The values of the items chosen, in the order they stand: selected,
   * pressed, or checked, as a toggle group's toggles and a checkbox group's
   * boxes are.
   */
  readonly chosen: readonly string[]
  /**
   * The values of the items a screen reader hears as current, for a family
   * whose items say themselves which is current, as a navigation's
   * destinations: the web reads `aria-current` on each item's link, and
   * React Native the words a phone says after the item's own.
   */
  readonly current?: readonly string[]
  /**
   * The value of the item with focus, the tag of an element with focus that
   * is no item, `page` on the page's control, or `null` elsewhere outside.
   */
  readonly focused: string | null
  /**
   * How the element's picture stands, `loading`, `loaded`, or `error`, for
   * a family that draws one, as an image. The web reads its custom states,
   * and React Native the states its load machine sets.
   */
  readonly loaded?: 'error' | 'loaded' | 'loading'
  /**
   * Whether the element's layer stands open, for a family that opens one, as
   * a dialog. The web reads its `open` state, and React Native the state its
   * layer machine sets.
   */
  readonly layer?: boolean
  /**
   * The values of the items that stand open, in the order they stand, for a
   * family whose items open and close, as an accordion's sections.
   */
  readonly open?: readonly string[]
  /** Each destination a link followed. */
  readonly opened: readonly string[]
  /**
   * Where a copy button's last copy stands, by its states on both platforms.
   */
  readonly result?: 'copied' | 'failed' | 'resting'
  /**
   * The words the element draws, for a family whose words are its reading,
   * as a date: the text of the web's `time` part, and the words a phone
   * draws.
   */
  readonly reads?: string
  /**
   * The values of the rows whose press is drawn, for a family that shows one
   * page of rows at a time, as a drilldown.
   */
  readonly rows?: readonly string[]
  /**
   * The values of the panels shown, in a set that shows panels.
   */
  readonly shown: readonly string[]
  /**
   * The text the element's field holds, and whether it is marked wrong, for
   * a family a reader types into, as an input: the web reads its `<input>`
   * and its `invalid` state, and React Native its `TextInput` and the state
   * its verdict sets.
   */
  readonly text?: { readonly invalid: boolean; readonly value: string }
  /**
   * Whether the element is waiting out its delay, unseen and silent, for a
   * family that holds itself back, as a loader. The web reads its `waiting`
   * state, and React Native whether a screen reader can reach the element
   * while it is not idle.
   */
  readonly waiting?: boolean
}

/** What one intent did on one platform, or why the platform could not perform it. */
export type Step =
  | {
      readonly events: readonly Sent[]
      readonly intent: string
      readonly left: Left
    }
  | { readonly cannot: string; readonly intent: string }

/** Every scenario's steps, by the scenario's key. */
export type Recording = Readonly<{ [scenario: string]: readonly Step[] }>

/** The platforms a half records on: two browsers and React Native. */
export type Platform = 'chromium' | 'react-native' | 'webkit'

/** An event an element's neutral form declares. */
export interface DeclaredEvent {
  /**
   * The fields its detail carries.
   */
  readonly detail: readonly string[]
  /**
   * Its name, without the `helix-` the web gives it.
   */
  readonly name: string
}

/** A difference the owner has seen and left for a decision, with its cause. */
export interface Known {
  /**
   * Why the platforms differ, and what would end it.
   */
  readonly cause: string
  /**
   * The intent's place in its scenario, counting from 1.
   */
  readonly intent: number
  /**
   * The scenario's key.
   */
  readonly scenario: string
}

/**
 * The file a half writes for the comparison, one for each platform it ran
 * on, or one for each share of the scenarios where CI splits a browser's
 * families across jobs.
 */
export interface Written {
  /**
   * The events each element's neutral form declares, by the element's tag.
   * The native half writes them from the forms its components draw, and the
   * comparison keeps only these events and fields of both records.
   */
  readonly declared?: Readonly<Record<string, readonly DeclaredEvent[]>>
  /**
   * The differences from the web that wait on a decision, which the native
   * half writes from `helix/native/tests/conformance/known.ts`.
   */
  readonly known?: readonly Known[]
  /**
   * The platform the record was made on.
   */
  readonly platform: Platform
  /**
   * What each scenario's intents did there, by the scenario's key.
   */
  readonly record: Recording
}

/** The key a scenario's steps are recorded under: its family and its name. */
export const keyOf = (scenario: Scenario): string => `${scenario.family}: ${scenario.name}`

/** The modifiers held, in words, such as ` with toggle and shift`. */
const heldWords = (held: Held | undefined): string => {
  const names = (['toggle', 'shift', 'alt'] as const).filter((name) => held?.[name] === true)
  return names.length === 0 ? '' : ` with ${names.join(' and ')}`
}

/** An intent in words, as a record names it: `press b`, `key ArrowRight with shift`. */
export const say = (intent: Intent): string => {
  switch (intent.kind) {
    case 'drag':
      return `drag ${intent.item} ${intent.edge} ${intent.to}`
    case 'focus':
      return intent.page === true ? 'focus the page' : `focus ${intent.item ?? 'the element'}`
    case 'dismiss':
      return `dismiss by ${intent.by}`
    case 'open':
    case 'close':
      return `${intent.kind} ${intent.item ?? 'the element'}`
    case 'set':
      return `set ${intent.prop} of ${intent.item ?? 'the element'} to ${String(intent.value)}`
    case 'hide':
    case 'show':
      return `${intent.kind} the page`
    case 'wait':
      return `wait ${intent.ms} ms`
    case 'scroll':
      return `scroll to ${intent.x}, ${intent.y}`
    case 'key':
      return `key ${intent.key === ' ' ? 'Space' : intent.key}${heldWords(intent.held)}`
    case 'move':
      return `move ${intent.item} ${intent.by > 0 ? 'down' : 'up'}`
    case 'press':
      if (intent.link !== undefined) {
        return `press the link to ${intent.link}`
      }
      return `press ${intent.item ?? 'the element'}${intent.part === undefined ? '' : ` ${intent.part}`}${heldWords(intent.held)}`
    case 'refuse':
      return `refuse ${intent.event}`
    case 'remove':
      return `remove on ${intent.event}`
    case 'type':
      return [
        ...(intent.erase === undefined ? [] : [`erase ${intent.erase}`]),
        ...(intent.text === undefined ? [] : [`type "${intent.text}"`]),
      ].join(', then ')
    case 'leave':
      return 'leave the field'
  }
}

/** An element of a setup. */
export const el = (
  tag: string,
  props: Readonly<Record<string, PropValue>> = {},
  children: readonly (Setup | string)[] = [],
  slot?: string,
): Setup => ({ children, props, tag, ...(slot === undefined ? {} : { slot }) })

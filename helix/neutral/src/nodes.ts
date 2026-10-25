/**
 * The part tree's nodes, one helper per kind, which a family's headless
 * source draws its parts with. Read as syntax, as `tree.ts` says.
 */

import type { Attributes, Node } from './tree.js'

/**
 * A node with its kind, its name and its children kept as written, so a
 * style table can be checked against the parts the tree draws. A box, a
 * press, a wrap and a text keep their attributes' type too, so the parts a
 * node is as well through `also` are parts a table may name.
 */
export type Shaped<
  Kind extends string,
  Name extends string,
  Children extends readonly Node[],
> = Omit<Node, 'children' | 'kind' | 'name'> & {
  readonly children?: Children
  readonly kind: Kind
  readonly name: Name
}

/**
 * A box that groups or draws, with no behavior of its own.
 *
 * With `role`, a screen reader hears it as that role, and with `element` it
 * is that kind of element: `passage` is a `<blockquote>` on the web, `key` a
 * `<kbd>`, `term` a `<dt>`. `helix family` holds both to closed lists, and
 * each names what a phone announces for it.
 *
 * With `viewBox`, it draws a vector, an `<svg>` on the web and
 * `react-native-svg` on a phone, and each box inside it draws the `shape` it
 * names, a `circle`, an `ellipse`, a `line`, a `path`, or a `rect`, at the
 * geometry its attributes give in the vector's units:
 *
 * ```ts
 * box('track', { decorative: true, viewBox: '0 0 100 100' }, [
 *   box('groove', { cx: 50, cy: 50, pathLength: 100, r: 45, shape: 'circle' }),
 * ])
 * ```
 *
 * With `valuenow`, `valuemin`, `valuemax` and `valuetext`, a box whose role is
 * `meter` or `progressbar` is read as a range.
 *
 * With `draws`, the box is another element, by its tag without `helix-`, as
 * a checkbox group draws a checkbox above its boxes: its props are what the
 * element's machines give it, and `exports` names the parts it exposes, each
 * as the box's name and the part's, `select-all-mark`. A wrap that draws one
 * passes what it holds into its default region, and a node it holds with
 * `into` into the region `into` names, as a crumb's fold button is its
 * menu's `trigger`. `bubbles` names the drawn element's events, separated by
 * spaces, that reach the element around as its own, which a handler there may
 * refuse, as a composed event leaves a shadow root on the web: a crumb hears
 * the `select` of a row of its fold's menu.
 *
 * With `glyph`, a phone draws the icon of that name in the box with the
 * `Glyph` its app gives `HelixRoot`, in the color of the words around it. It
 * is a name, such as `x`, or `bind()` to the prop that holds one, as an
 * icon's `name`. The glyph fills a box that sets its own size, and is an em
 * of the words around it in one that does not.
 */
export const box = <
  const Name extends string,
  const Given extends Attributes = Record<never, never>,
  const Children extends readonly Node[] = [],
>(
  name: Name,
  attributes: Given = {} as Given,
  children: Children = [] as unknown as Children,
): Shaped<'box', Name, Children> & { readonly attributes: Given } => ({
  attributes,
  children,
  kind: 'box',
  name,
})

/**
 * What a person presses: a `<button>` on the web, a `Pressable` in React Native.
 *
 * With `chooses`, the press asks the collection its element joins to choose
 * it, as a tab's press and a row's do. With `sends`, it sends that event
 * first, and a handler that cancels it keeps the item from being chosen.
 *
 * With `href`, it is a link as well, as a tab that is a page of a site is: a
 * press sends its event, and opens the destination unless the event was
 * canceled.
 *
 * With `toggles`, the press turns the element's `toggle` the other way: it
 * sends the toggle's `before` event, which a handler can cancel, then turns
 * and sends `after`.
 *
 * Enter and Space both press it from a keyboard, as they press a button.
 * With `keys`, the one key it names presses it, and the other does nothing:
 * `keys: 'space'` for a checkbox or a switch, as Space alone presses a native
 * checkbox.
 *
 * With `checked`, a press whose role is `radio`, `checkbox` or `switch` is
 * heard as checked while a prop holds, as a radio its set chooses is. With
 * `pressed`, it is a toggle button, pressed while a prop holds.
 */
export const pressable = <
  const Name extends string,
  const Given extends Attributes,
  const Children extends readonly Node[],
>(
  name: Name,
  attributes: Given,
  children: Children,
): Shaped<'pressable', Name, Children> & { readonly attributes: Given } => ({
  attributes,
  children,
  kind: 'pressable',
  name,
})

/**
 * Content passed in: the default region, or a named one. `fallback` is drawn
 * while nothing is passed in, as a glyph a consumer may replace.
 */
export const region = <
  const Name extends string,
  const Given extends Attributes = Record<never, never>,
  const Children extends readonly Node[] = [],
>(
  name: Name,
  attributes: Given = {} as Given,
  fallback: Children = [] as unknown as Children,
): Shaped<'region', Name, Children> & { readonly attributes: Given } => ({
  attributes,
  children: fallback,
  kind: 'region',
  name,
})

/**
 * What it holds, drawn `count` times, as a skeleton draws one line of its
 * paragraph for each of its `lines`. Each copy stands where it is drawn
 * among the others, which a rule's `child` reads. The count is a number, or
 * `bind()` to a prop or a computed value that holds one.
 *
 * With `each` in place of `count`, it draws a copy for each entry of a list:
 * `bind()` to a prop that holds one, or `derive()` of a derivation that
 * computes one. `key` names the field that keys each copy, so a copy keeps
 * its view as the list changes around it. What a copy holds reads the
 * entry's fields with `field()` and its place, from 0, with `index()`:
 *
 * ```ts
 * repeat('keys', { each: derive('kbd-key-list'), key: 'at' }, [
 *   text('separator', { says: field('separator') }),
 *   box('key', {}, [text('words', { says: field('key') })]),
 * ])
 * ```
 */
export const repeat = <const Name extends string, const Children extends readonly Node[]>(
  name: Name,
  attributes: Attributes,
  children: Children,
): Shaped<'repeat', Name, Children> => ({
  attributes,
  children,
  kind: 'repeat',
  name,
})

/**
 * A picture loaded from its `src`: an `<img>` on the web and React Native's
 * `Image` on a phone, which takes the part's `object-fit`.
 *
 * Its load machine stands `idle` with no source, then `loading`, then
 * `loaded` or `failed`, and a new source starts it over. The element is in
 * the state `loading`, `loaded`, or `error` as the machine stands, which a
 * style table reads as Image's are read. A picture with no source stands in
 * the state `empty` names: `loading`, where it names none, or `error`, as
 * Avatar shows its initials. `loads` and `fails` name the events it sends
 * once it loads and once it fails.
 *
 * `alt` names the picture for a screen reader, and an empty `alt` is a
 * picture that is decoration:
 *
 * ```ts
 * image('image', { alt: bind('alt'), fails: 'error', loads: 'load', src: bind('src') })
 * ```
 */
export const image = <const Name extends string, const Given extends Attributes>(
  name: Name,
  attributes: Given,
): Shaped<'image', Name, []> & { readonly attributes: Given } => ({
  attributes,
  kind: 'image',
  name,
})

/**
 * What the element opens over the page: a dialog, a popover, a menu, or a
 * tooltip. The web draws it in the top layer, a `<dialog>` or a popover,
 * and a phone in the layer host `HelixRoot` draws over the app.
 *
 * `open` binds the prop it stands open while, which the element's `toggle`
 * holds as checked, so a press, a dismissal, and the page writing the prop
 * turn one toggle. The element is in the state `open` while it stands open.
 *
 * - `modal` holds the reader in the layer until it closes: the rest of the
 *   page takes no press, no focus, and nothing a screen reader reaches.
 * - `anchor` names the part it is placed against, which may be a region's
 *   `part`, as a popover's trigger is, and `placement` the side and the end it would stand
 *   on, as Floating UI names them: `bottom-start` where it names none. It
 *   turns to the other side where that one has no room, and the element is
 *   in the state `placed-top`, `placed-right`, `placed-bottom`, or
 *   `placed-left` for the side it lands on, and `aligned-start` or
 *   `aligned-end` for the end of that side. `offset` is its distance from
 *   the anchor.
 * - `target` binds the prop that holds the id of a view it is placed against
 *   in place of an `anchor`, which a phone registers with `useTarget`.
 * - `arrow` names a part inside it that points at the anchor, stood on the
 *   edge that faces it.
 * - `presentation` makes an anchored layer a sheet along the window's
 *   bottom edge or a popover: `auto`, a sheet below a window of 30rem;
 *   `sheet` or `popover`, that one always. The element is in the state
 *   `sheet` while it is one.
 * - `notice` draws it above every other layer, dialogs included, read and
 *   pressable while a modal one holds the reader, as a toast's stack is.
 * - `closedby` says how a reader dismisses it, as `<dialog closedby>`:
 *   `any`, a press outside it and a close request, which is Escape, a
 *   phone's back, or a screen reader's escape; `closerequest`, a close
 *   request alone; `none`, neither. A dismissal asks the toggle to close, so
 *   its `closes` event may refuse it.
 * - `role`, `label`, `labelledby`, and `description` are what a screen
 *   reader hears of it.
 *
 * ```ts
 * layer('surface', { anchor: 'trigger', open: bind('open'), role: 'dialog' }, [
 *   box('content', {}, [region('default')]),
 * ])
 * ```
 *
 * A rule on the layer alone may read the window: `window` in its `when`, a
 * viewport length such as `100dvh`, `safeArea()`, and its `backdrop`, the
 * scrim behind it.
 */
export const layer = <
  const Name extends string,
  const Given extends Attributes,
  const Children extends readonly Node[],
>(
  name: Name,
  attributes: Given,
  children: Children,
): Shaped<'layer', Name, Children> & { readonly attributes: Given } => ({
  attributes,
  children,
  kind: 'layer',
  name,
})

/** Words said to a screen reader: a live region on the web, an announcement on a phone. */
export const live = <const Name extends string>(
  name: Name,
  attributes: Attributes,
): Shaped<'live', Name, []> => ({
  attributes,
  kind: 'live',
  name,
})

/**
 * A box drawn around its children while `attributes.while` holds, and its
 * children alone otherwise.
 *
 * With `href`, it is a link, drawn while it has somewhere to go, such as a
 * row's link. A phone draws its children in the press around it, and that
 * press opens the link where the row would be acted on.
 */
export const wrap = <
  const Name extends string,
  const Given extends Attributes,
  const Children extends readonly Node[],
>(
  name: Name,
  attributes: Given,
  children: Children,
): Shaped<'wrap', Name, Children> & { readonly attributes: Given } => ({
  attributes,
  children,
  kind: 'wrap',
  name,
})

/** Words a prop holds, drawn as text, such as a list's `loading-label`. */
export const text = <const Name extends string, const Given extends Attributes>(
  name: Name,
  attributes: Given,
): Shaped<'text', Name, []> & { readonly attributes: Given } => ({
  attributes,
  kind: 'text',
  name,
})

/** A node drawn only while the prop or the state `name` is set. */
export const when = <const Name extends string, const Child extends Node>(
  name: Name,
  child: Child,
): Shaped<'when', Name, [Child]> => ({ children: [child], kind: 'when', name })

/**
 * A node drawn only while the prop or the state `name` is not set, as a
 * checkbox draws its `check` region while it is not mixed. A `when` whose
 * `unless` holds.
 */
export const unless = <const Name extends string, const Child extends Node>(
  name: Name,
  child: Child,
): Shaped<'when', Name, [Child]> => ({
  attributes: { unless: true },
  children: [child],
  kind: 'when',
  name,
})

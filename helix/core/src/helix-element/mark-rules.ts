/*
 * The token-free rules for the marks a component writes in its own shadow
 * root, which `HelixElement.finalizeStyles` adds to the sheet of every element
 * that names them in `markRules`.
 *
 * **Named per element, because most elements carry none of the marks.** The
 * four were in every shadow root until October 7, 2026, and Button, which
 * writes none of them, shipped all four. A rule only matches inside the shadow
 * root of the element that writes the mark, so an element that writes none
 * loses nothing by leaving them out, and a subclass inherits the list.
 *
 * **A family that writes a mark names its rule.** `mark-rules.pure.spec.ts` in
 * `helix/headless` reads every source that writes one, or starts the
 * controller that does, and fails where the class leaves the rule out.
 */

/**
 * Makes an element a scroll container, where a component says it is one.
 *
 * **A box that scrolls is the headless tier's, and the headless tier had no way to say
 * so.** `overflow` is what creates a scrollport: without it `scrollTop` is
 * permanently zero and every scroll API on the element is inert. So a component
 * that reads `scrollTop` and cannot declare `overflow` is one whose behavior
 * lives in somebody else's stylesheet.
 *
 * Measured before deciding: `helix-headless-scroll-area`, the component whose
 * entire purpose is scrolling, computes `overflow-y: visible` on its viewport
 * with `scrollHeight` equal to `clientHeight`. Standing alone it is a div, and
 * the virtual list is worse because it *acts* on the reading.
 *
 * **It goes in `core` rather than in a stylesheet**, with `BOX_SIZING`,
 * `HIDDEN` and `SETTLED`, which are the token-free structural rules `core`
 * ships into every shadow root. "The headless tier has no CSS" has never meant
 * `core` has none; it means `helix/headless` must not depend on
 * `@fusion.dev/helix-styles`, and a rule with no token in it does not.
 *
 * **And a rule rather than an inline style, which was the first idea and is
 * wrong.** An inline `style` on a rendered part outranks every author rule
 * short of `!important`, so a consumer wanting `overflow: hidden` on that part
 * would have to fight it and would need `!important` of their own. A shadow rule
 * loses to a document rule, so `::part(viewport) { overflow: … }` from a
 * consumer simply wins, which is the right way round.
 *
 * Both axes, and nothing else. Which *kind* of scrolling, how much room,
 * `overscroll-behavior`, `scroll-snap`, a gutter, a scrollbar treatment: those
 * are decisions and stay in `helix/styled`. This is only the mechanism, and the
 * styled sheet is prepended-after so it overrides at equal specificity anyway.
 *
 * **A component marks a box whose scroll state it reads, and no other**, which
 * is narrower than "every box that ends up scrolling". `Megamenu`'s panel
 * scrolls, and only because the styled tier gives it a `max-block-size`: that is
 * a decision, the `overflow` that serves it belongs with it, and the headless
 * tier never asks the panel where it is scrolled to. Marking it anyway moved a
 * heading four pixels, because `overflow` establishes a block formatting context
 * and margins that had been collapsing stopped. A mechanism with a layout
 * consequence is one to apply exactly where it is needed.
 *
 * `ScrollArea`, `VirtualList`, `Carousel`, `ObjectInspector`, `Chat` and a
 * `windowed` `DataTable` mark theirs, each reading `scrollTop` or `scrollLeft`
 * and acting on the answer. The last two took their `overflow` from their
 * styled sheet until they were marked, so the window each drew was inert on a
 * page that loads only `helix/headless`; marking them moved nothing on the
 * styled tier, where both boxes already scrolled.
 */
export const SCROLLER_RULE = '[data-scroller]{overflow:auto}'

/**
 * A box whose rows are drawn and taken away as it scrolls, which
 * `VirtualizeController` marks `data-virtual` once it watches it.
 *
 * **The browser's scroll anchoring fights the window.** Chromium keeps the
 * content a reader was looking at in place when what is above it changes, and
 * a virtual window changes exactly that on every move: the spacer above grows
 * and the rows are swapped. Measured on a 500 row list scrolled to 330, the
 * offset went to 138, then 522, then back to 330 before it settled, and the
 * list reported four ranges for one scroll. The window already keeps the rows
 * where they belong, so anchoring has nothing left to do here but move them.
 */
export const VIRTUAL_RULE = '[data-virtual]{overflow-anchor:none}'

/**
 * Words a screen reader reads where the eye reads something else, which a
 * component marks `data-spoken`: `⇧⌘P` in Kbd is read as `Shift Command P`.
 *
 * The drawn text is `aria-hidden` and the words sit beside it, in no box the
 * eye sees. The rule takes the words out of the layout and paints none of
 * them, and names no token, so it belongs with the mechanisms here. Without
 * it a page that loads only `helix/headless` showed both.
 */
export const SPOKEN_RULE =
  '[data-spoken]{position:absolute;inline-size:1px;block-size:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}'

/**
 * Turns a drawing that runs along the line of text, or a glyph that points
 * along it, round with it on a right-to-left page.
 *
 * **A chart computes its geometry from the left, because an SVG's coordinates
 * do.** `x` grows rightward whatever `direction` says, while the words around a
 * drawing are HTML written in logical properties and turn on their own. Before
 * this, a bar chart on an Arabic page wrote Q4 to Q1 from the left under
 * columns still drawn Q1 to Q4, so each name stood under its mirror's column.
 *
 * **A rule rather than a second set of coordinates, and three things decide
 * it.** A server renders the same markup whichever way the page reads, so the
 * drawing it sends is right before a script runs. Everything drawn on a mark
 * turns with it: a column rounded at its far end, a gradient toward its base,
 * the hole a ring terminus cuts, each of which arithmetic would have to mirror
 * again in every stylesheet that draws one. And it follows `dir` when it
 * changes, which a render would only do on its next update.
 *
 * **About the vertical axis, never the horizontal.** Up is more in every
 * script, so a value keeps its height and only the run along the line turns.
 * The numbers are text beside the drawing rather than inside it, so they read
 * the right way round.
 *
 * **Keyed on `:dir()`, which is what every sheet here mirrors a caret with.**
 * The pointer arithmetic that has to agree with it asks the computed
 * `direction`, the question the table and the splitter already ask, and the two
 * part only where a sheet sets `direction` without `dir`.
 *
 * A component marks the drawing with `data-mirror`, and a drawing with no line
 * of text to follow is left unmarked: a whole ring's slices run clockwise from
 * twelve, which is a clock's convention and not a script's. `scale` rather than
 * `transform`, so a consumer's `transform` on the same part composes with it,
 * and a consumer's `scale` there wins, a shadow rule losing to a document one.
 *
 * **A glyph that points along the line is the same case, marked the same
 * way**: a caret meaning next or previous, the one between two crumbs, a shut
 * disclosure. The component drawing it knows what it means, so the headless
 * tier points it the right way with no stylesheet at all. Before the mark each
 * styled sheet turned its own and a headless page had to know to, which the
 * carousel's and the pagination's did not. A glyph a *sheet* stands on its side
 * is that sheet's to turn: a tree draws its chevron pointing down, and a mark
 * would come out right under a `transform: rotate()`, which applies before
 * `scale`, and do nothing under the `rotate` property, which applies after it.
 * A glyph for playing media is left unmarked too, a tape running one way
 * whatever the script, and so is a picture of a key.
 */
export const MIRROR_RULE = ':host(:dir(rtl)) [data-mirror]{scale:-1 1}'

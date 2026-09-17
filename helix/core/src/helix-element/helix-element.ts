import { type CSSResultOrNative, css, LitElement, type PropertyValues } from 'lit'
import { type StaticValue, unsafeStatic } from 'lit/static-html.js'
import {
  applyReactProperties,
  auditReactProps,
  bindReactHandler,
  reactPropsOf,
} from './react-bridge.js'

/**
 * Applied to every Helix component's shadow root so component CSS can rely on
 * border-box on both sides of the shadow boundary. The light DOM gets the same
 * rule from `@fusion.dev/helix-styles/base.css`.
 */
const BOX_SIZING = css`
  *,
  ::before,
  ::after {
    box-sizing: border-box;
  }
`

/**
 * Makes `hidden` work, which it does not otherwise.
 *
 * The UA stylesheet's `[hidden] { display: none }` is user-agent origin, so any
 * author declaration beats it, and a component whose `:host` sets a `display`
 * is doing exactly that. Fifty-seven components stayed visible while hidden,
 * `<helix-grid>`, `<helix-empty>` and `<helix-flex>` among them, because every
 * component that lays itself out has the same fault and nothing connects them.
 *
 * Here rather than in each sheet, for the reason `box-sizing` is here: it is a
 * fact about every component, and fifty-seven copies is fifty-seven chances to
 * forget the fifty-eighth.
 *
 * **The selector is (0,3,0) on purpose, and the obvious (0,2,0) is not enough.**
 * A bare `:host([hidden])` beats a bare `:host`, but it only ties with the
 * `:host([attr])` rules a component uses to set its own `display`, and those win
 * on source order because they are injected after this. Measured, elements
 * styled that way still rendered while hidden: `flex[inline]` at `inline-flex`,
 * `divider[orientation="vertical"]` at `inline-block`, `text[as]` at `block`.
 * The `:not()` lifts it a step and it wins from first position, so the rule can
 * stay prepended.
 *
 * **And the `:not()` is load-bearing beyond specificity.** `hidden="until-found"`
 * is how the platform lets find-in-page reveal collapsed content: the browser
 * removes the attribute when a match is inside. Hiding it with `display: none`
 * makes it unfindable, so the one form of `hidden` that is *meant* to be
 * searchable is the one form this must not touch.
 *
 * `!important` is deliberately not used. A component with a real reason to stay
 * laid out while hidden should be able to say so, and none of them can if this
 * is unanswerable.
 */
const HIDDEN = css`
  :host([hidden]:not([hidden='until-found'])) {
    display: none;
  }
`

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
 * **It goes here rather than in a stylesheet**, beside `BOX_SIZING`, `HIDDEN`
 * and `SETTLED`, which are the token-free structural rules `core` ships into
 * every shadow root. "The headless tier has no CSS" has never meant `core` has
 * none; it means `helix/headless` must not depend on
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
 * `ScrollArea`, `VirtualList`, `Carousel` and `ObjectInspector` mark theirs,
 * each reading `scrollTop` or `scrollLeft` and acting on the answer.
 *
 * **`Chat` and `DataTable` read one and do not mark it, which is a departure
 * and not a second exception.** Both read `scrollTop` on this tier, through
 * `VirtualizeController` and, for `Chat`, directly as well, and both take the
 * `overflow` that makes the reading mean anything from their styled sheet. So
 * the window each of them draws is inert on a page that loads only
 * `helix/headless`, which is the case this rule exists for. Marking them is the
 * fix, and `Megamenu` above is why it is measured rather than assumed.
 */
const SCROLLER = css`
  [data-scroller] {
    overflow: auto;
  }
`

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
const MIRROR = css`
  :host(:dir(rtl)) [data-mirror] {
    scale: -1 1;
  }
`

/**
 * Stops a component animating its own arrival.
 *
 * A shadow root's stylesheets are adopted when the element upgrades, which is
 * after the element has already had a computed style. So the first resolution
 * that sees a component's own sheet is a *change*, from whatever the property's
 * initial value is to whatever the sheet says, and any `transition` the sheet
 * declares on that property runs against it. Nothing was interacted with and
 * nothing changed state: the component is animating the fact that its CSS
 * arrived.
 *
 * It shows wherever the initial value and the resting value differ visibly, and
 * `border-color` is the worst case, because its initial value is `currentColor`.
 * App Header reserves its border box and paints it `transparent` by default, so
 * on every load and every cross-document navigation it faded a one pixel
 * `currentColor` hairline out over `--helix-duration-normal`: near-black in
 * light mode, which reads as an intentional rule under the bar, and near-white
 * in dark mode, which reads as a bright sliver under the masthead. Measured on
 * the landing page with nothing touched and no pointer in the window, two
 * families ran five such transitions: App Header's bottom border and all four
 * of Card's.
 *
 * Here rather than in those two sheets, for the reason `box-sizing` and
 * `hidden` are here. It is a fact about every component that declares a
 * transition, the count of those grows, and a sheet cannot see the problem: the
 * rule that is wrong is the one that looks most ordinary.
 *
 * **`!important`, because specificity cannot be relied on.** A component's own
 * transition can be declared on `:host` (0,1,0) or on a part under a host
 * condition (0,3,0), and this rule has to beat both without knowing which. From
 * inside the shadow tree it is also the only weight that outranks a consumer's
 * document rule, which would otherwise re-introduce the flash from outside.
 *
 * The state is set a frame after the first update rather than in
 * `firstUpdated`, and that is the whole mechanism rather than a detail. Lit's
 * upgrade, render and `firstUpdated` all run in one microtask checkpoint, so a
 * flag set there lands in the same style resolution as the adopted sheets and
 * the transition runs anyway. A frame later, the resting value has already been
 * resolved with transitions off, so enabling them changes nothing and there is
 * nothing left to animate.
 *
 * **`:state()` and never an attribute.** The host is the element React owns, and
 * a definition that lands during module evaluation has a frame to spend before
 * React arrives, so an element writing `[data-settled]` onto its own host leaves
 * React hydrating a DOM that gained an attribute since the server wrote it.
 * Deferring a registration so the frame falls the other side of hydration is a
 * fix for the timing rather than for the cause, which is that a component's
 * private bookkeeping was being kept somewhere React reconciles.
 *
 * A custom state is not in the DOM. It carries the fact to this stylesheet and
 * nothing to the markup, so a server's output and a hydrated client's agree by
 * construction. Pagination reached the same conclusion for `:state(empty)` and
 * says so in its own sheet.
 */
const SETTLED = css`
  :host(:not(:state(settled))),
  :host(:not(:state(settled))) * {
    transition: none !important;
  }
`

/**
 * How long an element keeps looking for React's props, and how often.
 *
 * **Two looks were one short of every Next.js App Router page.** React's props
 * bag has no arrival event, so the only way to read it is to look, and until
 * 16 Sep 2026 an element looked twice: once in `firstUpdated` and once a frame
 * later. Measured on a project scaffolded by `helix new --template
 * react-nextjs`, a data table whose `rows` is a prop, under `next dev` and under
 * `next build && next start`, five runs each: the bag landed on the *second*
 * frame after the first update, around 4.5 ms after the frame the second look
 * ran on, so both looks missed every time and the table drew its empty state
 * over data already sitting on the node.
 * `helix/docs/content/react.mdx` documents that prop as working, and nothing had
 * rendered a scaffolded project to find out.
 *
 * **The later looks are timers and never frames**, which is not a detail. A
 * component that draws in a loop books its next frame from each one, and that is
 * how a spec asks whether it is running: `framesBooked` counts every booking on
 * the page, so an element still looking for React would be read as a loop that
 * failed to stop. A commit is a task rather than a paint anyway, so a task is
 * also the thing worth waiting for.
 *
 * `LOOK_FOR` is twenty times that gap, and it is stated as a window rather than
 * as a count of looks so these two constants stay the only place the arithmetic
 * lives. Where React never appears each look is a key scan, around half a
 * microsecond, and the looking stops the moment the bag is found.
 */
const LOOK_EVERY = 16
const LOOK_FOR = 96

/**
 * @summary Base class every Helix element extends.
 *
 * @description
 * Owns only what is universal: normalizing `box-sizing` inside the shadow root,
 * so component CSS can rely on border-box on both sides of the boundary.
 *
 * There is deliberately no `emit(name, detail)` helper. A dispatch through a
 * generic helper cannot be named by the manifest analyzer, which recorded the
 * parameter identifier and produced a phantom event on every element that
 * inherited it. Components dispatch concrete event classes from `events.ts`,
 * which the analyzer and TypeScript can both see.
 *
 * @since 0.1.0
 * @status experimental
 * @documentation https://fusion.dev/helix/docs/tiers
 *
 * @cssstate settled - Set a frame after the first render. Transitions are held off until it is, so an element never animates its own arrival.
 */
export class HelixElement extends LitElement {
  /**
   * The prefix this tier registers its elements under.
   *
   * **A component that renders another renders its own tier's version of it**,
   * so `helix-headless-pagination-size` composes `helix-headless-select` and
   * `helix-pagination-size` composes `helix-select`. One template says
   * `${this.tag('select')}` and each tier answers with its own name.
   *
   * **The public tag may not be the composed one, in either tier.** Using it
   * costs three things: the name means two different things depending on what a
   * consumer imported, the headless tier composes an element it does not ship,
   * and the composition cannot be tested there at all, because there is no
   * `helix-select` on that tier to test it against.
   *
   * **A prefix rather than an override per composition**, which was the first
   * plan and does not compile. An override re-renders the fragment from the
   * subclass, and the fragment reads members the base keeps private:
   * `PaginationSize` alone would have had to widen `options`, `current` and
   * `handleChange` to `protected` so a subclass could say the same thing again.
   * Sixteen families of that is a lot of encapsulation spent on saying one
   * word differently.
   */
  static tier = 'helix-headless-'

  /**
   * One composed tag, as a static value a template can interpolate.
   *
   * `unsafeStatic` is safe by construction: the name is a literal in our own
   * source and the prefix is one of two strings this class defines. Called per
   * render and not cached, which costs nothing, because `static-html` keys its
   * template cache on the joined string rather than on the object.
   */
  protected tag(name: string): StaticValue {
    return unsafeStatic(`${(this.constructor as typeof HelixElement).tier}${name}`)
  }

  /**
   * One of this element's own parts, by name, or null where it is not rendered.
   *
   * Not `part`, which every element already has: `Element.part` is the
   * `DOMTokenList` of the names the element itself carries, and a method under
   * that name is a type error on every subclass.
   *
   * **One guard for every lookup.** Lit's server shim has no `querySelector`
   * on the render root, so a lookup reached during a server render, from a
   * getter a template reads or from `willUpdate`, throws there and nowhere
   * else. Four spellings of the same guard had grown across the library, and
   * a fifth site with none. Null on the server, which is what the rest of the
   * code already treats a part that has not rendered as.
   *
   * **`~=` and not `=`.** A part drawn in a state carries a second name while
   * the state holds, `part="page page-current"`, and an exact match stops
   * finding it for exactly as long as it is the one that matters.
   *
   * `helix component`'s `selectors` reads these calls the way it reads a
   * `querySelector('[part="x"]')`, so a name nothing renders is a finding
   * rather than a null an optional chain swallows.
   */
  protected partNamed<T extends Element = HTMLElement>(name: string): T | null {
    const root = this.renderRoot as { querySelector?: (selectors: string) => T | null } | undefined
    return typeof root?.querySelector === 'function'
      ? root.querySelector(`[part~="${name}"]`)
      : null
  }

  /**
   * The element's semantics, set without touching the DOM.
   *
   * `ElementInternals` sets the implicit role, which an author's own `role`
   * attribute still overrides, and it writes no attribute. Setting `role` on the
   * host directly would: that is an attribute the element gives itself after it
   * upgrades, which a React consumer's server markup never had, and hydration
   * reports it as a mismatch.
   *
   * Available during server rendering. Lit's shim implements `attachInternals`,
   * so nothing here needs a guard.
   */
  protected readonly internals: ElementInternals

  /**
   * Records a boolean fact about this element as a custom state.
   *
   * **The host belongs to whoever rendered it, and a component's own
   * bookkeeping may not be kept there.** An attribute written on the first
   * update is markup a consumer's server never sent, so a React consumer
   * hydrates a DOM that has gained attributes since and reports a mismatch it
   * will not patch up. A custom state is not in the DOM at all: it carries the
   * fact to a stylesheet through `:state()` and leaves the markup alone, so the
   * server's output and the client's agree by construction.
   *
   * `SETTLED` carries the long version of that argument; `checked`, `open`,
   * `invalid` and `has-label` are recorded the same way, each of them a state a
   * `default-*` attribute resolves before React reaches the node.
   *
   * **Deferring the definitions is not a fix and could not be.** Importing them
   * from an effect so the upgrades fall the other side of hydration works only
   * while hydration is one pass: anything that splits it, a streamed segment or
   * a suspended boundary, puts an upgrade back inside the window. Timing cannot
   * be the guarantee when the fact is kept somewhere React reconciles.
   *
   * Feature-tested rather than assumed, the way `hostAria` tests element
   * references. An engine without `CustomStateSet` records nothing and keeps
   * whatever the resting rule draws, which is the safe direction to fail.
   *
   * **The engines the test is for are browsers**: Safari below 17.4 and Firefox
   * below 126, where the write is a `TypeError`, so a component bypassing this
   * fails to render rather than rendering without whatever the state draws.
   * Lit's server shim sets `states`, so the guard passes there and records a
   * state nothing reads, which is harmless.
   */
  protected toggleState(name: string, on: boolean): void {
    if ('states' in this.internals) {
      this.internals.states[on ? 'add' : 'delete'](name)
    }
  }

  /**
   * Resolves a frame after the first update, when transitions are switched on.
   *
   * **Named `whenSettled` because `settled` is taken four times over**, by
   * Image, Splitter and both color controls, none of them about transitions. A
   * base class takes the name every subclass then cannot use.
   *
   * **The state it reports cannot be watched, which is why this exists.** A
   * custom state is deliberately not in the DOM, so there is no
   * `MutationObserver` equivalent for `ElementInternals.states`. Await this
   * instead.
   *
   * Separate from `updateComplete`, which resolves in the microtask checkpoint
   * the suppression is still active in. That is the distinction `readyToMove`
   * in `@fusion.dev/helix-testing` is written around.
   *
   * It never resolves where `requestAnimationFrame` never fires, which is a
   * server, a hidden tab, and happy-dom. Callers that must not hang there race
   * it against a timeout, as the happy-dom harness's `readyToMove` does. The
   * browser harness's awaits it alone: a browser always runs the frame, and a
   * timer beside it was a bet on how long one takes, which a busy run lost.
   */
  readonly whenSettled: Promise<void>

  /** Resolves `whenSettled`, once, from the frame that records the state. */
  private resolveSettled: () => void = () => {}

  constructor() {
    super()
    this.internals = this.attachInternals()
    this.whenSettled = new Promise<void>((resolve) => {
      this.resolveSettled = resolve
    })
  }

  /** Whether the shadow root was a server's, parsed from declarative shadow DOM. */
  private fromServer = false

  protected override createRenderRoot(): HTMLElement | DocumentFragment {
    this.fromServer = this.shadowRoot !== null
    return super.createRenderRoot()
  }

  /**
   * Whether this update is hydrating a server's markup, and so has to render
   * exactly what the server rendered.
   *
   * **Lit hydrates by assuming the markup already shows the first render.** A
   * value that differs is recorded and never written, so the page keeps the
   * server's, and a template that differs throws. The server has no children,
   * so anything a component reads from its children waits for the update after
   * hydration, which `finishHydration` asks for. Without a server's markup the
   * first render reads them and there is one render.
   */
  protected get hydrating(): boolean {
    return this.fromServer && !this.hasUpdated
  }

  /**
   * Whether this element hydrated a server's markup rather than rendering its own.
   *
   * For what happened before hydration and cannot be heard after it: an image
   * the parser fetched fires `load` or `error` before any listener exists, so a
   * component asks the image instead, once, when this is true.
   */
  protected get serverRendered(): boolean {
    return this.fromServer
  }

  /**
   * Asks for the update a hydration put off, so the reads it skipped happen.
   *
   * Called from `firstUpdated`, the end of the hydrating update. The render it
   * schedules can only follow that one, which is the exception Lit's
   * change-in-update warning names, and it happens only on a page a server
   * rendered.
   */
  protected finishHydration(): void {
    if (this.fromServer) {
      this.requestUpdate()
    }
  }

  /**
   * Whether this render can know the children.
   *
   * A server cannot: its element shim carries attributes and no tree, so
   * `children` is undefined there. A render hydrating what a server sent must
   * not, because it has to be the server's render. Anywhere else it can. A
   * component whose render depends on its children reads them through
   * `knownChildren`, and treats "not known" as its own answer rather than as
   * "none": a list that renders its empty state because nobody has looked yet is
   * the one thing an empty state must never do.
   */
  protected get childrenKnown(): boolean {
    return this.children !== undefined && !this.hydrating
  }

  /** The children a render may read: all of them where they are known, and none otherwise. */
  protected get knownChildren(): Element[] {
    return this.childrenKnown ? [...this.children] : []
  }

  /**
   * Whether this element's slots route by name although it asked to assign them
   * by hand.
   *
   * **A declarative shadow root is always the by-name kind.** HTML has no way to
   * ask for manual assignment, so a component that assigns by hand and hydrates
   * a server's root gets one where `slot.assign()` does nothing, and its
   * children land wherever their `slot` attribute sends them. The way through is
   * to write that attribute, which is what `route` does. Only there: on a root
   * this element made, assignment stays manual and the consumer's markup is
   * never touched, which is what a React consumer's hydration requires.
   */
  protected get assignsByName(): boolean {
    const asked = (this.constructor as typeof HelixElement).shadowRootOptions.slotAssignment
    return (
      asked === 'manual' &&
      typeof ShadowRoot !== 'undefined' &&
      this.renderRoot instanceof ShadowRoot &&
      this.renderRoot.slotAssignment !== 'manual'
    )
  }

  /**
   * Sends a child to a slot by name, on a root that routes by name.
   *
   * `undefined` is the default slot. Written only when it differs, so routing
   * the same child again on every update writes nothing.
   */
  protected route(child: Element, name: string | undefined): void {
    if (name === undefined) {
      child.removeAttribute('slot')
    } else if (child.getAttribute('slot') !== name) {
      child.setAttribute('slot', name)
    }
  }

  /**
   * Announces an event, having first bound whatever React is holding for it.
   *
   * Every event this library sends passes through here, the concrete classes in
   * `events.ts` and the relayed native ones alike, and `requestChange`
   * dispatches through the host as well. One override therefore covers all
   * ninety-seven of them, which is the reason it is here rather than at each
   * dispatch. See `bindReactHandler`.
   *
   * @internal
   */
  override dispatchEvent(event: Event): boolean {
    bindReactHandler(this, event)
    return super.dispatchEvent(event)
  }

  /**
   * Stops an inner control's own announcement at this element's boundary.
   *
   * **A composed control is one control to a consumer, and the natives had no
   * equivalent of the stop the prefixed events already get.** `<helix-select>`
   * renders a `<helix-listbox>`, and both announce: the listbox dispatches
   * `input` and `change` from its own host, `input` is composed by
   * specification, and a consumer listening on the select therefore heard one
   * choice twice. Measured before this existed, on the styled tier, one choice
   * on the inner listbox: select `input` twice and `change` three times,
   * combobox, date input, time input and color input twice each. `Command` was
   * the only one that was right, because it happened to reach for
   * `stopImmediatePropagation` for a different reason.
   *
   * Bound on the child in the parent's template, so it runs while the event is
   * still at the child and before it can cross. The guard is for the case where
   * a component binds this on itself: an element must never stop its own
   * announcement, which is the one it exists to make.
   *
   * This is the same job the `helix-before-*` handlers do with their own
   * `stopPropagation`, and it is separate rather than folded into them because
   * a consumer may legitimately refuse a request without the notification ever
   * happening: the two travel at different times and one can be absent.
   */
  protected readonly stopInner = (event: Event): void => {
    if (event.target !== this) {
      event.stopPropagation()
    }
  }

  /**
   * Re-emits a native event from the host, under its own name.
   *
   * A native event fired by an inner `<input>` or `<textarea>` is not composed,
   * so it stops at the shadow boundary and a consumer listening on
   * `<helix-input>` hears nothing. Re-dispatching it from the host is what
   * makes the component behave like the control it wraps.
   *
   * The relayed event keeps the native name deliberately. `change` is `change`,
   * which is what a consumer already knows to listen for, and it is what
   * reaches React: its synthetic system claims `onChange` and wires it to that
   * name, so a prefixed one would never arrive.
   *
   * `composed` is not forced. It defaults to the original event's own value, so
   * a relayed `change` stops at the next shadow boundary exactly as a native
   * one would. Pass it explicitly only where escaping is the intent, and say so
   * where you do.
   */
  protected relayNativeEvent(event: Event, init?: EventInit): void {
    this.dispatchEvent(
      new Event(event.type, {
        bubbles: event.bubbles,
        cancelable: event.cancelable,
        composed: event.composed,
        ...init,
      }),
    )
  }

  /**
   * Prepends the shadow-root reset to every subclass's styles, so no component
   * has to remember to include it.
   */
  protected static override finalizeStyles(
    styles?: CSSResultOrNative | CSSResultOrNative[],
  ): CSSResultOrNative[] {
    return [BOX_SIZING, HIDDEN, SCROLLER, MIRROR, SETTLED, ...LitElement.finalizeStyles(styles)]
  }

  /**
   * Marks the component's first style resolution as done, so `SETTLED` stops
   * suppressing transitions.
   *
   * A frame later, not now: see `SETTLED` for why `firstUpdated` itself is too
   * early. SSR never calls this, which is correct, because the state describes
   * something that happened in a browser and the server has no frame to wait
   * for.
   */
  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    /* **The first look, and the one that costs nothing.** It succeeds whenever
       the definition landed after React hydrated, which is the ordering a
       deferred or lazily imported element has: the bag is already on the node,
       and the update this assignment schedules is a microtask, so the value is
       rendered in the same task the upgrade happened in. See
       `applyReactProperties`. */
    let applied = applyReactProperties(this)
    requestAnimationFrame(() => {
      /* Through `toggleState`, which carries the feature test. A component that
         cannot record the state keeps its transitions suppressed, which is the
         safe direction to fail: nothing animates that should not. */
      this.toggleState('settled', true)
      this.resolveSettled()
      /* **The other ordering, and the one this keeps looking for.** A definition
         evaluated with the client bundle upgrades before React hydrates, so
         there was no bag to read above and there may be none for a frame or two
         yet. See `LOOK_EVERY`.

         **Audited here as well as at dispatch, and this is the half that catches
         the real mistake.** From inside `dispatchEvent` alone, an element holding
         a handler prop and sending nothing is never looked at, and a prop on the
         wrong element is exactly the case where that element has no reason to
         dispatch. Once per element either way: the audit holds its own set. */
      let waited = 0
      const look = (): void => {
        const props = reactPropsOf(this)
        if (props === undefined) {
          if (waited < LOOK_FOR) {
            waited += LOOK_EVERY
            setTimeout(look, LOOK_EVERY)
          }
          return
        }
        if (!applied) {
          applied = applyReactProperties(this)
        }
        auditReactProps(this, props)
      }
      look()
    })
  }
}

/**
 * Writes to a child element once it has hydrated, or now where it is not
 * hydrating.
 *
 * **For a parent that sets state on the elements it holds.** On a page a server
 * rendered, the parent's `updated` can run before a child's own first update,
 * and a property written then is in the child's hydrating render, which has to
 * be the server's: a mark the markup never showed, and Lit throws. Waiting for
 * that render lets it match and the write land in the one after. Anywhere else
 * the write is immediate, so a client's first render already has it.
 */
export const whenHydrated = (element: Element, write: () => void): void => {
  const child = element as unknown as { hydrating?: boolean; updateComplete?: Promise<unknown> }
  if (child.hydrating === true && child.updateComplete) {
    void child.updateComplete.then(write)
  } else {
    write()
  }
}

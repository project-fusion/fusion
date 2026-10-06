import {
  customElement,
  type HelixBeforeEditEvent,
  HelixBeforePanelResizeEvent,
  type HelixBeforeResizeEvent,
  HelixBeforeSplitEvent,
  type HelixCaretEvent,
  type HelixConsoleEvent,
  HelixElement,
  HelixPanelResizeEvent,
  HelixSplitEvent,
  requestChange,
} from '@fusion.dev/helix-core'
import '../../splitter/index.js'
import type { CSSResultGroup, PropertyValues, TemplateResult } from 'lit'
import { html } from 'lit'
import { property, state } from 'lit/decorators.js'
import type { HelixSandboxPreview } from '../preview/sandbox-preview.js'
import type { HelixSandboxStatusBar } from '../status-bar/sandbox-status-bar.js'
import type { HelixSandboxTerminal } from '../terminal/sandbox-terminal.js'
import { styles } from './sandbox-root.css.js'

/** Where the divider sits, and how tall the panel is, before anyone moves them.
    Named because the properties default to them and the getters that reset them
    fall back to them, and two copies of a default drift. */
const DEFAULT_SPLIT = 50
/* One hundred and sixty, not one hundred and ninety-two. At 192 the panel opened
   taking forty-two percent of the sandbox: the thing being previewed had less
   room than the log of it. Its own tab bar is forty-eight of that, so this
   leaves about five lines, which is what a console is read in. */
const DEFAULT_PANEL = 160

/** The most of the sandbox the panel may take, leaving the panes above it. */
const PANEL_MAX = 0.8

/**
 * @summary An editable source pane paired with a live preview.
 *
 * @description
 * A source pane dispatches `helix-before-edit`, which bubbles, and the sandbox
 * passes the value to the preview slotted into it. The source pane and the
 * preview do not reference each other, so you can replace either one or use it
 * alone.
 *
 * The event carries the pane's `name`, so one sandbox can hold several panes.
 * `html` sets the preview's markup and `css` sets its stylesheet. The sandbox
 * ignores a pane with any other name, so that pane can show content without
 * changing the preview.
 *
 * **The dividers are two nested `helix-splitter` elements**, which handle the
 * pointer, the keyboard, and the corner. The inner splitter holds the panes and
 * the outer one holds the panel, so the panel spans the full width.
 *
 * @since 0.1.0
 * @status stable
 * @category tooling
 * @aliases Playground, REPL, Editor
 * @documentation https://fusion.dev/helix/components/sandbox
 *
 * @slot panel - A panel under both panes, usually a terminal.
 * @slot preview - The live preview. It comes second unless `lead` is `preview`.
 * @slot source - The editable source pane. It comes first unless `lead` is `preview`.
 * @slot status - A status bar, spanning both panes at the bottom.
 * @slot toolbar - A bar across the top, spanning both panes.
 *
 * @event {HelixBeforeEditEvent} helix-before-edit - Fired before the source is edited. The source pane dispatches it, and you can listen for it on the sandbox. Cancelable: cancel it to keep the source unchanged.
 * @event {HelixBeforePanelResizeEvent} helix-before-panel-resize - Fired before the panel's divider is released, with the panel's height in pixels. A panel dragged closed reports `panel-collapsed-size`, its smallest height. Cancelable: cancel it to keep the current height.
 * @event {HelixBeforeSplitEvent} helix-before-split - Fired before the panes' divider is released, with the lead pane's share. Cancelable: cancel it to keep the current split.
 * @event {HelixCaretEvent} helix-caret - Fired when the cursor moves in the source. The source pane dispatches it, and you can listen for it on the sandbox.
 * @event {HelixConsoleEvent} helix-console - Fired once per console call in the preview frame. The preview pane dispatches it.
 * @event {HelixEditEvent} helix-edit - Fired after the source was edited, with the new source. The source pane dispatches it, and you can listen for it on the sandbox.
 * @event {HelixPanelResizeEvent} helix-panel-resize - Fired after the panel's divider settled at a new height, with the height in pixels.
 * @event {HelixResizeEvent} helix-resize - Fired by the preview pane when the height of the frame's content changes, with the new height.
 * @event {HelixSplitEvent} helix-split - Fired after the panes' divider settled somewhere new, with the lead pane's share.
 *
 * @csspart body - The splitter holding the panes above the panel.
 * @csspart corner - The handle where the two dividers cross.
 * @csspart pane - Either pane.
 * @csspart panel - The box that holds the slotted panel.
 * @csspart panes - The splitter holding the source and preview panes.
 * @csspart separator - Either divider.
 *
 * @cssproperty --sandbox-grab - The invisible width of a divider's drag target.
 * @cssproperty --sandbox-min-block-size - Minimum height of the sandbox.
 * @cssproperty --sandbox-separator-color - Color of the divider.
 *
 * @cssstate panel-collapsed - While there is a panel and it is no taller than `panel-collapsed-size`.
 */
@customElement('helix-sandbox')
export class HelixSandbox extends HelixElement {
  /**
   * The name of the corner handle that moves both dividers at once, read by
   * screen readers.
   */
  @property({ attribute: 'corner-label' })
  cornerLabel = 'Resize panes and panel'

  /**
   * The panel height a reset restores, in pixels.
   *
   * The pair to `panel-size`.
   */
  @property({ attribute: 'default-panel-size', type: Number })
  defaultPanelSize = DEFAULT_PANEL

  /**
   * Where a reset puts the divider between the panes.
   *
   * Separate from `split` for the reason `Splitter` keeps `default-position`
   * separate from `position`. Resetting to whatever `split` held on the first
   * render is the declared arrangement only where nobody owns the property: the
   * workbench does, and restores it from the address bar and from storage, so the
   * first value it holds is the reader's last session and a reset puts the
   * sandbox back to the size it already was.
   *
   * Declared rather than captured, so it is a number a consumer states and can
   * change, and it needs no first frame to be read on.
   */
  @property({ attribute: 'default-split', type: Number })
  defaultSplit = DEFAULT_SPLIT

  /**
   * Which pane comes first, before the divider.
   *
   * A sandbox is read in one of two directions and the two are not a
   * preference. A workbench is a place to write, so the source leads and the
   * preview answers it. A reference page is a place to look, so the preview
   * leads and the source is what a reader opens if they want to know how it was
   * done. Same component, opposite reading order, and no consumer should have
   * to slot a preview into a hole named `source` to get it.
   *
   * Not reflected, because no rule selects on it: the panes already carry
   * `data-pane`, which is what the stylesheet reaches for, and swapping the
   * names below keeps that true whichever way round they sit.
   *
   * `split` follows the lead pane rather than the source, so `split="30"` means
   * the same thing in both directions: thirty percent to whatever comes first.
   */
  @property()
  lead: 'source' | 'preview' = 'source'

  /**
   * Whether the panes sit side by side or stacked.
   *
   * Not reflected, for `lead`'s reason above: no rule selects on it. The axis
   * reaches the stylesheet as the inner splitter's own `orientation`, which is
   * where the panes are laid out, and this element's sheet names no host
   * attribute at all.
   */
  @property()
  orientation?: 'horizontal' | 'vertical'

  /**
   * The panel's height when it is closed.
   *
   * Zero closes it outright. A panel whose contents include the control that
   * reopens it, a row of tabs being the usual one, wants that row left showing,
   * and only whoever slotted it knows how tall that is.
   *
   * **A floor rather than a second state**, which is what keeps `panel-size` the
   * whole truth about the panel: a divider driven to the end lands here and
   * `panel-size` reads this number, so "closed" is something a consumer already
   * stores rather than a property they have to learn. The splitter inside has a
   * `collapsed` of its own and it is refused, for the reason `handleCollapse`
   * gives.
   */
  @property({ attribute: 'panel-collapsed-size', type: Number })
  panelCollapsedSize = 0

  /**
   * The name of the panel's divider, read by screen readers.
   */
  @property({ attribute: 'panel-label' })
  panelLabel = 'Resize panel'

  /**
   * Height of the panel, in pixels.
   */
  @property({ attribute: 'panel-size', type: Number })
  panelSize = DEFAULT_PANEL

  /**
   * The name of the divider between the panes, read by screen readers.
   *
   * Empty names the lead pane, "Resize source pane" or "Resize preview pane",
   * since the divider's value is that pane's share.
   */
  @property({ attribute: 'separator-label' })
  separatorLabel = ''

  /**
   * Percentage of the sandbox given to the lead pane: the source, unless `lead`
   * is `preview`.
   */
  @property({ attribute: 'split', type: Number })
  split = DEFAULT_SPLIT

  /**
   * Whether anything is in the panel region.
   *
   * The divider above the panel is only meaningful when there is a panel to
   * size, and there is no way to ask in CSS: `:host(:has([slot="panel"]))` is
   * invalid, and the server has no children to look at. `slotchange` is the
   * platform answering on the client, which is where a divider is any use.
   */
  @state()
  private hasPanel = false

  /**
   * The body's height, which is what a pixel panel is a fraction of.
   *
   * The panel is given in pixels and the splitter takes a percentage, so the two
   * only agree at one height: let the window change without recomputing and a
   * panel asked for at 192px quietly keeps whatever share of the old height that
   * was.
   *
   * **Measured at render rather than cached from the observer.** A
   * `ResizeObserver` callback is delivered from the rendering lifecycle and a
   * background tab runs none, so a cached number goes stale with nothing to say
   * so. Reading the box at render leaves one source of truth, and the observer's
   * only job is to say that a render is due.
   *
   * Cheap, because renders are rare: a drag does not go through this element at
   * all, the splitter following the pointer itself and announcing once, when it
   * settles.
   */
  private bodyHeight = 0

  /**
   * Asks for a render when the body changes size.
   *
   * The box watched is the splitter itself, not the panel. Its size changes when
   * the window does and not when the divider moves, so answering it cannot feed
   * back into the position that answered it.
   */
  private readonly watch =
    typeof ResizeObserver === 'undefined'
      ? undefined
      : new ResizeObserver(() => {
          this.requestUpdate()
        })

  /**
   * A panel height as a share of the body, which is what the splitter takes,
   * held to what the panel may have. A height that is no number is the
   * default one.
   */
  private shareOf(size: number): number {
    if (this.bodyHeight <= 0) {
      return 0
    }
    const panel = Number.isFinite(size) ? size : DEFAULT_PANEL
    return Math.min(PANEL_MAX * 100, Math.max(0, (panel / this.bodyHeight) * 100))
  }

  /**
   * Where the outer divider goes: everything the panel is not.
   *
   * A hundred with no panel, which puts the divider on the floor of the sandbox
   * with the panes filling it. The line itself is hidden by the stylesheet in
   * that case, because a boundary needs two sides.
   */
  private get panelPosition(): number {
    return this.hasPanel ? 100 - this.shareOf(this.panelSize) : 100
  }

  /** Where the panel divider goes on a reset, in the splitter's own units. */
  private get homePanelPosition(): number {
    return this.hasPanel ? 100 - this.shareOf(this.defaultPanelSize) : 100
  }

  /** `panel-collapsed-size` in the units the splitter works in. */
  private get panelSliver(): number {
    if (this.bodyHeight <= 0) {
      return 0
    }
    return Math.min(100, Math.max(0, (this.panelCollapsedSize / this.bodyHeight) * 100))
  }

  /**
   * The least the panel goes to, in the pixels this element holds it in.
   *
   * The same number as `panelSliver` and not the same arithmetic, which is the
   * point of having both: bounding the splitter at `100 - panelSliver` instead
   * would ask a percentage to come back through a string and compare equal to
   * the one the splitter derives, and the collapse it is meant to land on is an
   * `>=` on those two floats. Held here, in whole pixels a consumer stated, it
   * is exact.
   */
  private get panelFloor(): number {
    const size = Number.isFinite(this.panelCollapsedSize) ? this.panelCollapsedSize : 0
    return Math.min(this.bodyHeight, Math.max(0, size))
  }

  /**
   * Whether a change came from inside this sandbox's source region.
   *
   * Structural rather than a type check. There is more than one kind of pane and
   * the editor is `@fusion.dev/helix-sandbox/editor`, on its own path because it
   * carries CodeMirror, so naming its class here would pull that back into this
   * module for every consumer. Where the event came from is a question about the
   * tree, and the tree can answer it.
   */
  private fromSource(target: EventTarget | null): boolean {
    if (!(target instanceof Node)) {
      return false
    }
    const slot = this.renderRoot.querySelector<HTMLSlotElement>('slot[name="source"]')
    return (slot?.assignedElements({ flatten: true }) ?? []).some(
      (pane) => pane === target || pane.contains(target),
    )
  }

  /**
   * Takes a change from one of this sandbox's own source panes.
   *
   * The origin is checked, and has to be. `helix-before-edit` bubbles and composes,
   * so anything a consumer slots into a sandbox sends one up here too. A
   * sandbox hears a great deal that is not its source.
   */
  private readonly handleSourceChange = (event: Event): void => {
    if (!this.fromSource(event.target)) {
      return
    }
    const { value } = (event as HelixBeforeEditEvent).detail
    /* Which pane is the element, and the element is `composedPath()[0]` rather
       than `event.target`, which is retargeted to the outermost host once the
       event has crossed a shadow boundary. Read now: the path is empty once
       the dispatch is over.

       Named, not guessed. Treating anything that is not `css` as markup holds
       only while there are two panes: a pane showing the example as JSX
       announces itself the same way, and the preview renders the text of a React
       component as though it were markup. */
    const pane = event.composedPath()[0] as { name?: string }
    const name = pane?.name
    if (name !== 'css' && name !== 'html') {
      return
    }
    /* **After the dispatch, and only if nobody refused.** This listener is
       on the host from connection, so it runs before any listener a consumer
       adds, while `defaultPrevented` is still unanswered: a refused edit kept
       the source and still reached the preview. The dispatch is synchronous,
       so a microtask reads the final answer. */
    queueMicrotask(() => {
      if (!event.defaultPrevented) {
        this.write(name, value, false)
      }
    })
  }

  /**
   * Writes a pane's text into every preview here.
   *
   * `seeding` writes only into a preview that has nothing yet, so a preview
   * given its own `source` keeps it until the first edit.
   */
  private write(name: 'css' | 'html', value: string, seeding: boolean): void {
    for (const preview of this.previews) {
      const key = name === 'css' ? 'styles' : 'source'
      if (!seeding || !preview[key]) {
        preview[key] = value
      }
    }
  }

  /**
   * Hands what the source panes already hold to the previews.
   *
   * Only edits were forwarded, so a pane written with a `value` showed its
   * text beside an empty preview until the first keystroke, and the text had
   * to be written twice. Client only, like the other reads of the light DOM.
   */
  private readonly seed = (): void => {
    const slot = this.renderRoot.querySelector<HTMLSlotElement>('slot[name="source"]')
    for (const pane of slot?.assignedElements({ flatten: true }) ?? []) {
      const { name, value } = pane as Element & { name?: unknown; value?: unknown }
      const text = typeof value === 'string' ? value : pane.getAttribute('value')
      if ((name === 'css' || name === 'html') && text) {
        this.write(name, text, true)
      }
    }
  }

  /**
   * Writes the cursor position onto any status bar slotted here.
   *
   * The same shape as the source-to-preview hand-off, and for the same reason:
   * the editor and the bar never speak, so either can be absent. It goes
   * straight to the element rather than through a property a framework owns,
   * because this fires on every keystroke and every arrow press.
   */
  private readonly handleCaret = (event: Event): void => {
    if (!this.fromSource(event.target)) {
      return
    }
    const { column, line } = (event as HelixCaretEvent).detail
    for (const bar of this.statusBars) {
      bar.column = column
      bar.line = line
    }
  }

  /**
   * The parts of this sandbox it drives, wherever they sit inside it.
   *
   * Descendants, not children. A preview and a status bar happen to be slotted
   * directly, but a terminal lives inside the tab set that holds the panel, so
   * a search of `children` found none and the console went nowhere. Where a
   * consumer nests a pane is their arrangement to make.
   *
   * Client only: the server has no children to read.
   */
  private parts<T extends Element>(selector: string): T[] {
    return [...this.querySelectorAll<T>(selector)]
  }

  private get previews(): HelixSandboxPreview[] {
    return this.parts<HelixSandboxPreview>('helix-sandbox-preview')
  }

  /**
   * Hands a console line from the preview to any terminal slotted here.
   *
   * Every `helix-console` is forwarded, with no check on where it came from.
   * Unlike a change, which any form control in a sandbox emits, this event is
   * dispatched by exactly one thing: a preview relaying what the document
   * inside its frame wrote. There is nothing else here it could be confused
   * with.
   */
  private readonly handleConsole = (event: Event): void => {
    const detail = (event as HelixConsoleEvent).detail
    for (const terminal of this.terminals) {
      terminal.write(detail)
    }
  }

  private get terminals(): HelixSandboxTerminal[] {
    return this.parts<HelixSandboxTerminal>('helix-sandbox-terminal')
  }

  private get statusBars(): HelixSandboxStatusBar[] {
    return this.parts<HelixSandboxStatusBar>('helix-sandbox-status-bar')
  }

  /**
   * The orientation in force.
   *
   * Unset is horizontal, and stays unset: the default is the absent attribute,
   * so a reflected default cannot appear on the host after hydration.
   */
  private get axis(): 'horizontal' | 'vertical' {
    return this.orientation ?? 'horizontal'
  }

  /**
   * Asks for the panes' divider to settle here, and moves it unless refused.
   *
   * When it settles, not while it moves. A drag is a stream of positions and
   * only the one it ends at is a preference; announcing each would ask whoever
   * is listening to write to storage a hundred times to record one decision.
   *
   * The sandbox does not keep it. Where a preference lives, and whether it
   * should be kept at all, is the consumer's to decide, and a component that
   * wrote to storage on its own would be deciding for all of them under a key
   * it chose.
   *
   * **Through `requestChange`, and never the other way round.** Both of these
   * fired after `split` and `panelSize` had already been written, with the
   * answer dropped, so a consumer calling `preventDefault()` on an event whose
   * own line says refusing it takes the decision changed nothing whatever: the
   * divider stayed where the drag left it and their handler read a value they
   * had just declined. `SandboxSource.edit` two files away already carries the
   * argument, that assigning first turns a `before` event into one that has
   * already happened, and `Splitter`, whose `helix-before-resize` these two were
   * split out of, has always announced through the audited path. Refusing one
   * now leaves `.position` bound to the value this element still holds, so the
   * divider goes back where it was.
   *
   * **A verb each, rather than one `helix-before-resize` naming which of the two
   * moved.** Both dividers are this element's, so `composedPath()[0]` is the same
   * host for either and the event name is the only thing that can separate them.
   */
  private requestSplit(next: number): void {
    const was = this.split
    const accepted = requestChange({
      apply: (value) => {
        this.split = value
      },
      event: (value) => new HelixBeforeSplitEvent({ value: String(value) }),
      host: this,
      next,
    })
    if (accepted && this.split !== was) {
      this.dispatchEvent(new HelixSplitEvent({ value: String(this.split) }))
    }
  }

  /** As `requestSplit`, for the panel, whose value is pixels rather than a share. */
  private requestPanelSize(next: number): void {
    const was = this.panelSize
    const accepted = requestChange({
      apply: (value) => {
        this.panelSize = value
      },
      event: (value) => new HelixBeforePanelResizeEvent({ value: String(value) }),
      host: this,
      next,
    })
    if (accepted && this.panelSize !== was) {
      this.dispatchEvent(new HelixPanelResizeEvent({ value: String(this.panelSize) }))
    }
  }

  /**
   * Takes a request a splitter of this sandbox made for itself, stopped and
   * refused, and gives its value. Gives nothing for one that came up from
   * something slotted into a pane, which passes through untouched.
   */
  private claim(event: Event): string | undefined {
    if (event.target !== event.currentTarget) {
      return undefined
    }
    event.stopPropagation()
    event.preventDefault()
    return (event as HelixBeforeResizeEvent).detail.value
  }

  /**
   * Answers a divider that has asked to move.
   *
   * Both splitters are controlled from here, so neither applies anything on its
   * own: each announces where it wants to go and this decides. That is what
   * keeps `split` and `panelSize` the truth about the arrangement rather than a
   * stale copy of it.
   *
   * `target` against `currentTarget`, because a source pane's own change bubbles
   * up through these same elements on its way to the host. Only a splitter
   * speaking for itself is one of ours, and only those are stopped: the sandbox
   * announces `helix-before-split` and `helix-before-panel-resize` in their
   * place, and a consumer never sees the two splitters inside it.
   *
   * **Refused as well as stopped, which is what "controlled from here" costs.**
   * A splitter nobody refuses applies the move itself and says so in its own
   * docblock, so the sentence above was true only while nothing downstream ever
   * declined: refusing `helix-before-split` left `split` at fifty and the
   * divider drawn at fifty-two, one element holding the arrangement and the
   * other showing it. Refusing the inner request first makes this element the
   * single answer.
   *
   * **And the divider is written back, because a refusal writes nothing.** A
   * splitter draws itself from where the gesture reached until its `position` is
   * assigned, which is the setter's stated job, and a bound property Lit did not
   * change is a property Lit does not write. So the answer is assigned either
   * way, which for an accepted move is the number the binding is about to carry
   * anyway.
   */
  private readonly handlePanesChange = (event: Event): void => {
    const value = this.claim(event)
    if (value === undefined) {
      return
    }
    this.requestSplit(Number(value))
    this.answer(event.currentTarget, this.split)
  }

  private readonly handlePanelChange = (event: Event): void => {
    const value = this.claim(event)
    if (value === undefined) {
      return
    }
    if (this.bodyHeight > 0) {
      /* Back into pixels, which is what this element promises and what a
         consumer stored. The divider's position is the panes' share, so the
         panel is the rest of it, and `panelFloor` is where the rest of it stops:
         a drag past the end asks for a panel of nothing and gets the sliver
         `panel-collapsed-size` says to leave showing. */
      this.requestPanelSize(
        Math.max(this.panelFloor, ((100 - Number(value)) / 100) * this.bodyHeight),
      )
    }
    this.answer(event.currentTarget, this.panelPosition)
  }

  /**
   * Refuses a pane of either splitter declaring itself shut.
   *
   * **The collapse is a second state, and this element has nowhere to put
   * one.** A splitter's `collapsed` overrides its `position` and remembers what
   * it was open at, and it answers to neither `split` nor `panel-size`. Allowed
   * in here, it would leave the arrangement in a state nothing outside this
   * element can see or set: assigning `panel-size` back moves nothing while
   * `collapsed` stands, and a consumer who stored the two numbers this element
   * publishes and restored a sandbox from them would get it open. That is one
   * element holding the arrangement and the other showing it, which is the state
   * the two requests above were rewritten to end.
   *
   * **So "shut" is spelled in pixels here.** `panel-collapsed-size` is the floor
   * `handlePanelChange` holds the panel to, `panel-size` reads it when the
   * divider is at the end, and `helix-before-panel-resize` is where a consumer
   * hears about it, in the units they already store. That is the same trade the
   * other two make: the sandbox is the single decision point because it refuses
   * what the splitter asks and re-announces the move in its own vocabulary.
   *
   * **Stopped as well as refused**, because `start` and `end` name the panes of
   * a splitter a consumer of this element is not supposed to know about, and the
   * two events above already say which divider moved. A collapse from something
   * slotted into a pane is somebody else's and passes through untouched, which
   * is what `target` against `currentTarget` is asking.
   *
   * Reached at all only since Splitter stopped returning on a refused
   * `helix-before-resize`. While it did, every collapse in here was unreachable
   * and `panel-collapsed-size` was inert with it.
   */
  private readonly handleCollapse = (event: Event): void => {
    this.claim(event)
  }

  /**
   * Puts a divider where this element says it is.
   *
   * Typed by what is used rather than by the class, which is the whole of the
   * coupling: a splitter this does not import is one that can be replaced.
   */
  private answer(divider: EventTarget | null, position: number): void {
    const target = divider as { position?: number } | null
    if (target && Number.isFinite(position)) {
      target.position = position
    }
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('helix-caret', this.handleCaret)
    this.addEventListener('helix-console', this.handleConsole)
    this.addEventListener('helix-before-edit', this.handleSourceChange)
    /* And the body is watched again, because `disconnectedCallback` stopped
       watching it. The observer itself survives, being a field rather than
       something `firstUpdated` built, but a disconnected one reports nothing
       until something calls `observe` again. Left to `firstUpdated` alone, a
       sandbox moved in the DOM comes back with its panel sizes frozen. */
    if (this.hasUpdated) {
      this.watchBody(true)
    }
  }

  /**
   * Watches the body, whose height is what the pane sizes are computed from.
   *
   * `render` asks for the render that height is for. The observer asks too, in
   * the report it gives every box it starts watching, so only a caller that
   * cannot wait for it passes true.
   */
  private watchBody(render: boolean): void {
    const body = this.renderRoot.querySelector<HTMLElement>('[part="body"]')
    if (!body) {
      return
    }
    this.bodyHeight = body.getBoundingClientRect().height
    this.watch?.observe(body)
    if (render) {
      this.requestUpdate()
    }
  }

  /**
   * Takes the body's height before each render, so the conversion is current.
   *
   * Guarded on `hasUpdated`, because there is no shadow root to measure before
   * the first render, and on the method existing, because the server's element
   * shim carries attributes but not tree traversal.
   */
  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    /* Whether there is a panel is known before the first render, from the
       light DOM, so the first render draws the dividers it needs rather than
       a second one being asked for from `firstUpdated`. **Not while
       hydrating**, whose render has to be the server's: Lit takes the
       server's attributes as already written, so a panel read here was never
       drawn, and the divider stayed hidden for good. That case reads it after,
       in `firstUpdated`. */
    if (!this.hasUpdated && this.childrenKnown) {
      this.readPanel()
    }
    /* A custom state, which is in no DOM, so hydration has nothing to compare. */
    this.toggleState('panel-collapsed', this.hasPanel && this.panelSize <= this.panelCollapsedSize)
    if (!this.hasUpdated || typeof this.renderRoot?.querySelector !== 'function') {
      return
    }
    const body = this.renderRoot.querySelector<HTMLElement>('[part="body"]')
    if (body) {
      this.bodyHeight = body.getBoundingClientRect().height
    }
  }

  /**
   * Starts watching the body, now there is one.
   *
   * **The render its height is for is the observer's to ask for**, in the
   * report every newly watched box gets, which arrives after layout and before
   * the first paint. Asking here as well rendered once from inside this update
   * and again when the report came. Where there is no observer, nothing else
   * will ask.
   */
  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    if (this.serverRendered) {
      this.readPanel()
      this.finishHydration()
    }
    this.watchBody(this.watch === undefined)
    this.seed()
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('helix-caret', this.handleCaret)
    this.removeEventListener('helix-console', this.handleConsole)
    this.removeEventListener('helix-before-edit', this.handleSourceChange)
    this.watch?.disconnect()
  }

  /**
   * Notes whether there is a panel, which is what its dividers depend on.
   *
   * Asked of the light DOM rather than of the slot. `slotchange` is the event
   * that says it changed, and it is listened for, but it is not the only way
   * to know: a sandbox whose panel was in the markup all along has nothing to
   * change, and an environment that does not dispatch the event at all leaves
   * the dividers permanently absent. What is slotted into a named slot is a
   * question the host can answer directly.
   */
  private readonly readPanel = (): void => {
    this.hasPanel = this.querySelector(':scope > [slot="panel"]') !== null
  }

  protected override render(): TemplateResult {
    const vertical = this.axis === 'vertical'
    const first = this.lead === 'preview' ? 'preview' : 'source'
    const second = first === 'preview' ? 'source' : 'preview'
    const split = Number.isFinite(this.split) ? this.split : DEFAULT_SPLIT
    /* The slot names swap with the panes, so each pane keeps its own
       `data-pane` and the stylesheet needs to know nothing about the order.
       Rendering both slots in both positions would be two elements answering
       to one name, and an assignment goes to the first. */
    const home = Number.isFinite(this.defaultSplit) ? this.defaultSplit : DEFAULT_SPLIT
    const label =
      this.separatorLabel || (first === 'preview' ? 'Resize preview pane' : 'Resize source pane')
    return html`<slot name="toolbar"></slot>
      <helix-splitter part="body" ?data-panel=${this.hasPanel} exportparts="separator, corner"
        orientation="vertical" collapsed-size=${this.panelSliver} corner-label=${this.cornerLabel}
        label=${this.panelLabel} default-position=${this.homePanelPosition}
        min=${100 - PANEL_MAX * 100} .position=${this.panelPosition}
        @helix-before-collapse=${this.handleCollapse} @helix-before-resize=${this.handlePanelChange}>
        <helix-splitter slot="start" part="panes" exportparts="separator" default-position=${home}
          label=${label} orientation=${vertical ? 'vertical' : 'horizontal'} .position=${split}
          @helix-before-collapse=${this.handleCollapse} @helix-before-resize=${this.handlePanesChange}>
          <div part="pane" data-pane=${first} slot="start"><slot name=${first} @slotchange=${this.seed}></slot></div>
          <div part="pane" data-pane=${second} slot="end"><slot name=${second} @slotchange=${this.seed}></slot></div>
        </helix-splitter>
        <div part="panel" slot="end"><slot name="panel" @slotchange=${this.readPanel}></slot></div>
      </helix-splitter>
      <slot name="status"></slot>`
  }

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-sandbox': HelixSandbox
  }
}

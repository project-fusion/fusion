import {
  customElement,
  type HelixBeforeEditEvent,
  HelixBeforePanelResizeEvent,
  type HelixBeforeResizeEvent,
  HelixBeforeSplitEvent,
  type HelixCaretEvent,
  type HelixConsoleEvent,
  HelixElement,
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
 * @summary Pairs an editable source pane with a live preview.
 *
 * @description
 * Coordination is by event: a source pane dispatches `helix-before-edit`, which
 * bubbles, and the sandbox hands the value to whatever preview is slotted into
 * it. Neither child knows the other exists, so either can be replaced or used
 * alone.
 *
 * The event carries the pane's `name`, which is what lets one sandbox hold
 * several panes: `html` is the preview's markup and `css` its stylesheet. A
 * pane named anything else is showing something rather than driving it, and is
 * ignored.
 *
 * **The dividers are two nested `helix-splitter`s**, not a grid this element
 * drags itself, so the pointer handling, the keyboard handling and the corner
 * are all the splitter's. The panes are the inner splitter and the panel is the
 * outer one, which is the order that makes the panel span the full width.
 *
 * @since 0.1.0
 * @status experimental
 * @category tooling
 * @aliases Playground, REPL, Editor
 * @documentation https://fusion.dev/helix/components/sandbox
 *
 * @slot panel - A panel under both panes, usually a terminal.
 * @slot preview - The live preview. Second unless `lead` says otherwise.
 * @slot source - The editable source pane. First unless `lead` says otherwise.
 * @slot status - A status bar, spanning both panes at the bottom.
 * @slot toolbar - A bar across the top, spanning both panes.
 *
 * @event {HelixBeforeEditEvent} helix-before-edit - Fired before the source is edited, by the source pane and heard here. Cancelable: refusing it takes the decision and nothing moves.
 * @event {HelixBeforePanelResizeEvent} helix-before-panel-resize - Fired before the panel's divider is let go, with its height in pixels. Cancelable: refusing it takes the decision and nothing moves.
 * @event {HelixBeforeSplitEvent} helix-before-split - Fired before the panes' divider is let go, with the lead pane's share. Cancelable: refusing it takes the decision and nothing moves.
 * @event {HelixCaretEvent} helix-caret - Fired when the cursor moves in the source, by the source pane and heard here.
 * @event {HelixConsoleEvent} helix-console - Relayed from the frame by the preview pane, one per console call.
 * @event {HelixResizeEvent} helix-resize - How tall the frame's content is, from the preview pane, whenever it changes.
 *
 * @csspart body - The splitter holding the panes above the panel.
 * @csspart corner - The handle where the two dividers cross.
 * @csspart pane - Either pane.
 * @csspart panel - The box holding whatever was slotted as the panel.
 * @csspart panes - The splitter holding the source and preview panes.
 * @csspart separator - Either divider.
 *
 * @cssproperty --sandbox-grab - The invisible width of a divider's drag target.
 * @cssproperty --sandbox-min-block-size - Minimum height of the sandbox.
 * @cssproperty --sandbox-separator-color - Color of the divider.
 */
@customElement('helix-sandbox')
export class HelixSandbox extends HelixElement {
  /**
   * Accessible name for the divider that moves both at once.
   */
  @property({ attribute: 'corner-label' })
  cornerLabel = 'Resize panes and panel'

  /**
   * What a reset makes the panel, in pixels.
   *
   * The pair to `panel-size`.
   */
  @property({ attribute: 'default-panel-size', type: Number })
  defaultPanelSize = DEFAULT_PANEL

  /**
   * Where a reset puts the divider, where nothing declared it.
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
   */
  @property({ reflect: true })
  orientation?: 'horizontal' | 'vertical'

  /**
   * What the panel's height becomes when it is closed.
   *
   * Zero closes it outright. A panel whose contents include the control that
   * reopens it, a row of tabs being the usual one, wants that row left showing,
   * and only whoever slotted it knows how tall that is.
   */
  @property({ attribute: 'panel-collapsed-size', type: Number })
  panelCollapsedSize = 0

  /**
   * Accessible name for the panel's divider.
   */
  @property({ attribute: 'panel-label' })
  panelLabel = 'Resize panel'

  /**
   * Height of the panel, in pixels.
   */
  @property({ attribute: 'panel-size', type: Number })
  panelSize = DEFAULT_PANEL

  /**
   * Accessible name for the divider.
   */
  @property({ attribute: 'separator-label' })
  separatorLabel = 'Resize source pane'

  /**
   * Percentage of the sandbox given to the source pane.
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

  /** The panel as a share of the body, which is what the splitter takes. */
  private get panelShare(): number {
    const size = Number.isFinite(this.panelSize) ? this.panelSize : DEFAULT_PANEL
    if (this.bodyHeight <= 0) {
      return 0
    }
    return Math.min(PANEL_MAX * 100, Math.max(0, (size / this.bodyHeight) * 100))
  }

  /**
   * Where the outer divider goes: everything the panel is not.
   *
   * A hundred with no panel, which puts the divider on the floor of the sandbox
   * with the panes filling it. The line itself is hidden by the stylesheet in
   * that case, because a boundary needs two sides.
   */
  private get panelPosition(): number {
    return this.hasPanel ? 100 - this.panelShare : 100
  }

  /** Where the panel divider goes on a reset, in the splitter's own units. */
  private get homePanelPosition(): number {
    const panel = Number.isFinite(this.defaultPanelSize) ? this.defaultPanelSize : DEFAULT_PANEL
    if (!this.hasPanel || this.bodyHeight <= 0) {
      return 100
    }
    return 100 - Math.min(PANEL_MAX * 100, Math.max(0, (panel / this.bodyHeight) * 100))
  }

  /** `panel-collapsed-size` in the units the splitter works in. */
  private get panelSliver(): number {
    if (this.bodyHeight <= 0) {
      return 0
    }
    return Math.min(100, Math.max(0, (this.panelCollapsedSize / this.bodyHeight) * 100))
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
       event has crossed a shadow boundary.

       Named, not guessed. Treating anything that is not `css` as markup holds
       only while there are two panes: a pane showing the example as JSX
       announces itself the same way, and the preview renders the text of a React
       component as though it were markup. */
    const pane = event.composedPath()[0] as { name?: string }
    if (pane?.name !== 'css' && pane?.name !== 'html') {
      return
    }
    for (const preview of this.previews) {
      if (pane.name === 'css') {
        preview.styles = value
      } else {
        preview.source = value
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
   * Says the panes' divider has settled, so a consumer can keep it.
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
   * **A verb each, rather than one `helix-before-resize` naming which of the two
   * moved.** Both dividers are this element's, so `composedPath()[0]` is the same
   * host for either and the event name is the only thing that can separate them.
   */
  private splitSettled(): void {
    this.dispatchEvent(new HelixBeforeSplitEvent({ value: String(this.split) }))
  }

  /** As `splitSettled`, for the panel, whose value is pixels rather than a share. */
  private panelSettled(): void {
    this.dispatchEvent(new HelixBeforePanelResizeEvent({ value: String(this.panelSize) }))
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
   */
  private readonly handlePanesChange = (event: Event): void => {
    if (event.target !== event.currentTarget) {
      return
    }
    const { value } = (event as HelixBeforeResizeEvent).detail
    event.stopPropagation()
    this.split = Number(value)
    this.splitSettled()
  }

  private readonly handlePanelChange = (event: Event): void => {
    if (event.target !== event.currentTarget) {
      return
    }
    const { value } = (event as HelixBeforeResizeEvent).detail
    event.stopPropagation()
    if (this.bodyHeight <= 0) {
      return
    }
    // Back into pixels, which is what this element promises and what a consumer
    // stored. The divider's position is the panes' share, so the panel is the
    // rest of it.
    this.panelSize = Math.max(0, ((100 - Number(value)) / 100) * this.bodyHeight)
    this.panelSettled()
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
      this.watchBody()
    }
  }

  /** Watches the body, whose height is what the pane sizes are computed from. */
  private watchBody(): void {
    const body = this.renderRoot.querySelector<HTMLElement>('[part="body"]')
    if (!body) {
      return
    }
    this.bodyHeight = body.getBoundingClientRect().height
    this.watch?.observe(body)
    this.requestUpdate()
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
    if (!this.hasUpdated || typeof this.renderRoot?.querySelector !== 'function') {
      return
    }
    const body = this.renderRoot.querySelector<HTMLElement>('[part="body"]')
    if (body) {
      this.bodyHeight = body.getBoundingClientRect().height
    }
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.readPanel()
    this.watchBody()
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
    return html`<slot name="toolbar"></slot>
      <helix-splitter
        part="body"
        ?data-panel=${this.hasPanel}
        exportparts="separator, corner"
        orientation="vertical"
        collapsed-size=${this.panelSliver}
        corner-label=${this.cornerLabel}
        label=${this.panelLabel}
        default-position=${this.homePanelPosition}
        min=${100 - PANEL_MAX * 100}
        .position=${this.panelPosition}
        @helix-before-resize=${this.handlePanelChange}
      >
        <helix-splitter
          slot="start"
          part="panes"
          exportparts="separator"
          default-position=${Number.isFinite(this.defaultSplit) ? this.defaultSplit : DEFAULT_SPLIT}
          label=${this.separatorLabel}
          orientation=${vertical ? 'vertical' : 'horizontal'}
          .position=${split}
          @helix-before-resize=${this.handlePanesChange}
        >
          ${
            /* The slot names swap with the panes, so each pane keeps its own
               `data-pane` and the stylesheet needs to know nothing about the
               order. Rendering both slots in both positions would be two
               elements answering to one name, and an assignment goes to the
               first. */
            ''
          }
          <div part="pane" data-pane=${first} slot="start"><slot name=${first}></slot></div>
          <div part="pane" data-pane=${second} slot="end"><slot name=${second}></slot></div>
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

import {
  customElement,
  type HelixCaretEvent,
  type HelixChangeEvent,
  type HelixConsoleEvent,
  HelixElement,
} from '@helix-io/core'
import type { CSSResultGroup, PropertyValues, TemplateResult } from 'lit'
import { html, nothing } from 'lit'
import { property, state } from 'lit/decorators.js'
import type { HelixSandboxPreview } from '../preview/sandbox-preview.js'
import type { HelixSandboxStatusBar } from '../status-bar/sandbox-status-bar.js'
import type { HelixSandboxTerminal } from '../terminal/sandbox-terminal.js'
import { styles } from './sandbox-root.css.js'

/** How far one arrow press moves the split, in percent. */
const STEP = 2

/** Bounds, so a pane can never be dragged to nothing. */
const MIN = 15
const MAX = 85

/** How far one arrow press moves the panel, in pixels. */
const PANEL_STEP = 16

/** Panel bounds. The floor leaves a line of output; the ceiling leaves panes. */
const PANEL_MIN = 64
const PANEL_MAX = 0.8

/**
 * @summary Pairs an editable source pane with a live preview.
 *
 * @description
 * Coordination is by event, the same way the accordion does it: a source pane
 * dispatches `SourceChange`, which bubbles, and the sandbox hands the value to
 * whatever preview is slotted into it. Neither child knows the other exists, so
 * either can be replaced or used alone.
 *
 * The event carries the pane's `name`, which is what lets one sandbox hold
 * several panes without the root identifying senders by reference. `html` is
 * the preview's markup and `css` is its stylesheet. A pane named anything else
 * is showing something rather than driving it, and is ignored: the sandbox has
 * a pane rendering the example as JSX, and guessing would have put the text of
 * a React component into the preview.
 *
 * The split is a real `role="separator"` with `aria-valuenow`, movable by
 * pointer and by arrow keys, because a divider that only responds to dragging
 * is unusable without a mouse. Home and End jump to the bounds.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Playground, REPL, Editor
 * @documentation https://helix.fusion.dev/sandbox
 *
 * @slot source - The editable source pane.
 * @slot preview - The live preview.
 * @slot toolbar - A bar across the top, spanning both panes.
 * @slot panel - A panel under both panes, usually a terminal.
 * @slot status - A status bar, spanning both panes at the bottom.
 *
 * @csspart pane - Either pane.
 * @csspart separator - The draggable divider.
 *
 * @cssproperty --sandbox-min-block-size - Minimum height of the sandbox.
 * @cssproperty --sandbox-separator-color - Color of the divider.
 */
@customElement('helix-sandbox')
export class HelixSandbox extends HelixElement {
  /** Whether the panes sit side by side or stacked. */
  @property({ reflect: true })
  orientation?: 'horizontal' | 'vertical'

  /** Percentage of the sandbox given to the source pane. */
  @property({ attribute: 'split', type: Number })
  split = 45

  /** Height of the panel, in pixels. */
  @property({ attribute: 'panel-size', type: Number })
  panelSize = 192

  /** Accessible name for the panel's divider. */
  @property({ attribute: 'panel-label' })
  panelLabel = 'Resize panel'

  /** Accessible name for the divider that moves both at once. */
  @property({ attribute: 'corner-label' })
  cornerLabel = 'Resize panes and panel'

  /** Accessible name for the divider. */
  @property({ attribute: 'separator-label' })
  separatorLabel = 'Resize source pane'

  @state()
  private dragging = false

  /**
   * Whether anything is in the panel region.
   *
   * The dividers around the panel are only meaningful when there is a panel to
   * size, and there is no way to ask in CSS: `:host(:has([slot="panel"]))` is
   * invalid, and the server has no children to look at. `slotchange` is the
   * platform answering on the client, which is where a divider is any use.
   */
  @state()
  private hasPanel = false

  /** Which axes the drag in progress is moving, if any. */
  private drag: 'block' | 'both' | 'inline' | null = null

  /**
   * The sandbox's box, measured once when a drag starts.
   *
   * Measuring per move is a forced layout on every pointer event, in the middle
   * of a gesture whose whole job is to stay ahead of the pointer. None of it
   * moves while dragging: the sandbox is where it was, and the panel's floor is
   * the status bar, which is not going anywhere either.
   */
  private origin: {
    bottom: number
    height: number
    left: number
    top: number
    width: number
  } | null = null

  /**
   * Whether a change came from inside this sandbox's source region.
   *
   * Structural rather than a type check. It was `instanceof
   * HelixSandboxSource`, which was right until there was a second kind of
   * pane: the editor is `@helix-io/sandbox/editor`, on its own path because it
   * carries CodeMirror, and naming its class here would pull that back into
   * this module for every consumer. Where the event came from is a question
   * about the tree, and the tree can answer it.
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
   * The origin is checked, and has to be. `helix-change` bubbles and composes,
   * so anything a consumer slots into a sandbox sends one up here too. A
   * sandbox hears a great deal that is not its source.
   */
  private readonly handleSourceChange = (event: Event): void => {
    if (!this.fromSource(event.target)) {
      return
    }
    const { name, value } = (event as HelixChangeEvent).detail
    // Named, not guessed. The rule was that `css` is the stylesheet and
    // anything else is markup, which was true while there were two panes and
    // wrong the moment there was a third: a pane showing the example as JSX
    // announced itself the same way, and the preview rendered the text of a
    // React component as though it were markup.
    if (name !== 'css' && name !== 'html') {
      return
    }
    for (const preview of this.previews) {
      if (name === 'css') {
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

  private clamp(next: number): number {
    return Math.min(MAX, Math.max(MIN, next))
  }

  /**
   * Keeps the panel between a usable floor and a ceiling that leaves panes.
   *
   * The ceiling is skipped when the height is zero, which means the sandbox has
   * not been laid out: multiplying that by a ratio gives zero, and clamping to
   * it would close the panel rather than bound it.
   */
  private clampPanel(next: number, height: number): number {
    const floored = Math.max(PANEL_MIN, next)
    return height > 0 ? Math.min(height * PANEL_MAX, floored) : floored
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
   * Moves a divider by the keyboard.
   *
   * One handler for all three, reading which axes the divider it came from is
   * allowed to move. The corner takes both, and each arrow moves the axis it
   * points along, which is the only reading of a diagonal handle that a
   * keyboard has.
   */
  private readonly handleKeydown = (event: KeyboardEvent): void => {
    const moves = (event.currentTarget as HTMLElement).dataset.drag ?? 'inline'
    const inline = moves !== 'block'
    const block = moves !== 'inline'
    const back = this.axis === 'horizontal' ? 'ArrowLeft' : 'ArrowUp'
    const forward = this.axis === 'horizontal' ? 'ArrowRight' : 'ArrowDown'
    const height = this.getBoundingClientRect().height

    if (inline && (event.key === back || event.key === forward)) {
      this.split = this.clamp(this.split + (event.key === back ? -STEP : STEP))
    } else if (block && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
      // Up grows the panel, because the panel's edge is what moves and it is
      // moving up. Down shrinks it.
      const step = event.key === 'ArrowUp' ? PANEL_STEP : -PANEL_STEP
      this.panelSize = this.clampPanel(this.panelSize + step, height)
    } else if (event.key === 'Home' || event.key === 'End') {
      if (inline) {
        this.split = event.key === 'Home' ? MIN : MAX
      }
      if (block && !inline) {
        this.panelSize = this.clampPanel(
          event.key === 'Home' ? PANEL_MIN : height * PANEL_MAX,
          height,
        )
      }
    } else {
      return
    }

    event.preventDefault()
  }

  private readonly handlePointerDown = (event: PointerEvent): void => {
    const handle = event.currentTarget as HTMLElement
    this.drag = (handle.dataset.drag as 'block' | 'both' | 'inline') ?? 'inline'
    this.dragging = true
    const box = this.getBoundingClientRect()
    this.origin = {
      bottom: box.bottom,
      height: box.height,
      left: box.left,
      top: box.top,
      width: box.width,
    }
    // Capture on the divider, so a fast drag that outruns the pointer does not
    // drop the gesture the moment the cursor leaves it.
    handle.setPointerCapture(event.pointerId)
  }

  /**
   * Follows the pointer, without going through a render.
   *
   * The sizes are written straight into the stylesheet rather than assigned to
   * the properties. A drag is a stream of events, and putting each one through
   * an update cycle means a render, a re-render of every slotted pane's host
   * bindings, and a style write, to move a divider by a pixel. Writing the two
   * custom properties is the only part of that which changes anything, and the
   * properties are set once at the end so the element still ends up saying what
   * it is showing.
   *
   * The box comes from `origin`, measured when the drag started, so no pointer
   * event forces a layout to ask where the sandbox is.
   */
  private readonly handlePointerMove = (event: PointerEvent): void => {
    const box = this.origin
    if (!this.drag || !box) {
      return
    }
    let { panelSize: panel, split } = this
    if (this.drag !== 'block') {
      split = this.clamp(
        this.axis === 'horizontal'
          ? ((event.clientX - box.left) / box.width) * 100
          : ((event.clientY - box.top) / box.height) * 100,
      )
    }
    if (this.drag !== 'inline') {
      // From the bottom of the sandbox rather than the top: what the pointer is
      // holding is the panel's upper edge, and the status bar under it is a
      // fixed cost that never enters the arithmetic.
      panel = this.clampPanel(box.bottom - event.clientY - this.statusHeight, box.height)
    }
    this.pending = { panel, split }
    this.applySizes(split, panel)
  }

  /**
   * Height of anything below the panel, which the panel's own height excludes.
   *
   * Read once per drag along with the box. A status bar does not resize while
   * a divider is being dragged.
   */
  private statusHeight = 0

  /** The sizes the drag has reached, to be committed when it ends. */
  private pending: { panel: number; split: number } | null = null

  private readonly handlePointerUp = (event: PointerEvent): void => {
    // The properties catch up with what the stylesheet has been showing, so
    // the element reports the size it is at and a re-render keeps it.
    if (this.pending) {
      this.panelSize = this.pending.panel
      this.split = this.pending.split
      this.pending = null
    }
    this.dragging = false
    this.drag = null
    this.origin = null
    ;(event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId)
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('helix-caret', this.handleCaret)
    this.addEventListener('helix-console', this.handleConsole)
    this.addEventListener('helix-change', this.handleSourceChange)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('helix-caret', this.handleCaret)
    this.removeEventListener('helix-console', this.handleConsole)
    this.removeEventListener('helix-change', this.handleSourceChange)
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    this.toggleAttribute('data-dragging', this.dragging)
  }

  /**
   * Writes the sizes into the shadow root's own stylesheet.
   *
   * Into a `<style>` rather than onto `this.style`, because an inline style on
   * the host is an attribute the element gives itself once it upgrades, and a
   * React consumer's server markup does not have it: hydration reports the
   * mismatch and does not patch it up. The shadow root is not part of the tree
   * React hydrates.
   *
   * Filled imperatively because Lit rejects expressions inside `<style>`, which
   * is why the template carries a static empty one. The server renders the
   * stylesheet's own defaults, which are the same values these properties
   * default to.
   */
  private applySizes(split = this.split, panel = this.panelSize): void {
    const sheet = this.renderRoot.querySelector<HTMLStyleElement>('#sizes')
    if (sheet) {
      sheet.textContent = `:host { --_sandbox-split: ${split}%; --_sandbox-panel: ${panel}px; }`
    }
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.applySizes()
    this.readPanel()
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    if (changed.has('panelSize') || changed.has('split')) {
      this.applySizes()
    }
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
    this.statusHeight = this.statusBars[0]?.getBoundingClientRect().height ?? 0
  }

  protected override render(): TemplateResult {
    const vertical = this.axis === 'vertical'
    return html`<style id="sizes"></style>
      <slot name="toolbar"></slot>
      <div part="pane" data-pane="source"><slot name="source"></slot></div>
      <div
        part="separator"
        data-drag="inline"
        role="separator"
        tabindex="0"
        aria-label=${this.separatorLabel}
        aria-orientation=${vertical ? 'horizontal' : 'vertical'}
        aria-valuemax=${MAX}
        aria-valuemin=${MIN}
        aria-valuenow=${Math.round(this.split)}
        @keydown=${this.handleKeydown}
        @pointerdown=${this.handlePointerDown}
        @pointermove=${this.handlePointerMove}
        @pointerup=${this.handlePointerUp}
      ></div>
      <div part="pane" data-pane="preview"><slot name="preview"></slot></div>
      ${
        this.hasPanel
          ? html`<div
              part="separator"
              data-drag="block"
              data-axis="block"
              role="separator"
              tabindex="0"
              aria-label=${this.panelLabel}
              aria-orientation="horizontal"
              aria-valuenow=${Math.round(this.panelSize)}
              @keydown=${this.handleKeydown}
              @pointerdown=${this.handlePointerDown}
              @pointermove=${this.handlePointerMove}
              @pointerup=${this.handlePointerUp}
            ></div>`
          : nothing
      }
      ${
        // Only where the two dividers actually cross. Stacked, they are
        // parallel and there is no corner to take hold of.
        this.hasPanel && !vertical
          ? html`<div
              part="corner"
              data-drag="both"
              role="separator"
              tabindex="0"
              aria-label=${this.cornerLabel}
              @keydown=${this.handleKeydown}
              @pointerdown=${this.handlePointerDown}
              @pointermove=${this.handlePointerMove}
              @pointerup=${this.handlePointerUp}
            ></div>`
          : nothing
      }
      <slot name="panel" @slotchange=${this.readPanel}></slot>
      <slot name="status"></slot>`
  }

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-sandbox': HelixSandbox
  }
}

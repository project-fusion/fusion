import {
  customElement,
  fillTemplate,
  formatNumbers,
  HelixElement,
  HelixGraphPanEvent,
  HelixGraphReadyEvent,
  HelixGraphZoomEvent,
  MixinControllerActive,
  MixinViewport,
  type ViewportPanDetail,
  type ViewportZoomDetail,
  VirtualizeController,
} from '@fusion.dev/helix-core'
import { magnifyingGlass } from '@fusion.dev/helix-icons'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'
import {
  type Adjacency,
  adjacencyOf,
  type Entry,
  entriesOf,
  type GraphLink,
  type GraphNode,
  nameOf,
  sortedOf,
  within,
} from './graph-model.js'

/** How many rows a Page Up or Page Down moves through the list. */
const PAGE = 10

/**
 * @summary A frame around a graph of notes drawn by another library, and the list that makes it readable.
 *
 * @description
 * Helix draws no graph. A force layout of thousands of notes is physics and
 * WebGL, which a renderer such as Sigma.js does. Put the renderer's box in the
 * frame, draw `nodes` and `links` in it, and answer the frame's pan and zoom
 * events by moving the drawing.
 *
 * What the frame adds is what a drawing of a graph cannot do: a list of every
 * note beside it, which is the graph for a screen reader and a quick way to
 * find a note for anyone. The selected note comes first, then the notes it
 * links to and from, then every other note, and the search field narrows it.
 * Selecting a note in the list or in the drawing is the same selection.
 *
 * Set `depth` to show the local graph: only the notes within that many links
 * of the selected one.
 *
 * `nodes` and `links` are properties, never markup: a graph of ten thousand
 * notes as ten thousand elements would cost what the renderer exists to save.
 * The list draws only the rows in view.
 *
 * The list scrolls on this tier. It carries `data-scroller`, and `core` ships
 * `[data-scroller] { overflow: auto }` into every shadow root. You still need
 * to set a block size on the list, or it grows to hold every row.
 *
 * @since 0.116.0
 * @status experimental
 * @category media
 * @aliases Knowledge graph, Network, Note graph, Second brain
 * @documentation https://fusion.dev/helix/components/graph
 *
 * @slot - The renderer's box, which the drawing is made in.
 * @slot filter-icon - The icon in the search field. Defaults to a magnifying glass.
 * @slot footer - Content below the graph.
 * @slot header - Content above the graph.
 *
 * @event {HelixActivateEvent} helix-activate - A note was selected, in the list or in the drawing. The detail's `value` is its `id`.
 * @event {HelixBeforeActivateEvent} helix-before-activate - A note is about to be selected. Cancelable: cancel it to keep the selection in your own state.
 * @event {HelixGraphPanEvent} helix-graph-pan - A pan button or arrow key was pressed. Move the drawing.
 * @event {HelixGraphReadyEvent} helix-graph-ready - The graph has been drawn whole, laid out and settled. Sent each time `drawn()` says it is drawn after it was not.
 * @event {HelixGraphZoomEvent} helix-graph-zoom - A zoom button or key was pressed. Zoom the drawing.
 *
 * @csspart after - The room the notes after those drawn would take, so the list scrolls its whole length.
 * @csspart before - The room the notes before those drawn would take.
 * @csspart body - The drawing beside the list, or above it where the frame is narrow.
 * @csspart controls - The group the pan and zoom buttons sit in.
 * @csspart count - How many notes the list holds, which a search narrows, at the end of the search bar.
 * @csspart filter-icon - The icon beside the search field.
 * @csspart filter-mark - The default icon beside the search field, shown when none is slotted.
 * @csspart footer - The strip below the graph.
 * @csspart fullscreen - The button that makes the graph fill the screen.
 * @csspart header - The strip above the graph.
 * @csspart list - The list of notes, which draws only the rows in view.
 * @csspart live - What screen readers hear when a search changes how many notes there are.
 * @csspart note - One note in the list.
 * @csspart note-cursor - The note the keyboard is on in the list.
 * @csspart note-linked - A note linked to or from the selected one.
 * @csspart note-name - A note's name in the list.
 * @csspart note-relation - How a note stands to the selected one, such as "Linked from Alpha".
 * @csspart note-selected - The selected note, first in the list.
 * @csspart pan-down - The button that moves the graph down.
 * @csspart pan-end - The button that moves the graph toward the end of a line of text: right in English.
 * @csspart pan-start - The button that moves the graph toward the start of a line of text: left in English.
 * @csspart pan-up - The button that moves the graph up.
 * @csspart panel - The search field and the list, beside the drawing or below it.
 * @csspart region - The frame: the drawing, its controls and the list.
 * @csspart search - The bar holding the icon, the search field and the count.
 * @csspart search-field - The field that finds a note by its name.
 * @csspart stage - The drawing and its controls.
 * @csspart viewport - The box the renderer draws in.
 * @csspart zoom-in - The zoom in button.
 * @csspart zoom-out - The zoom out button.
 *
 * @cssstate fullscreen - The graph fills the screen.
 * @cssstate idle - The user has been still long enough for the header and footer to fade.
 * @cssstate ready - The graph has been drawn whole, after `helix-graph-ready`.
 */
@customElement('helix-headless-graph')
export class HelixHeadlessGraph extends MixinViewport(MixinControllerActive(HelixElement)) {
  /** What the list says of a note's count, with `{count}`. */
  @property({ attribute: 'count-label' })
  countLabel = '{count} notes'

  /**
   * How many links from the selected note to show, for its local graph. Unset
   * shows every note. The list holds what the drawing shows.
   */
  @property({ type: Number })
  depth?: number

  /**
   * The graph's name, read by screen readers, such as "Research notes".
   * Required.
   */
  @property()
  label = ''

  /** How a note linked both to and from the selected one is described, with `{note}`. */
  @property({ attribute: 'linked-both-label' })
  linkedBothLabel = 'Linked both ways with {note}'

  /** How a note the selected one links to is described, with `{note}`, the selected note's name. */
  @property({ attribute: 'linked-from-label' })
  linkedFromLabel = 'Linked from {note}'

  /** The links between notes, each from `source` to `target`. A property, never an attribute. */
  @property({ attribute: false })
  links: readonly GraphLink[] = []

  /** How a note that links to the selected one is described, with `{note}`. */
  @property({ attribute: 'links-to-label' })
  linksToLabel = 'Links to {note}'

  /** The notes. A property, never an attribute. */
  @property({ attribute: false })
  nodes: readonly GraphNode[] = []

  /** The list's name, read by screen readers. */
  @property({ attribute: 'notes-label' })
  notesLabel = 'Notes'

  /** The search field's name. */
  @property({ attribute: 'search-label' })
  searchLabel = 'Find a note'

  /** How the selected note is described in the list. */
  @property({ attribute: 'selected-label' })
  selectedLabel = 'Selected'

  /** What the search field holds. */
  @state()
  private query = ''

  /** The row the keyboard is on, as an index into the list. */
  @state()
  private cursor = 0

  /** Which notes link to and from each, read again when `links` changes. */
  private adjacency: Adjacency = new Map()

  /** The notes in the order of their names, read again when `nodes` changes. */
  private sorted: GraphNode[] = []

  /** The list's rows, read again when anything they come from changes. */
  private entries: Entry[] = []

  /** The notes the local graph keeps, or every note where there is no `depth`. */
  private kept: Set<string> | undefined

  /** Whether the graph has been drawn whole, which `drawn()` says. */
  private whole = false

  /** How many notes there were when the count was last said. */
  private said = ''

  private readonly virtualize = new VirtualizeController(this, {
    container: () => this.partNamed('list'),
    count: () => this.entries.length,
    estimate: () => 32,
    rows: () =>
      [...(this.renderRoot.querySelectorAll?.('[data-index]') ?? [])].map((element) => ({
        element: element as HTMLElement,
        index: Number((element as HTMLElement).dataset.index),
      })),
  })

  /**
   * @internal The notes the drawing shows, for the code that draws it: those
   * within `depth` of the selected note, or `undefined` for every note.
   */
  get shown(): ReadonlySet<string> | undefined {
    return this.kept
  }

  /** Whether the graph has been drawn whole. For code that runs after `helix-graph-ready`. */
  get ready(): boolean {
    return this.whole
  }

  /**
   * Says the graph has been drawn whole, or with `false`, that it no longer
   * is. Call it when the renderer's layout has settled and the graph is
   * finished. The first call after
   * the graph was not drawn sends `helix-graph-ready` and turns on
   * `:state(ready)`.
   */
  drawn(whole = true): void {
    if (whole === this.whole) {
      return
    }
    this.whole = whole
    this.toggleState('ready', whole)
    if (whole) {
      this.dispatchEvent(new HelixGraphReadyEvent())
    }
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    this.toggleState('fullscreen', this.filled)
    this.toggleState('idle', this.resting)
    if (changed.has('links')) {
      this.adjacency = adjacencyOf(this.links)
    }
    if (changed.has('nodes')) {
      this.sorted = sortedOf(this.nodes, this.closest?.('[lang]')?.getAttribute('lang') ?? '')
    }
    if (changed.has('active') || changed.has('depth') || changed.has('links')) {
      this.kept =
        typeof this.depth === 'number' && this.active !== ''
          ? within(this.adjacency, this.active, Math.max(0, this.depth))
          : undefined
    }
    if (['nodes', 'links', 'active', 'depth', 'query'].some((name) => changed.has(name))) {
      this.entries = entriesOf(this.sorted, this.adjacency, this.active, this.query, this.kept)
      /* A new order is a list read from its top, the selected note first. */
      this.cursor = 0
      const list = this.partNamed('list')
      if (list) {
        list.scrollTop = 0
      }
    }
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    /* After every render, because a change of notes or a search changes how
       many rows there are, and the window is the list's to settle. */
    this.virtualize.measure()
    /* The count said when a search changes it, which is when a reader who
       cannot see the list needs to know how much it holds. */
    if (changed.has('query') && changed.get('query') !== undefined) {
      this.said = this.countText()
    }
  }

  protected override panEvent(detail: ViewportPanDetail): Event {
    return new HelixGraphPanEvent(detail)
  }

  protected override zoomEvent(detail: ViewportZoomDetail): Event {
    return new HelixGraphZoomEvent(detail)
  }

  protected override get restingControls(): string {
    return 'zoom fullscreen'
  }

  protected override get restingControlsLabel(): string {
    return 'Graph controls'
  }

  /** How many notes the list holds, in the page's numbers. */
  private countText(): string {
    const lang = this.closest?.('[lang]')?.getAttribute('lang') ?? ''
    return fillTemplate(this.countLabel, { count: formatNumbers(lang)(this.entries.length) })
  }

  /** How a row stands to the selected note, in words, or nothing where it does not. */
  private relationText(entry: Entry): string {
    const selected = this.nodes.find((node) => node.id === this.active)
    const note = selected ? nameOf(selected) : ''
    switch (entry.relation) {
      case 'selected':
        return this.selectedLabel
      case 'to':
        return fillTemplate(this.linkedFromLabel, { note })
      case 'from':
        return fillTemplate(this.linksToLabel, { note })
      case 'both':
        return fillTemplate(this.linkedBothLabel, { note })
      default:
        return ''
    }
  }

  /** Selects the note a row names, through the request a page can refuse. */
  private choose(index: number): void {
    const entry = this.entries[index]
    if (entry) {
      this.requestActive(entry.node.id)
    }
  }

  /**
   * Moves the keyboard to a row, and the list to show it.
   *
   * **Scrolled by the row's own box where it is drawn, and by the estimate
   * where it is not**, so a jump to the end of ten thousand notes lands there
   * and the row is drawn by the update the scroll asks for.
   */
  private moveTo(index: number): void {
    const last = this.entries.length - 1
    this.cursor = Math.min(Math.max(index, 0), Math.max(last, 0))
    const list = this.partNamed('list')
    if (!list) {
      return
    }
    const row = this.renderRoot.querySelector?.<HTMLElement>(`[data-index="${this.cursor}"]`)
    if (row) {
      row.scrollIntoView?.({ block: 'nearest' })
    } else {
      list.scrollTop = this.cursor * 32
    }
    this.virtualize.measure()
  }

  /**
   * The keys in the list. **Kept from the frame**, whose arrows pan the
   * drawing: a reader moving through the list was moving the graph under it.
   */
  private readonly handleListKeydown = (event: KeyboardEvent): void => {
    const moves: Record<string, number> = {
      ArrowDown: this.cursor + 1,
      ArrowUp: this.cursor - 1,
      End: this.entries.length - 1,
      Home: 0,
      PageDown: this.cursor + PAGE,
      PageUp: this.cursor - PAGE,
    }
    if (event.key in moves) {
      event.preventDefault()
      event.stopPropagation()
      this.moveTo(moves[event.key] as number)
      return
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      event.stopPropagation()
      this.choose(this.cursor)
    }
  }

  /**
   * The search field's keys, which belong to the field and never pan the
   * graph. Escape empties a search that has words in it, and passes through
   * an empty one to whatever the page does with it.
   */
  private readonly handleSearchKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      this.partNamed('list')?.focus()
    }
    if (event.key === 'Escape') {
      if (this.query === '') {
        return
      }
      event.preventDefault()
      this.query = ''
    }
    event.stopPropagation()
  }

  private readonly handleSearch = (event: Event): void => {
    this.query = (event.target as HTMLInputElement).value
  }

  /**
   * The mark in the search field, behind a seam: a slot for the page, and a
   * method for the tier above, as the listbox's filter has.
   */
  protected renderFilterIcon(): TemplateResult {
    return html`<slot name="filter-icon">
      <svg part="filter-mark" fill="currentColor" viewBox=${magnifyingGlass.viewBox}>
        ${unsafeSVG(magnifyingGlass.content)}
      </svg>
    </slot>`
  }

  private renderRows(): TemplateResult[] {
    const { first, last } = this.virtualize.window
    const total = this.entries.length
    return this.entries.slice(first, last).map((entry, offset) => {
      const index = first + offset
      const relation = this.relationText(entry)
      const chosen = entry.relation === 'selected'
      /* The part names written into the attribute and not built apart from
         it, so the manifest sees each one. */
      return html`<div
        part="note${chosen ? ' note-selected' : entry.relation ? ' note-linked' : ''}${index === this.cursor ? ' note-cursor' : ''}"
        role="option"
        id=${`note-${index}`}
        data-index=${index}
        aria-selected=${chosen ? 'true' : 'false'}
        aria-posinset=${index + 1}
        aria-setsize=${total}
        aria-description=${relation || nothing}
        @click=${() => {
          this.cursor = index
          this.choose(index)
        }}
      >
        <span part="note-name">${nameOf(entry.node)}</span>
        ${relation ? html`<span part="note-relation" aria-hidden="true">${relation}</span>` : nothing}
      </div>`
    })
  }

  protected override render(): TemplateResult {
    const { after, before } = this.virtualize.window
    const cursor = this.entries.length > 0 ? `note-${this.cursor}` : nothing
    return html`<div
      part="region"
      role="group"
      aria-label=${this.label || this.getAttribute?.('aria-label') || 'Graph'}
      tabindex="0"
      @focusin=${this.idle.stir}
      @keydown=${this.handleKeydown}
      @pointerleave=${this.idle.leave}
      @pointermove=${this.idle.stir}
    >
      <div part="header">
        <slot name="header"></slot>
      </div>
      <div part="body">
        <div part="stage">
          <div part="viewport">
            <slot></slot>
          </div>
          ${this.renderControls()}
        </div>
        <div part="panel">
          <div part="search">
            <span part="filter-icon" aria-hidden="true">${this.renderFilterIcon()}</span>
            <input
              part="search-field"
              type="text"
              autocomplete="off"
              spellcheck="false"
              aria-label=${this.searchLabel}
              placeholder=${this.searchLabel}
              .value=${this.query}
              @input=${this.handleSearch}
              @keydown=${this.handleSearchKeydown}
            />
            <span part="count" aria-hidden="true">${this.countText()}</span>
          </div>
          <div
            part="list"
            role="listbox"
            tabindex="0"
            data-scroller
            aria-label=${this.notesLabel}
            aria-activedescendant=${cursor}
            @keydown=${this.handleListKeydown}
            @scroll=${() => this.virtualize.measure()}
          >
            <div part="before" style="block-size: ${before}px"></div>
            ${this.renderRows()}
            <div part="after" style="block-size: ${after}px"></div>
          </div>
        </div>
      </div>
      <div part="footer">
        <slot name="footer"></slot>
      </div>
      <span part="live" role="status">${this.said}</span>
    </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-graph': HelixHeadlessGraph
  }
}

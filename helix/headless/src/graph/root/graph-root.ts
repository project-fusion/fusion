import {
  auditName,
  customElement,
  focusItemOf,
  formatWords,
  type GraphSignalDetail,
  HelixElement,
  HelixGraphFilterEvent,
  HelixGraphLayoutEvent,
  HelixGraphPanEvent,
  HelixGraphPartChangeEvent,
  HelixGraphReadyEvent,
  HelixGraphSignalEvent,
  HelixGraphZoomEvent,
  isRtl,
  KeyboardNavigationController,
  MixinControllerActive,
  MixinViewport,
  scrollItemIntoView,
  scrollRoom,
  Typeahead,
  typeaheadBy,
  type ViewportPanDetail,
  type ViewportZoomDetail,
  VirtualizeController,
  words,
  wordsLocale,
} from '@fusion.dev/helix-core'
import { list, magnifyingGlass } from '@fusion.dev/helix-icons'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { repeat } from 'lit/directives/repeat.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'
import {
  type Adjacency,
  adjacencyOf,
  cursorAfter,
  type Entry,
  entriesOf,
  type GraphGroupEntry,
  type GraphLink,
  type GraphNode,
  groupsOf,
  nameOf,
  sortedOf,
  within,
  withoutGroups,
} from './graph-model.js'

/**
 * @summary A frame around a graph of notes drawn by another library, and the list that makes it readable.
 *
 * @description
 * Helix draws no graph. A force layout of thousands of notes is physics and
 * WebGL, which a renderer such as Sigma.js does. Put the renderer's box in the
 * frame, and `connectGraph` from `@fusion.dev/helix-graph` draws `nodes` and
 * `links` in it and keeps it in step with the frame.
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
 * The search field is a combobox over the list. Down and Up move through the
 * notes while the focus stays in the field, and Enter selects one.
 *
 * **Walk the links with Alt and the arrow keys**, in the list or in the
 * search field once its keys are on a note. The note the keys are on is
 * marked in the drawing.
 *
 * | Key | What it does |
 * |---|---|
 * | Alt+Right | Follows a link, to the first note the one the keys are on links to or from. |
 * | Alt+Down, Alt+Up | Moves to the next or the previous note linked to the one the step came from, wrapping. |
 * | Alt+Left | Goes back along the links walked. |
 *
 * Right and Left swap on a right-to-left page. Each step says the note, how it
 * stands to the note it came from, and its place among that note's links,
 * such as "Hiring plan. Linked from Roadmap. 2 of 3". Enter selects the note.
 *
 * Set `legend` to name the groups over the drawing, each a button that shows
 * or hides its notes. `hiddenGroups` holds the groups turned off, and the
 * list holds only what the drawing shows. The legend is a toolbar and one tab
 * stop: the arrow keys, Home, End and a group's first letters move between
 * its buttons, and Space or Enter presses one.
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
 * @slot empty - What the panel shows when the list holds no notes. Defaults to `empty-label`.
 * @slot filter-icon - The icon in the search field. Defaults to a magnifying glass.
 * @slot footer - Content below the graph.
 * @slot fullscreen-icon - Replaces the glyph inside the fullscreen button.
 * @slot header - Content above the graph.
 * @slot loading - What the panel shows while `loading` is set and the list holds no notes. Defaults to `loading-label`.
 * @slot pan-down-icon - Replaces the glyph inside the pan down button.
 * @slot pan-end-icon - Replaces the glyph inside the button that pans toward the end of a line of text.
 * @slot pan-start-icon - Replaces the glyph inside the button that pans toward the start of a line of text.
 * @slot pan-up-icon - Replaces the glyph inside the pan up button.
 * @slot zoom-in-icon - Replaces the glyph inside the zoom-in button.
 * @slot zoom-out-icon - Replaces the glyph inside the zoom-out button.
 *
 * @event {HelixActivateEvent} helix-activate - A note was selected, in the list or in the drawing. The detail's `value` is its `id`.
 * @event {HelixBeforeActivateEvent} helix-before-activate - A note is about to be selected. Cancelable: cancel it to keep the selection in your own state.
 * @event {HelixGraphFilterEvent} helix-graph-filter - A group in the legend was pressed, to show or hide its notes. The detail's `hidden` is every group that would be hidden. Cancelable: cancel it to keep the groups as they were, or to set `hiddenGroups` yourself.
 * @event {HelixGraphLayoutEvent} helix-graph-layout - A layout settled, with where it put each note, sent by `laidOut()`. Keep the positions and pass them back as each note's `x` and `y`, and `z` where a renderer draws in three dimensions.
 * @event {HelixGraphPanEvent} helix-graph-pan - A pan button or arrow key was pressed. `connectGraph` moves the drawing, then calls `moved()`.
 * @event {HelixGraphPartChangeEvent} helix-graph-part-change - The notes, the links, the selection, the depth, the note the keys are on, or the gestures changed. Used by `connectGraph`; pages do not need to listen for it.
 * @event {HelixGraphReadyEvent} helix-graph-ready - The graph has been drawn whole, laid out and settled. Sent each time `drawn()` says it is drawn after it was not.
 * @event {HelixGraphSignalEvent} helix-graph-signal - Something passed between two notes, sent by `signal()`. Used by `connectGraph`; pages do not need to listen for it.
 * @event {HelixGraphZoomEvent} helix-graph-zoom - A zoom button or key was pressed. `connectGraph` zooms the drawing, then calls `moved()`.
 *
 * @csspart after - The room the notes after those drawn would take, so the list scrolls its whole length.
 * @csspart before - The room the notes before those drawn would take.
 * @csspart body - The drawing beside the list, or above it where the frame is narrow.
 * @csspart controls - The group the pan and zoom buttons sit in.
 * @csspart count - How many notes the list holds, which a search narrows, at the end of the search bar.
 * @csspart empty - The box in place of the list when it holds no notes, holding the `empty` slot.
 * @csspart filter-icon - The icon beside the search field.
 * @csspart filter-mark - The default icon beside the search field, shown when none is slotted.
 * @csspart footer - The strip below the graph.
 * @csspart fullscreen - The button that makes the graph fill the screen.
 * @csspart gesture-hint - Words over the graph for a moment when it lets a gesture pass to the page, such as how to zoom it.
 * @csspart gesture-status - The line shown while a graph with `gestures="activate"` has the gestures.
 * @csspart header - The strip above the graph.
 * @csspart legend - The groups over the drawing, with `legend`: a toolbar of buttons, each showing or hiding its notes, which is one tab stop.
 * @csspart legend-item - One group in the legend, pressed while its notes are shown. Carries `data-tone` where every note in the group has the same tone, which colors the notes over the group's own color.
 * @csspart legend-item-hidden - A group in the legend whose notes are hidden.
 * @csspart legend-swatch - The mark in a group's color, before its name.
 * @csspart list - The list of notes, which draws only the rows in view.
 * @csspart live - What screen readers hear: how many notes there are when a search or the legend changes it, and which way the drawing went after a key or a control moved it.
 * @csspart loading - The box in place of the list while `loading` is set and it holds no notes, holding the `loading` slot.
 * @csspart note - One note in the list.
 * @csspart note-cursor - The note the keyboard is on in the list.
 * @csspart note-linked - A note linked to or from the selected one.
 * @csspart note-name - A note's name in the list.
 * @csspart note-relation - How a note stands to the selected one, such as "Linked from Alpha".
 * @csspart note-selected - The selected note, first in the list.
 * @csspart notes-toggle - The button among the controls that opens the search and the list over the drawing, with `no-panel`.
 * @csspart pan-down - The button that moves the graph down.
 * @csspart pan-end - The button that moves the graph toward the end of a line of text: right in English.
 * @csspart pan-start - The button that moves the graph toward the start of a line of text: left in English.
 * @csspart pan-up - The button that moves the graph up.
 * @csspart panel - The search field and the list, beside the drawing or below it, or over the drawing when opened with `no-panel`.
 * @csspart region - The frame: the drawing, its controls and the list.
 * @csspart search - The bar holding the icon, the search field and the count.
 * @csspart search-field - The field that finds a note by its name.
 * @csspart stage - The drawing and its controls.
 * @csspart viewport - The box the renderer draws in.
 * @csspart zoom-in - The zoom in button.
 * @csspart zoom-out - The zoom out button.
 *
 * @cssstate empty - The list holds no notes: the graph has none, or a search or the groups hid them all.
 * @cssstate fullscreen - The graph fills the screen.
 * @cssstate idle - The user has been still long enough for the header and footer to fade.
 * @cssstate loading - While `loading` is set.
 * @cssstate local - The drawing shows the selected note's local graph, with `depth`.
 * @cssstate panel-open - A graph with `no-panel` has the search and the list open over the drawing.
 * @cssstate ready - The graph has been drawn whole, after `helix-graph-ready`.
 * @cssstate searching - The search field holds words, and the list holds only the notes they find.
 * @cssstate selected - A note is selected, in the list or in the drawing.
 * @cssstate sharing - The page keeps the plain wheel and one finger, with `gestures="cooperative"` or while a graph with `gestures="activate"` waits to be pressed.
 * @cssstate using - A graph with `gestures="activate"` has been pressed and has the gestures.
 */
@customElement('helix-headless-graph')
export class HelixHeadlessGraph extends MixinViewport(MixinControllerActive(HelixElement)) {
  /**
   * The key this family's words are registered under, its styled tag:
   * `registerWords('de', { 'helix-graph': { searchLabel: 'Notiz suchen' } })`.
   */
  static words = 'helix-graph'

  /**
   * The hint shown when the graph, waiting to be pressed with
   * `gestures="activate"`, is scrolled or swiped over.
   */
  @words
  @property({ attribute: 'activate-hint-label' })
  override activateHintLabel = 'Press the graph to use it'

  /**
   * The name of the group of controls, read by screen readers, which names
   * what the controls drive rather than the mechanism.
   */
  @words
  @property({ attribute: 'controls-label' })
  override controlsLabel = 'Graph controls'

  /**
   * What the list says of how many notes it holds. `{count}` is the count,
   * written in the locale, and each language writes the forms it has.
   */
  @words
  @property({ attribute: 'count-label' })
  countLabel = '{count, plural, one {# note} other {# notes}}'

  /**
   * How many links from the selected note to show, for its local graph. Unset
   * shows every note. The list holds what the drawing shows.
   */
  @property({ type: Number })
  depth?: number

  /**
   * What the panel shows when the list holds no notes: the graph has none, or
   * a search or the legend hid them all. A slotted `empty` replaces it.
   */
  @words
  @property({ attribute: 'empty-label' })
  emptyLabel = 'No notes'

  /**
   * The graph's name where `label` is empty and the host has no
   * `aria-label`.
   */
  @words
  @property({ attribute: 'fallback-label' })
  fallbackLabel = 'Graph'

  /** The groups turned off in the legend, by name, whose notes neither the drawing nor the list shows. A property, never an attribute. */
  @property({ attribute: false })
  hiddenGroups: readonly string[] = []

  /**
   * The graph's name, read by screen readers, such as "Research notes".
   * Required.
   */
  @property()
  label = ''

  /**
   * Names the groups over the drawing, each a button in its color that shows
   * or hides its notes. Drawn where the notes have two groups or more.
   */
  @property({ type: Boolean })
  legend = false

  /** The legend's name, read by screen readers. */
  @words
  @property({ attribute: 'legend-label' })
  legendLabel = 'Groups'

  /** How a note linked both to and from the selected one is described, with `{note}`. */
  @words
  @property({ attribute: 'linked-both-label' })
  linkedBothLabel = 'Linked both ways with {note}'

  /** How a note the selected one links to is described, with `{note}`, the selected note's name. */
  @words
  @property({ attribute: 'linked-from-label' })
  linkedFromLabel = 'Linked from {note}'

  /** The links between notes, each from `source` to `target`. A property, never an attribute. */
  @property({ attribute: false })
  links: readonly GraphLink[] = []

  /** How a note that links to the selected one is described, with `{note}`. */
  @words
  @property({ attribute: 'links-to-label' })
  linksToLabel = 'Links to {note}'

  /**
   * What screen readers hear when a walk along the links reaches a note that
   * has no link to follow, or goes back to a note: `{note}` for its name and
   * `{count}` for how many notes the list holds that it links to or from.
   */
  @words
  @property({ attribute: 'link-count-label' })
  linkCountLabel = '{note}. {count, plural, =0 {No links} one {# link} other {# links}}'

  /**
   * Marks the graph as busy while its notes arrive: the list is `aria-busy`,
   * and the panel says so where it holds no notes yet.
   */
  @property({ reflect: true, type: Boolean })
  loading = false

  /** What the panel says while `loading` is set and the list holds no notes. */
  @words
  @property({ attribute: 'loading-label' })
  loadingLabel = 'Loading notes'

  /** What screen readers hear once the drawing has moved down, after `moved()`. */
  @words
  @property({ attribute: 'moved-down-label' })
  movedDownLabel = 'Moved down'

  /** What screen readers hear once the drawing has moved left, after `moved()`. */
  @words
  @property({ attribute: 'moved-left-label' })
  movedLeftLabel = 'Moved left'

  /** What screen readers hear once the drawing has moved right, after `moved()`. */
  @words
  @property({ attribute: 'moved-right-label' })
  movedRightLabel = 'Moved right'

  /** What screen readers hear once the drawing has moved up, after `moved()`. */
  @words
  @property({ attribute: 'moved-up-label' })
  movedUpLabel = 'Moved up'

  /** The notes. A property, never an attribute. */
  @property({ attribute: false })
  nodes: readonly GraphNode[] = []

  /**
   * Leaves the search and the list out of the frame, behind a button among
   * its controls that opens them over the drawing. For a graph shown large,
   * such as at the top of a page, where the drawing takes the whole frame.
   */
  @property({ attribute: 'no-panel', reflect: true, type: Boolean })
  noPanel = false

  /**
   * What each note's row in the list shows in place of its name: a function
   * given the note that returns text, an element or a Lit template.
   *
   * For an icon by its kind, or a date under its name, as React Aria's
   * `ListBoxItem` takes children. The row is still named by the note's name,
   * which typeahead and the search find it by, and described by how it stands
   * to the selected note. Return the name with your content where it should
   * still show. A property only, there being no way to write a function in
   * markup.
   */
  @property({ attribute: false })
  noteContent?: ((node: GraphNode) => unknown) | undefined

  /** The list's name, read by screen readers, and the name of the button that opens it with `no-panel`. */
  @words
  @property({ attribute: 'notes-label' })
  notesLabel = 'Notes'

  /**
   * What a screen reader calls the graph in place of its role, after its
   * name: "Research notes, graph". Said only where the graph has a name of its
   * own, since the fallback name is the same word. Empty leaves the role.
   */
  @words
  @property({ attribute: 'role-label' })
  roleLabel = 'graph'

  /** The search field's name. */
  @words
  @property({ attribute: 'search-label' })
  searchLabel = 'Find a note'

  /** How the selected note is described in the list. */
  @words
  @property({ attribute: 'selected-label' })
  selectedLabel = 'Selected'

  /**
   * What screen readers hear after a reader selects a note, in the list or in
   * the drawing, with `{note}` for its name and `{count}` for how many notes
   * the list then holds, written with `count-label`.
   */
  @words
  @property({ attribute: 'selection-label' })
  selectionLabel = '{note}, selected. {count}'

  /** The hint shown when one finger swipes over the graph with `gestures="cooperative"`. */
  @words
  @property({ attribute: 'two-finger-hint-label' })
  override twoFingerHintLabel = 'Use two fingers to move the graph'

  /**
   * What screen readers hear when a walk along the links moves to a note:
   * `{note}` for its name, `{relation}` for how it stands to the note the
   * step came from, such as "Linked from Roadmap", and `{index}` and `{count}`
   * for its place among that note's links.
   */
  @words
  @property({ attribute: 'walk-label' })
  walkLabel = '{note}. {relation}. {index} of {count}'

  /** The line shown while the graph, with `gestures="activate"`, has the gestures. */
  @words
  @property({ attribute: 'using-label' })
  override usingLabel = 'Using the graph. Press Escape to scroll the page again.'

  /**
   * The hint shown when the wheel scrolls past the graph with
   * `gestures="cooperative"`. `{key}` is ⌘ on a Mac and Ctrl elsewhere.
   */
  @words
  @property({ attribute: 'wheel-hint-label' })
  override wheelHintLabel = 'Use {key} and scroll to zoom the graph'

  /** What screen readers hear once the drawing has zoomed in, after `moved()`. */
  @words
  @property({ attribute: 'zoomed-in-label' })
  zoomedInLabel = 'Zoomed in'

  /** What screen readers hear once the drawing has zoomed out, after `moved()`. */
  @words
  @property({ attribute: 'zoomed-out-label' })
  zoomedOutLabel = 'Zoomed out'

  /** What the search field holds. */
  @state()
  private query = ''

  /** The row the keyboard is on, as an index into the list. */
  @state()
  private cursor = 0

  /** Whether the search and the list are open over the drawing, with `no-panel`. */
  @state()
  private panelOpen = false

  /**
   * Whether the search field's arrow keys have moved onto a note, which the
   * field then names as its `aria-activedescendant` while the focus stays in
   * it. Typing, Left, Right, Escape, and leaving the field let it go.
   */
  @state()
  private fieldKeys = false

  /** Whether the list has the focus, so the drawing marks the note its keys are on. */
  @state()
  private listKeys = false

  /**
   * The notes a walk along the links stepped from, by `id`, the last the one
   * the note the keys are on was reached from. Empty when the keys moved some
   * other way.
   */
  private trail: string[] = []

  /** The note the drawing last heard the keys are on, so it hears each move once. */
  private keyedSent: string | undefined

  /** Which notes link to and from each, read again when `links` changes. */
  private adjacency: Adjacency = new Map()

  /** The notes in the order of their names, read again when `nodes` changes. */
  private sorted: GraphNode[] = []

  /** The list's rows, read again when anything they come from changes. */
  private entries: Entry[] = []

  /** The notes the local graph and the legend keep, or `undefined` where neither leaves any out. */
  private kept: Set<string> | undefined

  /**
   * The groups the notes are in, each with the tone all its notes share
   * where they share one. **In the order of their names**, which is the
   * order `connectGraph` gives them their colors in.
   */
  private groups: GraphGroupEntry[] = []

  /** Whether the graph has been drawn whole, which `drawn()` says. */
  private whole = false

  /** What the live region says now. */
  @state()
  private said = ''

  /**
   * Which way a reader last asked the drawing to go, by a key or a control,
   * until `moved()` says it went: a side, `in` or `out`.
   */
  private asked: string | undefined

  /** Whether the next change of the list's rows is one a reader asked for by the legend, whose count is then said. */
  private countAsked = false

  /**
   * The note a reader last asked to select, in the list or in the drawing,
   * until it is selected: by the frame, or by a page that refused the request
   * and wrote `active` itself.
   */
  private selectionAsked: string | undefined

  /** The legend's button that holds its one tab stop, by place: the one a reader was last on, or the first. */
  @state()
  private legendStop = 0

  /**
   * The arrow keys, Home, End and typed letters among the legend's buttons,
   * so a legend of twelve groups is one tab stop, as the `Legend` family's
   * toolbar is. Only a press that starts on a legend button moves: the frame's
   * own arrows pan the drawing, and the list's walk the notes.
   */
  protected readonly legendKeys = new KeyboardNavigationController(this, {
    items: () =>
      [
        ...(this.renderRoot?.querySelectorAll?.<HTMLButtonElement>('[part~="legend-item"]') ?? []),
      ].map((button) => focusItemOf(button, { words: button.textContent?.trim() ?? '' })),
    origin: 'focus',
    selects: () => false,
    typeahead: typeaheadBy((item) => (item as { words?: string }).words ?? ''),
  })

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
   * @internal The notes the drawing shows, which `connectGraph` reads: those
   * within `depth` of the selected note, or `undefined` for every note.
   */
  get shown(): ReadonlySet<string> | undefined {
    return this.kept
  }

  /**
   * @internal The note the keys are on, while the list or the search field
   * has them, which `connectGraph` marks in the drawing as it marks the note
   * under the pointer. `walked` is true where a walk along the links reached
   * it, which brings it into view.
   */
  get keyed(): { id: string; walked: boolean } | undefined {
    const id = this.keyedId()
    return id === undefined ? undefined : { id, walked: this.trail.length > 0 }
  }

  /** The `id` of the note the keys are on, or `undefined` where neither the list nor the field has them. */
  private keyedId(): string | undefined {
    return this.listKeys || this.fieldKeys ? this.entries[this.cursor]?.node.id : undefined
  }

  /** Whether the graph has been drawn whole. For code that runs after `helix-graph-ready`. */
  get ready(): boolean {
    return this.whole
  }

  /**
   * Says the graph has been drawn whole, or with `false`, that it no longer
   * is. Called by `connectGraph` once its layout has settled; a page drawing
   * its own graph calls it when that graph is finished. The first call after
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

  /**
   * Says where a layout put each note, by its `id`: sends
   * `helix-graph-layout` for the page to keep. Called by `connectGraph` once
   * its layout has settled; a page laying out its own graph calls it the same
   * way.
   */
  laidOut(positions: Record<string, { x: number; y: number; z?: number | undefined }>): void {
    this.dispatchEvent(new HelixGraphLayoutEvent({ positions }))
  }

  /**
   * Shows something passing from one note to another, such as a message, a
   * request or a payment, drawn traveling along the drawing and arriving with
   * a pulse. `tone` says what it means and colors it. Call it as often as
   * things happen; each call is one signal.
   *
   * **Drawn, and never said.** A signal is motion in the drawing, which a
   * screen reader does not hear: where what passed matters to a reader, say it
   * in the page's own words as well.
   */
  signal(from: string, to: string, options: { tone?: GraphSignalDetail['tone'] } = {}): void {
    this.dispatchEvent(new HelixGraphSignalEvent({ from, to, tone: options.tone }))
  }

  /**
   * Says the drawing moved the way a reader asked, by a key or a control:
   * the live region says "Moved right" or "Zoomed in" in the frame's words.
   * Called by `connectGraph` once the renderer has moved; a page answering
   * `helix-graph-pan` and `helix-graph-zoom` itself calls it once its view
   * has moved.
   *
   * **Said once the drawing has moved, and only then.** The frame asks and
   * the renderer moves, so a frame with nothing to answer it says nothing: a
   * move said that never happened is worse than silence.
   */
  moved(): void {
    const asked = this.asked
    this.asked = undefined
    const words: Record<string, string> = {
      down: this.movedDownLabel,
      in: this.zoomedInLabel,
      left: this.movedLeftLabel,
      out: this.zoomedOutLabel,
      right: this.movedRightLabel,
      up: this.movedUpLabel,
    }
    if (asked !== undefined) {
      this.say(words[asked] ?? '')
    }
  }

  /**
   * Puts words in the live region. **The same words twice differ by a space
   * no reader hears**, since a region whose text does not change is not read
   * again, and a second "Moved left" is news as much as the first.
   */
  private say(words: string): void {
    this.said = words !== '' && words === this.said ? `${words}\u00a0` : words
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    /* A graph with no name is read as "Graph", which says nothing of what it
       holds. Development builds only. */
    auditName(
      this,
      () => null,
      'Give it a `label` that says what the notes are, such as "Research notes".',
      () => this.label !== '',
    )
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    this.toggleState('fullscreen', this.filled)
    this.toggleState('idle', this.resting)
    this.toggleState('loading', this.loading)
    this.toggleState('panel-open', this.noPanel && this.panelOpen)
    this.toggleState('searching', this.query.trim() !== '')
    this.toggleState('selected', this.active !== '')
    if (changed.has('links')) {
      this.adjacency = adjacencyOf(this.links)
    }
    if (changed.has('nodes')) {
      this.sorted = sortedOf(this.nodes, wordsLocale(this))
    }
    if (changed.has('nodes')) {
      this.groups = groupsOf(this.nodes)
    }
    if (['nodes', 'links', 'active', 'depth', 'hiddenGroups'].some((name) => changed.has(name))) {
      /* A selection whose note the graph no longer holds keeps nothing out,
         as no selection would: kept to its depth, the list would be empty. */
      const held = this.active !== '' && this.nodes.some((node) => node.id === this.active)
      const local =
        typeof this.depth === 'number' && held
          ? within(this.adjacency, this.active, Math.max(0, this.depth))
          : undefined
      this.kept = withoutGroups(this.nodes, local, this.hiddenGroups)
      this.toggleState('local', local !== undefined)
    }
    if (
      ['nodes', 'links', 'active', 'depth', 'hiddenGroups', 'query'].some((name) =>
        changed.has(name),
      )
    ) {
      const was = this.entries[this.cursor]?.node.id
      this.entries = entriesOf(this.sorted, this.adjacency, this.active, this.query, this.kept)
      this.toggleState('empty', this.entries.length === 0)
      const list = this.partNamed('list')
      if (
        ['active', 'depth', 'hiddenGroups', 'query'].some((name) => changed.has(name)) ||
        !this.hasUpdated
      ) {
        /* A new selection or a narrower list is a list read from its top,
           the selected note first. */
        this.cursor = 0
        this.trail = []
        if (list) {
          list.scrollTop = 0
        }
      } else {
        /* New notes or links keep the reader on the note they were on. */
        this.cursor = cursorAfter(this.entries, was, this.cursor)
        if (list && this.shadowRoot?.activeElement === list) {
          void this.updateComplete.then(() => this.revealCursor())
        }
      }
      /* The count said when a search or the legend changes it, which is when
         a reader who cannot see the list needs to know how much it holds. */
      if ((changed.has('query') && changed.get('query') !== undefined) || this.countAsked) {
        this.countAsked = false
        this.say(this.countText())
      }
      /* **A selection a reader made is said**: the note, and how many notes
         the list then holds, since `depth` narrows it to the local graph. A
         reader selecting in the drawing is away from the list, and one
         pressing the first row kept the same row under the keys, so a screen
         reader heard nothing either way. A selection the page writes is the
         page's to say. */
      if (changed.has('active') && this.active !== '' && this.active === this.selectionAsked) {
        this.selectionAsked = undefined
        const chosen = this.nodes.find((node) => node.id === this.active)
        if (chosen) {
          this.say(
            formatWords(this, 'selectionLabel', { count: this.countText(), note: nameOf(chosen) }),
          )
        }
      }
    }
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    /* After every render, because a change of notes or a search changes how
       many rows there are, and the window is the list's to settle. */
    this.virtualize.measure()
    /* What the renderer has to hear, which `connectGraph` listens for. */
    /* The note the keys are on, which the drawing marks, travels with the
       selection's own news where both changed. */
    const keyed = this.keyedId()
    const rekeyed = keyed !== this.keyedSent
    this.keyedSent = keyed
    if (changed.has('nodes') || changed.has('links')) {
      this.dispatchEvent(new HelixGraphPartChangeEvent({ kind: 'data' }))
    } else if (
      changed.has('active') ||
      changed.has('depth') ||
      changed.has('hiddenGroups') ||
      rekeyed
    ) {
      this.dispatchEvent(new HelixGraphPartChangeEvent({ kind: 'focus' }))
    }
  }

  /** The pan request, and the side it goes to, which `moved()` then says. */
  protected override panEvent(detail: ViewportPanDetail): Event {
    this.asked = this.sideOf(detail.to)
    return new HelixGraphPanEvent(detail)
  }

  /** The zoom request, and which way it goes, which `moved()` then says. */
  protected override zoomEvent(detail: ViewportZoomDetail): Event {
    this.asked = detail.by > 0 ? 'in' : detail.by < 0 ? 'out' : undefined
    return new HelixGraphZoomEvent(detail)
  }

  protected override get restingControls(): string {
    return 'zoom fullscreen'
  }

  /** Which gestures the renderer takes, which `connectGraph` hears from here. */
  protected override gesturesChanged(): void {
    this.dispatchEvent(new HelixGraphPartChangeEvent({ kind: 'gestures' }))
  }

  /** How many notes the list holds, in the page's numbers. */
  private countText(): string {
    return formatWords(this, 'countLabel', { count: this.entries.length })
  }

  /** How a row stands to the selected note, in words, or nothing where it does not. */
  private relationText(entry: Entry): string {
    const selected = this.nodes.find((node) => node.id === this.active)
    const note = selected ? nameOf(selected) : ''
    switch (entry.relation) {
      case 'selected':
        return this.selectedLabel
      case 'to':
        return formatWords(this, 'linkedFromLabel', { note })
      case 'from':
        return formatWords(this, 'linksToLabel', { note })
      case 'both':
        return formatWords(this, 'linkedBothLabel', { note })
      default:
        return ''
    }
  }

  /** Shows a group's notes or hides them, through the request a page can refuse. */
  private toggleGroup(name: string): void {
    const hidden = this.hiddenGroups.includes(name)
      ? this.hiddenGroups.filter((group) => group !== name)
      : [...this.hiddenGroups, name]
    if (this.dispatchEvent(new HelixGraphFilterEvent({ hidden }))) {
      this.hiddenGroups = hidden
      this.countAsked = true
    }
  }

  /**
   * The groups over the drawing, with `legend`, each a button pressed while
   * its notes are shown. **Nothing for one group or none**: a legend of one
   * names what every note is, and turning it off empties the graph.
   */
  private renderLegend(): TemplateResult | typeof nothing {
    if (!this.legend || this.groups.length < 2) {
      return nothing
    }
    const hidden = new Set(this.hiddenGroups)
    const stop = Math.min(this.legendStop, this.groups.length - 1)
    /* **A toolbar**, the role that says the arrows move among its buttons,
       and one tab stop: a group of twelve buttons was twelve stops between
       the controls and the list. */
    return html`<div part="legend" role="toolbar" aria-label=${this.legendLabel}>
      ${this.groups.map(({ name, tone }, index) => {
        const shown = !hidden.has(name)
        return html`<button
          part="legend-item${shown ? '' : ' legend-item-hidden'}"
          type="button"
          tabindex=${index === stop ? '0' : '-1'}
          aria-pressed=${shown ? 'true' : 'false'}
          data-tone=${tone ?? nothing}
          @click=${() => this.toggleGroup(name)}
          @focus=${() => {
            this.legendStop = index
          }}
        >
          <span part="legend-swatch" aria-hidden="true"></span>${name}
        </button>`
      })}
    </div>`
  }

  /** Asks for a note to be selected, and remembers the ask, so the selection is said once it lands. */
  override requestActive(next: string, cause?: string): boolean {
    if (next !== this.active) {
      this.selectionAsked = next
    }
    return super.requestActive(next, cause)
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
   * **The row the keys are on is always drawn**, beside the window where it is
   * outside it, so `aria-activedescendant` names a row that exists. The list
   * then scrolls to it, see `revealCursor`.
   */
  private moveTo(index: number, walking = false): void {
    if (!walking) {
      this.trail = []
    }
    const last = this.entries.length - 1
    this.cursor = Math.min(Math.max(index, 0), Math.max(last, 0))
    void this.updateComplete.then(() => this.revealCursor())
  }

  /**
   * Brings the cursor's row into the list's box.
   *
   * **By the row's own box once it is in the window, and by the window
   * otherwise.** The offset of a row that has not been drawn is a guess at its
   * height, and a guess at 32 pixels was where End and Page Down sent the list
   * when rows were taller: the list landed far from the row, which then was
   * not drawn. So the window is moved toward the row, the rows it draws are
   * measured, and the next try starts from there, a few times at most.
   */
  private revealCursor(attempts = 8): void {
    const list = this.partNamed('list')
    if (!list) {
      return
    }
    const { first, last } = this.virtualize.window
    if (this.cursor >= first && this.cursor < last) {
      const row = this.renderRoot.querySelector?.<HTMLElement>(`[data-index="${this.cursor}"]`)
      if (row) {
        scrollItemIntoView(row, { scroller: list })
      }
      return
    }
    if (attempts === 0) {
      return
    }
    this.virtualize.reveal(this.cursor)
    this.virtualize.measure()
    void this.updateComplete.then(() => this.revealCursor(attempts - 1))
  }

  /** The cursor's row, where it is outside the window and drawn beside it. */
  private get keptRow(): number | undefined {
    const { first, last } = this.virtualize.window
    const cursor = this.cursor
    return this.entries.length > 0 && (cursor < first || cursor >= last) ? cursor : undefined
  }

  /**
   * The keys in the list. **Kept from the frame**, whose arrows pan the
   * drawing: a reader moving through the list was moving the graph under it.
   */
  private readonly handleListKeydown = (event: KeyboardEvent): void => {
    if (this.walk(event)) {
      return
    }
    const moves: Record<string, number> = {
      ArrowDown: this.cursor + 1,
      ArrowUp: this.cursor - 1,
      End: this.entries.length - 1,
      Home: 0,
      PageDown: this.cursor + this.pageRows(),
      PageUp: this.cursor - this.pageRows(),
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
      return
    }
    if (event.key.length === 1 && !event.altKey && !event.ctrlKey && !event.metaKey) {
      event.preventDefault()
      event.stopPropagation()
      this.typeahead(event.key)
    }
  }

  /** What has been typed toward a note's name. */
  private readonly typed = new Typeahead()

  /**
   * Moves to the next note whose name starts with what was typed, through
   * core's `Typeahead`, as a listbox does: letters within half a second run
   * together, and a repeated letter steps through the names that start with it.
   */
  private typeahead(letter: string): void {
    const at = this.typed.match(
      letter,
      this.entries.map((entry) => nameOf(entry.node)),
      this.cursor,
    )
    if (at >= 0) {
      this.moveTo(at)
    }
  }

  /**
   * The rows of the notes `id` links to or is linked from, in the list's
   * order, which is the order of their names. Only the notes the list holds:
   * a search, the legend, or `depth` leaves the others out.
   */
  private linkedRows(id: string): number[] {
    const near = this.adjacency.get(id)
    if (!near) {
      return []
    }
    const rows: number[] = []
    for (const [index, entry] of this.entries.entries()) {
      const other = entry.node.id
      if (other !== id && (near.to.has(other) || near.from.has(other))) {
        rows.push(index)
      }
    }
    return rows
  }

  /** How the note `id` stands to the note `from`, in the words the list uses for the selection. */
  private relationFrom(from: string, id: string): string {
    const near = this.adjacency.get(from)
    const origin = this.nodes.find((node) => node.id === from)
    const note = origin ? nameOf(origin) : from
    const to = near?.to.has(id) === true
    const back = near?.from.has(id) === true
    return formatWords(
      this,
      to && back ? 'linkedBothLabel' : to ? 'linkedFromLabel' : 'linksToLabel',
      { note },
    )
  }

  /**
   * A walk along the links from the note the keys are on, with Alt and the
   * arrow keys, so a reader follows the lines of the drawing and not only
   * the order of the list. **The same four keys a tree takes**, with Alt,
   * since the list's own arrows already move through it:
   *
   * - Alt+Right follows a link, to the first note the one the keys are on
   *   links to or from.
   * - Alt+Down and Alt+Up move to the next and the previous note linked to
   *   the one the step came from, wrapping.
   * - Alt+Left goes back along the links walked.
   *
   * Right and Left swap on a right-to-left page. Each step says the note, how
   * it stands to the note it was reached from, and its place among that
   * note's links. Returns whether the key was one of the walk's.
   */
  private walk(event: KeyboardEvent): boolean {
    if (!event.altKey || event.ctrlKey || event.metaKey || this.entries.length === 0) {
      return false
    }
    const flip = isRtl(this)
    const key =
      event.key === 'ArrowRight'
        ? flip
          ? 'back'
          : 'follow'
        : event.key === 'ArrowLeft'
          ? flip
            ? 'follow'
            : 'back'
          : event.key === 'ArrowDown'
            ? 'next'
            : event.key === 'ArrowUp'
              ? 'previous'
              : undefined
    if (key === undefined) {
      return false
    }
    event.preventDefault()
    event.stopPropagation()
    const here = this.entries[this.cursor]?.node.id
    if (here === undefined) {
      return true
    }
    if (key === 'back') {
      const back = this.trail.pop()
      const row =
        back === undefined ? -1 : this.entries.findIndex((entry) => entry.node.id === back)
      const at = row >= 0 ? row : this.cursor
      this.moveTo(at, true)
      this.sayLinks(at)
      return true
    }
    /* Follow, or the first press of Down or Up, steps from the note the keys
       are on; Down and Up after a step move among the links of the note it
       came from. */
    const from = key === 'follow' || this.trail.length === 0 ? here : (this.trail.at(-1) as string)
    const rows = this.linkedRows(from)
    if (rows.length === 0) {
      this.sayLinks(this.cursor)
      return true
    }
    let place: number
    if (from === here) {
      place = key === 'previous' ? rows.length - 1 : 0
      this.trail.push(here)
    } else {
      const now = rows.indexOf(this.cursor)
      const by = key === 'previous' ? -1 : 1
      place = now < 0 ? 0 : (now + by + rows.length) % rows.length
    }
    const at = rows[place] as number
    this.moveTo(at, true)
    const entry = this.entries[at] as Entry
    this.say(
      formatWords(this, 'walkLabel', {
        count: rows.length,
        index: place + 1,
        note: nameOf(entry.node),
        relation: this.relationFrom(from, entry.node.id),
      }),
    )
    return true
  }

  /** Says the note at row `at` and how many notes in the list it links to or from. */
  private sayLinks(at: number): void {
    const entry = this.entries[at]
    if (entry) {
      this.say(
        formatWords(this, 'linkCountLabel', {
          count: this.linkedRows(entry.node.id).length,
          note: nameOf(entry.node),
        }),
      )
    }
  }

  /**
   * How many rows Page Down and Page Up move: the rows that fit in the list's
   * box, or in the window where the list does not scroll, less one, so the
   * row at one edge lands at the other.
   */
  private pageRows(): number {
    const room = scrollRoom(this.partNamed('list'))
    const tall = this.virtualize.sizeOf(this.cursor) || 32
    return Math.max(1, Math.floor(room / tall) - 1)
  }

  /**
   * The search field's keys, which belong to the field and never pan the
   * graph.
   *
   * **The field is a combobox over the list**, as React Aria's Autocomplete
   * and the APG combobox are: the focus stays in the field, and Down and Up
   * move the keys through the notes, which the field names as its
   * `aria-activedescendant`. Down starts on the note the keys were last on,
   * the first after a search, and Up on the last. Page Down and Page Up move
   * a page, Enter selects, Alt and the arrows walk the links as in the list,
   * and Left, Right, Home and End go back to the text.
   *
   * Escape lets the note go, then empties a search that has words in it, and
   * passes through an empty one to whatever the page does with it.
   */
  private readonly handleSearchKeydown = (event: KeyboardEvent): void => {
    if (event.isComposing) {
      return
    }
    if (this.fieldKeys && this.walk(event)) {
      return
    }
    const last = this.entries.length - 1
    const moves: Record<string, number> = this.fieldKeys
      ? {
          ArrowDown: this.cursor + 1,
          ArrowUp: this.cursor - 1,
          PageDown: this.cursor + this.pageRows(),
          PageUp: this.cursor - this.pageRows(),
        }
      : { ArrowDown: this.cursor, ArrowUp: last }
    if (event.key in moves && !event.altKey && last >= 0) {
      event.preventDefault()
      this.fieldKeys = true
      this.moveTo(moves[event.key] as number)
    } else if (event.key === 'Enter' && this.fieldKeys) {
      event.preventDefault()
      this.choose(this.cursor)
    } else if (event.key === 'Escape') {
      if (this.fieldKeys) {
        event.preventDefault()
        this.fieldKeys = false
      } else if (this.query === '') {
        return
      } else {
        event.preventDefault()
        this.query = ''
      }
    } else if (['ArrowLeft', 'ArrowRight', 'End', 'Home'].includes(event.key)) {
      this.fieldKeys = false
    }
    event.stopPropagation()
  }

  /** Leaving the field lets go of the note its keys were on. */
  private readonly handleSearchBlur = (): void => {
    this.fieldKeys = false
  }

  /**
   * Opens the search and the list over the drawing, or closes them, with
   * `no-panel`. **Opened, the search field takes the focus**, since finding
   * a note is what the button is pressed for; closed from inside, the focus
   * goes back to the button, where it was.
   */
  private togglePanel(open = !this.panelOpen): void {
    const inside =
      this.panelOpen && this.partNamed('panel')?.contains(this.shadowRoot?.activeElement ?? null)
    this.panelOpen = open
    void this.updateComplete.then(() => {
      if (open) {
        ;(this.partNamed('search-field') as HTMLElement | null)?.focus()
      } else if (inside) {
        ;(this.partNamed('notes-toggle') as HTMLElement | null)?.focus()
      }
    })
  }

  /** Escape in the panel closes it, with `no-panel`, once the search it holds is empty. */
  private readonly handlePanelKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && this.noPanel && this.panelOpen) {
      event.preventDefault()
      event.stopPropagation()
      this.togglePanel(false)
    }
  }

  /**
   * The button that opens the search and the list over the drawing, among
   * the controls after zoom, where the frame leaves them out with `no-panel`.
   */
  protected override renderMoreControls(): TemplateResult | typeof nothing {
    if (!this.noPanel) {
      return nothing
    }
    return html`<button
      part="notes-toggle"
      aria-controls="panel"
      aria-expanded=${this.panelOpen ? 'true' : 'false'}
      aria-label=${this.notesLabel}
      type="button"
      @click=${() => this.togglePanel()}
    >
      <svg aria-hidden="true" fill="currentColor" viewBox=${list.viewBox}>
        ${unsafeSVG(list.content)}
      </svg>
    </button>`
  }

  /** Typing is a new search, read from its top, with no note under the keys until Down. */
  private readonly handleSearch = (event: Event): void => {
    this.query = (event.target as HTMLInputElement).value
    this.fieldKeys = false
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

  private renderRows(): TemplateResult {
    const { first, last } = this.virtualize.window
    const total = this.entries.length
    const indices = Array.from(
      { length: Math.max(0, Math.min(last, total) - first) },
      (_, at) => first + at,
    )
    const kept = this.keptRow
    if (kept !== undefined && kept < total) {
      if (kept < first) {
        indices.unshift(kept)
      } else {
        indices.push(kept)
      }
    }
    /* **Keyed by the row's place in the list.** Drawn by position, a window
       that moved one row reused every element and wrote the next row into it,
       so the browser's scroll anchoring held the reused element still and
       moved the offset a row further, which moved the window again: the
       offset ran on a row per pass until the controller gave up. Keyed, the
       row leaving is removed and the spacer takes its room, so nothing
       under the reader moves. */
    return html`${repeat(
      indices,
      (index) => index,
      (index) => {
        const entry = this.entries[index] as Entry
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
        aria-describedby=${relation ? `note-${index}-relation` : nothing}
        aria-label=${this.noteContent ? nameOf(entry.node) : nothing}
        @click=${() => {
          this.cursor = index
          this.choose(index)
        }}
      >
        <span part="note-name">${this.noteContent ? this.noteContent(entry.node) : nameOf(entry.node)}</span>
        ${relation ? html`<span part="note-relation" id=${`note-${index}-relation`} aria-hidden="true">${relation}</span>` : nothing}
      </div>`
      },
    )}`
  }

  protected override render(): TemplateResult {
    const window = this.virtualize.window
    /* The cursor's row, drawn beside the window, takes its room out of the
       spacer on its side so the rows in the window stay where they were. */
    const kept = this.keptRow
    const room = kept === undefined ? 0 : this.virtualize.sizeOf(kept)
    const before = Math.max(
      0,
      window.before - (kept !== undefined && kept < window.first ? room : 0),
    )
    const after = Math.max(0, window.after - (kept !== undefined && kept >= window.last ? room : 0))
    const cursor = this.entries.length > 0 ? `note-${this.cursor}` : nothing
    return html`<div
      part="region"
      role="group"
      aria-label=${this.label || this.getAttribute?.('aria-label') || this.fallbackLabel}
      aria-roledescription=${(this.label || this.getAttribute?.('aria-label')) && this.roleLabel ? this.roleLabel : nothing}
      aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight Plus Minus"
      tabindex="0"
      @focusin=${this.idle.stir}
      @keydown=${this.handleKeydown}
      @pointerleave=${this.handlePointerLeave}
      @pointermove=${this.idle.stir}
    >
      <div part="header">
        <slot name="header"></slot>
      </div>
      <div part="body">
        <div part="stage">
          <div part="viewport">
            <slot></slot>
            ${this.renderGestures()}
          </div>
          ${this.renderControls()} ${this.renderLegend()}
        </div>
        <div
          part="panel"
          id="panel"
          ?hidden=${this.noPanel && !this.panelOpen}
          @keydown=${this.handlePanelKeydown}
        >
          <div part="search">
            <span part="filter-icon" aria-hidden="true">${this.renderFilterIcon()}</span>
            <input
              part="search-field"
              type="text"
              role="combobox"
              autocomplete="off"
              spellcheck="false"
              aria-label=${this.searchLabel}
              aria-autocomplete="list"
              aria-controls="note-list"
              aria-expanded=${this.entries.length > 0 ? 'true' : 'false'}
              aria-activedescendant=${this.fieldKeys ? cursor : nothing}
              placeholder=${this.searchLabel}
              .value=${this.query}
              @blur=${this.handleSearchBlur}
              @input=${this.handleSearch}
              @keydown=${this.handleSearchKeydown}
            />
            <span part="count" aria-hidden="true">${this.countText()}</span>
          </div>
          <div
            part="list"
            id="note-list"
            role="listbox"
            tabindex="0"
            data-scroller
            aria-label=${this.notesLabel}
            aria-activedescendant=${cursor}
            aria-busy=${this.loading ? 'true' : nothing}
            aria-keyshortcuts="Alt+ArrowRight Alt+ArrowLeft Alt+ArrowDown Alt+ArrowUp"
            @blur=${() => {
              this.listKeys = false
            }}
            @focus=${() => {
              this.listKeys = true
            }}
            @keydown=${this.handleListKeydown}
            @scroll=${() => this.virtualize.measure()}
          >
            <div part="before" role="presentation" style="block-size: ${before}px"></div>
            ${this.renderRows()}
            <div part="after" role="presentation" style="block-size: ${after}px"></div>
          </div>
          ${
            /* Beside the list and never in it: a listbox holds options, and
               words in one would be read as a note. The live region already
               says the count, so this is for the eye. */
            this.entries.length === 0
              ? this.loading
                ? html`<div part="loading"><slot name="loading">${this.loadingLabel}</slot></div>`
                : html`<div part="empty"><slot name="empty">${this.emptyLabel}</slot></div>`
              : nothing
          }
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

import {
  auditChildren,
  customElement,
  type DataOptionItem,
  drawStatus,
  type HelixBeforeChangeEvent,
  HelixElement,
  HelixSelectEvent,
  MixinControllerOpen,
  matchesChord,
  StatusController,
  words,
} from '@fusion.dev/helix-core'
import { nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { html } from 'lit/static-html.js'
import type { HelixHeadlessListbox } from '../../listbox/root/listbox-root.js'
import { optionsAmong } from '../../option/among.js'
/* Relative, so this registers the base pair and the styled file's identical
   imports register the styled pair. `tier` picks which the template asks for. */
import '../../dialog/index.js'
import '../../listbox/index.js'

/** Whether an element is in a custom state, where the engine can say. */
const says = (element: Element | null, state: string): boolean => {
  try {
    return element?.matches(`:state(${state})`) ?? false
  } catch {
    return false
  }
}

/**
 * @summary A command palette: a list of commands that opens from anywhere on the page and filters as you type.
 *
 * @description
 * The list is a `Listbox`, which handles filtering, the empty state, the match
 * highlight, `aria-activedescendant`, scrolling an option into view, and moving
 * between options with the keyboard. The palette adds a dialog and a hotkey
 * that opens it.
 *
 * The palette keeps no value. It is not a form control and submits nothing.
 * Choosing an option dispatches `helix-select` once. To remember the last
 * command, store it yourself. An option with `href` is a link to a page, which
 * the browser follows once the palette has closed.
 *
 * The hotkey listener is on the document, so the hotkey works from anywhere on
 * the page, including inside another control's text field, whether or not the
 * palette is open. `mod` means Command on a Mac and Control elsewhere, so you
 * write one binding.
 *
 * With `inline`, the palette is drawn in the page with no dialog, as a search
 * over a list that is always shown.
 *
 * **Pages.** A command can open a page of commands of its own, as a palette
 * offers "Change theme" and then the themes. Give the option `opens` with a
 * name, and slot the page's commands as `page:` and that name:
 *
 * ```html
 * <helix-command>
 *   <helix-option value="theme" opens="theme">Change theme</helix-option>
 *   <helix-option value="dark" slot="page:theme">Dark</helix-option>
 *   <helix-option value="light" slot="page:theme">Light</helix-option>
 * </helix-command>
 * ```
 *
 * Choosing the opener says `helix-select` with its value, and canceling it
 * keeps the page that is shown. The list then shows the page, named by the
 * opener's words, and a screen reader hears those words. Backspace in an empty
 * filter goes back, and a screen reader hears the name of the page it goes
 * back to. `page` says which page is shown.
 *
 * The filter is cleared when the palette closes, so each opening starts from
 * the full list. Combobox and Select do the same. As typing narrows the list, a
 * screen reader hears how many commands are left, such as "3 commands".
 *
 * **Keyboard.** Focus goes to the filter field as the palette opens, with no
 * command highlighted, as in React Aria's Autocomplete, so Enter runs nothing
 * until you type or press Down. Typing highlights the first command left, and
 * the highlight moves through the commands while you type.
 *
 * | Key | What it does |
 * |---|---|
 * | `hotkey`, Command or Control with K by default | Opens the palette from anywhere on the page, or closes it. With `inline`, puts focus in its filter field. |
 * | Down, Up | Moves the highlight to the next or the previous command, round from the last to the first. |
 * | Page Down, Page Up | Moves the highlight by as many commands as the list shows at once. |
 * | Home, End | Move the caret in the filter field. With `home-end="list"`, move the highlight to the first or the last command. |
 * | Left, Right | Move the caret in the filter field. |
 * | Enter | Runs the highlighted command, or follows it where it is a link, and closes the palette. On a command with `opens`, shows its page. |
 * | Command or Control with Enter | Takes the highlighted command's `alternate` destination, where it has one. |
 * | Backspace | In an empty filter on a page, goes back to the page before. |
 * | Escape | Clears the filter. With the filter empty, closes the palette and puts focus back where it was. |
 * | Tab | Stays in the palette, which is modal. With `inline`, moves on through the page. |
 *
 * **ARIA.** The palette is a modal `dialog` named by `label`, or with
 * `inline` no dialog at all. Inside it the filter field is a text field with
 * `aria-autocomplete="list"`, `aria-controls` on the list, and
 * `aria-activedescendant` on the highlighted command, as the field of React
 * Aria's `Autocomplete` is. The commands are a `listbox` of `option`s. How many commands typing left, the empty text and
 * the loading text are said in a polite live region.
 *
 * **The commands are an import of their own.** A command is an option, the
 * Option family's, which the palette does not register, so a page that writes
 * one imports it beside the palette:
 *
 * ```js
 * import '@fusion.dev/helix/command'
 * import '@fusion.dev/helix/option'
 * ```
 *
 * In development, a palette holding an option nobody registered says so once
 * the page has loaded, with the line to add.
 *
 * @since 0.1.0
 * @status stable
 * @category navigation
 * @aliases Command palette, Quick open, Spotlight
 * @documentation https://fusion.dev/helix/components/command
 *
 * @slot - The commands, and any groups of them.
 * @slot empty - What the palette shows when typing matches no commands, for content richer than `empty-text`.
 * @slot error - What the palette shows while `load-error` is set, for content richer than its text.
 * @slot filter-icon - Replaces the magnifying glass in the filter field.
 * @slot footer - Content under the list, such as the keys that work in the palette.
 * @slot header - Content above the filter field, such as a title or the scope being searched. A heading here does not rename the palette, which `label` names.
 * @slot loading - What the palette shows while the commands load, for content richer than `loading-text`.
 * @slot no-results - What the palette shows when typing matches no commands, for content richer than `no-results-text`.
 *
 * @event {HelixBeforeCloseEvent} helix-before-close - The palette is about to close. Cancelable: cancel it to keep it open.
 * @event {HelixBeforeOpenEvent} helix-before-open - The palette is about to open. Cancelable: cancel it to keep it closed.
 * @event {HelixFilterEvent} helix-filter - Fired as the user types, with the text the list is filtered by. Cancelable: cancel it to leave the list unfiltered and filter the commands yourself, for example on a server while `loading` is set.
 * @event {HelixLoadMoreEvent} helix-load-more - Fired once the list is scrolled within a screen of its end, once for each number of commands, and not while `loading` is set. Add the next page and set `loading` while you fetch it.
 * @event {HelixSelectEvent} helix-select - A command was chosen, with its `href` where the option is a link. Cancelable: cancel it to keep the palette open, and to keep the browser from following the link.
 * @event {ToggleEvent} toggle - The palette opened or closed. The event carries `newState` and `oldState`.
 *
 * @csspart dialog - The box of the dialog the palette opens in, forwarded from `Dialog`.
 * @csspart dialog-body - The dialog's slot for its content, which holds the list. It draws no box until you give it one.
 * @csspart dialog-dismiss - The dialog's close control, drawn when the dialog is `dismissible`.
 * @csspart dialog-dismiss-mark - The glyph on the dialog's close control, where none is slotted.
 * @csspart dialog-footer - The dialog's slot for its actions, which holds the `footer` row. It draws no box until you give it one.
 * @csspart dialog-header - The dialog's slot for its title. It draws no box until you give it one.
 * @csspart footer - The row under the list.
 * @csspart listbox - The listbox inside the palette.
 * @csspart listbox-empty - The text shown when the filter matches no commands.
 * @csspart listbox-error - The text shown while `load-error` is set.
 * @csspart listbox-feedback - The listbox's error message.
 * @csspart listbox-filter-icon - The icon beside the filter field.
 * @csspart listbox-filter-mark - The default icon beside the filter field, drawn when no icon is slotted.
 * @csspart listbox-hint - Help text under the list.
 * @csspart listbox-items - The list of commands.
 * @csspart listbox-label - The label above the list.
 * @csspart listbox-live - The listbox's `live` part, a live region that holds the empty and loading text, and how many commands typing left, for screen readers.
 * @csspart listbox-loading - The text shown while the commands are loading.
 * @csspart listbox-search - The region that holds the filter field.
 * @csspart listbox-search-field - The filter field.
 * @csspart live - The region a screen reader announces the page shown from, by the words of the command that opens it, drawn once there is one to say. Visually hidden in the styled tier.
 *
 * @cssstate empty - The list shows no commands: there are none, or typing hid every one.
 * @cssstate error - While `load-error` is set.
 * @cssstate loading - While `loading` is set.
 * @cssstate no-results - Typing hid every one of the commands, where there are some.
 * @cssstate open - While the palette is open.
 */
@customElement('helix-headless-command')
export class HelixHeadlessCommand extends MixinControllerOpen(HelixElement) {
  /**
   * The key this family's words are registered under, its styled tag:
   * `registerWords('de', { 'helix-command': { placeholder: 'Befehle suchen' } })`.
   */
  static words = 'helix-command'

  /**
   * The text shown when the filter matches no commands.
   */
  @words
  @property({ attribute: 'empty-text' })
  emptyText = 'No commands'

  /**
   * How long typing rests before the commands are filtered, in milliseconds,
   * so a palette filtered on a server sends one `helix-filter` for a word.
   * `0` filters on every keystroke. See Listbox's `filter-delay`.
   */
  @property({ attribute: 'filter-delay', type: Number })
  filterDelay = 0

  /**
   * Whether a command is kept by the filter: a function given the command's
   * words and the filter, trimmed, that returns `true` to keep it showing, as
   * React Aria's `Autocomplete` takes `filter`. See Listbox's `filterMatch`.
   *
   * Absent, a command is kept where its words hold the filter, in any case. A
   * property only, there being no way to write a function in markup.
   */
  @property({ attribute: false })
  filterMatch?: ((text: string, filter: string) => boolean) | undefined

  /**
   * Where Home and End go from the filter field.
   *
   * Absent, they move the caret, as APG's combobox has them. `list` moves the
   * highlight to the first or the last command, as React Aria's Autocomplete
   * does, and Shift with either still selects the text.
   */
  @property({ attribute: 'home-end' })
  homeEnd?: 'list'

  /**
   * The key that opens the palette, written as `mod+k`, `shift+p`, or `k`,
   * in Kbd's chord spelling: `mod` is Command or Control, `ctrl`, `cmd`,
   * `alt` and `shift` the keys they name.
   *
   * Empty turns it off, for a consumer who opens the palette from a button or
   * from their own shortcut handler. There is no list of defaults to fight
   * with: one key, said once.
   */
  @property()
  hotkey = 'mod+k'

  /**
   * Draws the palette in the page, where it stands, with no dialog: a search
   * over a list of commands, as React Aria's Autocomplete is drawn.
   *
   * The list is always shown, and `hotkey` puts focus in its filter field.
   * Choosing a command says `helix-select` and leaves the list where it is,
   * and `open`, `toggle` and the dialog's parts do nothing.
   */
  @property({ reflect: true, type: Boolean })
  inline = false

  /**
   * The commands as data, for a palette too long to draw whole: each a value,
   * which is also its words, or a record with a `value`, a `label` and
   * `disabled`. Handed to the list, which draws only the commands in sight and
   * reads no children while it is set. See Listbox's `items`.
   *
   * Choosing one says `helix-select` with its value, as a child option does.
   * A command that is a link, or that has an `alternate`, is an option you
   * write as a child.
   */
  @property({ attribute: false })
  items: readonly DataOptionItem[] | undefined = undefined

  /**
   * Accessible name for the overlay, which has no visible heading.
   */
  @words
  @property()
  label = 'Commands'

  /**
   * How the commands are laid out, as Listbox's `layout`: `grid` draws them in
   * rows and columns, for a palette of icons or emoji, and the arrow keys
   * follow the rows and the columns. Absent is one command under another.
   */
  @property({ reflect: true })
  layout?: 'grid' | 'stack'

  /**
   * What the list says when its commands could not be loaded, such as after a
   * request to a server fails. Empty, null or no attribute is no error, so
   * removing the attribute clears it. Passed to the list, which shows it
   * under any commands there are and tells screen readers.
   */
  @property({ attribute: 'load-error' })
  loadError: string | null = ''

  /**
   * Whether the commands are still loading, for a palette that asks a server
   * for them as the user types.
   *
   * Passed to the list, which shows `loading-text` and tells screen readers.
   */
  @property({ reflect: true, type: Boolean })
  loading = false

  /**
   * The text shown while the commands load.
   */
  @words
  @property({ attribute: 'loading-text' })
  loadingText = 'Loading'

  /**
   * The text shown when typing hides every one of the commands, where there are
   * some. Absent, `empty-text` shows. See Listbox's `no-results-text`.
   */
  @property({ attribute: 'no-results-text' })
  noResultsText?: string

  /**
   * The page of commands shown, by name: empty for the commands you write
   * with no `slot`, or a name for the commands slotted as `page:` and the
   * name, such as `slot="page:theme"`.
   *
   * An option with `opens` set to a name goes to that page when it is chosen,
   * in place of running, and Backspace in an empty filter goes back to the
   * page before. Closing the palette goes back to the first page. Set it to
   * open the palette on a page of your choosing.
   */
  @property()
  page = ''

  /** The pages gone through to reach this one, which Backspace walks back. */
  private trail: string[] = []

  /**
   * The text shown in the filter field before anything is typed.
   */
  @words
  @property()
  placeholder = 'Search commands'

  /**
   * What a screen reader hears when typing leaves one command, where
   * `results-label` should not say it. `{count}` is the count.
   *
   * @deprecated Write every form in `results-label`, as `{count, plural, one
   * {# command} other {# commands}}`. Removed in the next major version.
   */
  @property({ attribute: 'result-label' })
  resultLabel?: string

  /**
   * What a screen reader hears when typing narrows the commands. `{count}` is
   * how many are left, written in the locale, and each language writes the
   * forms it has: `{count, plural, one {# polecenie} few {# polecenia} many
   * {# poleceń} other {# polecenia}}`.
   */
  @words
  @property({ attribute: 'results-label' })
  resultsLabel = '{count, plural, one {# command} other {# commands}}'

  /**
   * Whether the consumer put anything under the list.
   *
   * Asked of the slot rather than of CSS. A wrapper holding a slot always has a
   * child element, which is the slot, so `:not(:has(*))` on it is never true
   * and an empty footer would draw its rule and its padding over nothing. Steps
   * was caught by the same thing.
   *
   * Read from the children before each render, and heard from the slot when
   * they change. The slot alone left the first render without its footer and a
   * second to follow, and a hydrated palette without one for good: a
   * declarative shadow root reports its slots before anything listens.
   */
  @state()
  private footed = false

  private get listbox(): HelixHeadlessListbox | null {
    return this.partNamed<HelixHeadlessListbox>('listbox')
  }

  /**
   * Answers the hotkey from wherever the reader is.
   *
   * On the document rather than on this element, which is never the thing with
   * focus: a palette that only answered when it already had focus would be a
   * palette nobody could open.
   *
   * `preventDefault` because every key worth using is already the browser's.
   * Command-K focuses the address bar in some browsers and opens a search in
   * others, and a palette that opened underneath one of those would be a
   * palette the reader never sees.
   */
  private readonly handleHotkey = (event: KeyboardEvent): void => {
    /* Core's chord, read both ways, so `mod` is Command or Control on any
       keyboard: a palette summoned by the habit of either platform. */
    if (!matchesChord(event, this.hotkey, true) && !matchesChord(event, this.hotkey, false)) {
      return
    }
    event.preventDefault()
    if (this.inline) {
      this.searchField?.focus()
      return
    }
    this.requestOpen(!this.open)
  }

  /** The list's filter field, where a reader types. */
  private get searchField(): HTMLInputElement | null {
    return (
      this.listbox?.renderRoot?.querySelector<HTMLInputElement>('[part="search-field"]') ?? null
    )
  }

  /**
   * Takes what the list announced and says it under this element's name.
   *
   * The listbox says `helix-before-change`, which is the right word for a control that
   * holds a value and the wrong one for a palette: nothing here changed, a
   * command ran. It is stopped and re-announced rather than relayed, so a
   * consumer hears one event naming the element they put on the page.
   *
   * **And refused, so the list keeps no answer.** A listbox holding what was
   * chosen hears the same row chosen again as no change and says nothing, so
   * the command a reader ran last, which on a site is the page they are on,
   * could not be run again: Enter did nothing and the palette stayed open.
   */
  private readonly handleChange = (event: Event): void => {
    event.stopPropagation()
    event.preventDefault()
    const { value } = (event as HelixBeforeChangeEvent).detail
    if (!this.dispatchEvent(new HelixSelectEvent({ value }))) {
      return
    }
    /* A command that opens a page goes there, and the palette stays open. */
    const opens = (this.listbox?.options ?? []).find((option) => option.value === value)?.opens
    if (opens) {
      this.goTo([...this.trail, this.page], opens)
      return
    }
    this.requestOpen(false)
  }

  /**
   * Shows a page of commands, with the trail that leads back from it. The
   * filter starts empty, as it does on opening, and the field keeps focus.
   */
  private goTo(trail: string[], page: string): void {
    this.trail = trail
    this.page = page
    this.listbox?.requestFilter('')
    void this.updateComplete.then(() => {
      this.searchField?.focus()
      /* The list is renamed for the page, and a name that changes is not
         announced, so the page is said by its name. */
      if (this.listName !== '') {
        this.status.say(this.listName)
      }
    })
  }

  /** The region the page shown is said from as it changes. */
  private readonly status = new StatusController(this)

  /** Backspace in an empty filter, on a page, goes back to the page before. */
  private readonly handleBack = (event: KeyboardEvent): void => {
    if (
      event.key !== 'Backspace' ||
      this.page === '' ||
      event.composedPath()[0] !== this.searchField ||
      this.searchField?.value !== ''
    ) {
      return
    }
    event.preventDefault()
    const trail = [...this.trail]
    this.goTo(trail, trail.pop() ?? '')
  }

  /**
   * The list's name: the palette's, or on a page, the words of the command
   * that opens it.
   */
  private get listName(): string {
    if (this.page === '') {
      return this.label
    }
    const opener = optionsAmong(this.knownChildren).find((option) => option.opens === this.page)
    return opener?.text || this.label
  }

  /**
   * The row under the keyboard, read from the `active` property the listbox
   * writes on each option.
   *
   * Off the options rather than a reference the listbox hands over, because
   * they are this element's own light DOM children and already say it.
   */
  private get activeOption(): (Element & { alternate?: string; value?: string }) | null {
    return (
      this.listbox?.options.find((option) => option.active && !option.hidden) ??
      this.querySelector('[data-active]')
    )
  }

  /**
   * Takes the row's second destination, where the reader asked for it.
   *
   * **Command intercepts rather than Listbox reporting, and that is the whole
   * design.** Enter belongs to the listbox: it owns the active row, it decides
   * what choosing means, and it announces `helix-before-change`. Teaching it about a
   * modifier would put a palette's idea of a second destination inside a
   * control that is also a select and a combobox, neither of which has one.
   *
   * So this listens in the capture phase, before the listbox sees the key, and
   * only for the one combination that means something here. Anything else falls
   * straight through and the listbox behaves exactly as it always did.
   *
   * `mod` is Command on a Mac and Control elsewhere, which is what `hotkey`
   * already means by it two methods up.
   *
   * The pointer takes the same path for the same reason: a modifier-click on a
   * row is the same intent as a modifier-Enter on it, and both have to be
   * stopped before the row announces its ordinary selection.
   */
  private readonly handleAlternate = (event: KeyboardEvent | MouseEvent): void => {
    if (!(event.metaKey || event.ctrlKey) || !(this.open || this.inline)) {
      return
    }
    if (event instanceof KeyboardEvent && event.key !== 'Enter') {
      return
    }
    const row =
      event instanceof KeyboardEvent
        ? this.activeOption
        : (event.target as Element | null)?.closest?.(
            '[data-active], helix-option, helix-headless-option',
          )
    const alternate = (row as { alternate?: string } | null)?.alternate
    if (row === null || row === undefined || !alternate) {
      return
    }
    event.preventDefault()
    event.stopImmediatePropagation()
    if (this.dispatchEvent(new HelixSelectEvent({ alternate: true, value: alternate }))) {
      this.requestOpen(false)
    }
  }

  /*
   * Keeps an option's own announcement inside the palette.
   *
   * Every option says `helix-select` when it is chosen, which is how the list
   * hears it, and the options are light DOM children of this element, so it
   * carries straight on out to the consumer: two selections for one command
   * under one event name, told apart only by the target. The one this element
   * dispatches has itself as the target and is let past.
   *
   * `stopImmediatePropagation`, not `stopPropagation`. The consumer's listener
   * is on this same element, and stopping propagation only keeps an event off
   * the *next* node, so every other listener already bound here still runs. The
   * listbox hears it well before this, from inside the shadow root, so nothing
   * this element needs is lost by ending it here.
   */
  private readonly swallowOptionSelect = (event: Event): void => {
    if (event.target === this) {
      return
    }
    event.stopImmediatePropagation()
    /* A row that is a link is said under this element's name with its `href`,
       and the palette closes as it does for any command. Canceled, the palette
       stays open and the row does not follow its link, so a client-side router
       takes it. */
    const { href, value } = (event as HelixSelectEvent).detail
    if (href === undefined) {
      return
    }
    if (!this.dispatchEvent(new HelixSelectEvent({ href, value }))) {
      event.preventDefault()
      return
    }
    this.requestOpen(false)
  }

  override connectedCallback(): void {
    super.connectedCallback()
    auditChildren(this, 'option', 'option', 'the palette lists no commands')
    this.addEventListener('helix-select', this.swallowOptionSelect)
    /* Capture, so both reach this before the listbox and the row do. */
    this.addEventListener('keydown', this.handleAlternate, { capture: true })
    this.addEventListener('keydown', this.handleBack)
    this.addEventListener('click', this.handleAlternate, { capture: true })
    document.addEventListener('keydown', this.handleHotkey)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('helix-select', this.swallowOptionSelect)
    this.removeEventListener('keydown', this.handleAlternate, { capture: true })
    this.removeEventListener('keydown', this.handleBack)
    this.removeEventListener('click', this.handleAlternate, { capture: true })
    document.removeEventListener('keydown', this.handleHotkey)
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    /* Closing goes back to the first page, so the next opening starts there. */
    if (changed.get('open') === true && !this.open) {
      this.trail = []
      this.page = ''
    }
    if (this.childrenKnown) {
      this.footed = this.knownChildren.some((child) => child.slot === 'footer')
    }
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.finishHydration()
  }

  /**
   * The list's loading, error and empty states on the host too, so a page
   * styles the whole palette from them, as Combobox does. Read once the list
   * has drawn its filter, since `hidden` is what the filter writes onto a
   * command.
   */
  private markStatus(): void {
    const list = this.listbox
    const options = list?.options ?? []
    const shown = options.some((option) => !option.hidden)
    const settled = list !== null && !this.loading
    this.toggleState('loading', this.loading)
    this.toggleState('error', Boolean(this.loadError))
    if (this.items !== undefined) {
      /* Commands drawn from `items` are the list's own, and it says what it
         shows in its states, which a browser reads with `:state()`. */
      this.toggleState('empty', settled && says(list, 'empty'))
      this.toggleState('no-results', settled && says(list, 'no-results'))
      return
    }
    this.toggleState('empty', settled && !shown)
    this.toggleState('no-results', settled && list.filter !== '' && options.length > 0 && !shown)
  }

  /**
   * After the list has filtered on what was typed. The event comes before the
   * filter is applied, so the list's update is waited for a turn later.
   */
  private readonly handleFilter = (): void => {
    void Promise.resolve()
      .then(() => this.listbox?.updateComplete)
      .then(() => this.markStatus())
  }

  /** Whether a child fills the named slot, so it is handed on to the dialog or the list. */
  private fills(name: string): boolean {
    return this.querySelector?.(`:scope > [slot="${name}"]`) != null
  }

  protected override updated(changed: PropertyValues): void {
    super.updated?.(changed)
    void (this.listbox?.updateComplete ?? Promise.resolve()).then(() => this.markStatus())
    /* On the change rather than on every update. Both of these reach into the
       listbox, and asking it to filter on a render it did not cause is how a
       render becomes a loop: the list updates, something it owns comes back
       through this element, and the next update asks again. Only the moment the
       palette opens or shuts is either of them true. */
    if (!changed.has('open')) {
      return
    }
    if (this.open) {
      /* Each opening starts with no command highlighted, as React Aria's
         Autocomplete does, so Enter runs nothing until a reader types or moves.
         The highlight a reader left on closing stayed, and a filter emptied on
         closing put it on the first command, so the second opening began on a
         command where the first began on none. */
      this.listbox?.highlight('none')
      /* The field takes focus as the palette arrives. A reader who pressed a
         key to summon a search expects to be typing in it, and the dialog would
         otherwise put focus on itself. */
      this.searchField?.focus()
    } else {
      this.listbox?.requestFilter('')
    }
  }

  /**
   * The surface the palette opens in, behind a seam the styled tier can move.
   *
   * A method rather than a fragment inline, so a tier above can render its own,
   * wrap this one, pass it a property the base does not know about, or leave it
   * out, without reimplementing the whole template to do any of them. The tag is
   * interpolated rather than written, so `tier` resolves it: this renders the
   * headless element, and a styled subclass that sets `tier` renders the styled one
   * from the same template.
   */
  protected renderDialog(): TemplateResult {
    return html`<${this.tag('dialog')}
    exportparts="body: dialog-body, dialog, dismiss: dialog-dismiss, dismiss-mark: dialog-dismiss-mark,
      footer: dialog-footer, header: dialog-header"
      label=${this.label}
      .open=${this.open}
      @helix-before-close=${() => {
        if (this.open) {
          this.requestOpen(false)
        }
      }}
    >
      ${this.renderListbox()}${drawStatus(this.status)}
      <!-- Handed on only while something fills it, as the list's slots are,
           so an empty header draws nothing in the dialog. -->
      <slot
        name="header"
        slot=${this.fills('header') ? 'header' : nothing}
        @slotchange=${() => this.requestUpdate()}
      ></slot>
      ${this.renderFooter('footer')}
    </${this.tag('dialog')}>`
  }

  /**
   * The filterable list of commands, which the dialog holds, or the page with
   * `inline`, behind a seam the styled tier can move.
   */
  protected renderListbox(): TemplateResult {
    return html`<${this.tag('listbox')}
        part="listbox"
        exportparts="empty: listbox-empty, error: listbox-error, feedback: listbox-feedback,
          filter-icon: listbox-filter-icon, filter-mark: listbox-filter-mark, hint: listbox-hint,
          items: listbox-items, label: listbox-label, live: listbox-live, loading: listbox-loading,
          search: listbox-search, search-field: listbox-search-field"
        aria-label=${this.listName}
        empty-text=${this.emptyText}
        filter-delay=${this.filterDelay}
        .filterMatch=${this.filterMatch}
        filter-label=${this.placeholder}
        load-error=${this.loadError}
        loading-text=${this.loadingText}
        no-results-text=${this.noResultsText ?? nothing}
        result-label=${this.resultLabel ?? ''}
        results-label=${this.resultsLabel}
        ?loading=${this.loading}
        .items=${this.items}
        .fieldHomeEnd=${this.homeEnd === 'list'}
        layout=${this.layout ?? nothing}
        filterable
        @helix-before-change=${this.handleChange}
        @helix-filter=${this.handleFilter}
        @change=${this.stopInner}
        @input=${this.stopInner}
      >
        ${this.page === '' ? html`<slot></slot>` : html`<slot name=${`page:${this.page}`}></slot>`}
        <!-- Handed on with the text as the fallback, for the reason Combobox
             gives: the list's own fallback never shows behind a passed slot. -->
        <slot name="empty" slot="empty">${this.emptyText}</slot>
        <slot name="loading" slot="loading">${this.loadingText}</slot>
        <slot name="error" slot="error">${this.loadError}</slot>
        <!-- Handed on only while something fills it: an assigned slot hides the
             list's own fallback, which is no-results-text or empty-text. -->
        <slot
          name="no-results"
          slot=${this.fills('no-results') ? 'no-results' : nothing}
          @slotchange=${() => this.requestUpdate()}
        ></slot>
        <slot
          name="filter-icon"
          slot=${this.fills('filter-icon') ? 'filter-icon' : nothing}
          @slotchange=${() => this.requestUpdate()}
        ></slot>
      </${this.tag('listbox')}>`
  }

  /** The row under the list, in the dialog's footer or, `inline`, under the list itself. */
  private renderFooter(slot: string | typeof nothing): TemplateResult {
    return html`<div ?hidden=${!this.footed} part="footer" slot=${slot}>
      <slot
        name="footer"
        @slotchange=${(event: Event) => {
          this.footed = (event.target as HTMLSlotElement).assignedNodes().length > 0
        }}
      ></slot>
    </div>`
  }

  protected override render(): TemplateResult {
    /* No part of its own on the host, and the dialog's own box forwarded under
       its own name: `::part(dialog)` then reaches the thing with the shadow and
       the padding, rather than a host that is only a wrapper. `align` is not set
       here either, being a styled-tier property: where the panel sits is
       presentation, and this tier renders no CSS. */
    if (this.inline) {
      return html`<slot name="header"></slot>${this.renderListbox()}${drawStatus(this.status)}${this.renderFooter(nothing)}`
    }
    return html`${this.renderDialog()}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-command': HelixHeadlessCommand
  }
}

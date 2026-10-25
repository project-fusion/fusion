import {
  customElement,
  deepActiveElement,
  deepContains,
  drawIcon,
  elementById,
  type FindDirection,
  type Finder,
  type FindQuery,
  type FindResult,
  findPattern,
  formatWords,
  HelixElement,
  HelixFoundEvent,
  MIRROR_RULE,
  MixinControllerOpen,
  matchesChord,
  onApple,
  stopPress,
  textFinder,
  words,
} from '@fusion.dev/helix-core'
import {
  asterisk,
  caretDown,
  caretRight,
  caretUp,
  textAa,
  textAUnderline,
  x,
} from '@fusion.dev/helix-icons'
import { nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { keyed } from 'lit/directives/keyed.js'
import { live } from 'lit/directives/live.js'
import { html } from 'lit/static-html.js'
import '../../button/index.js'
import '../../icon-button/index.js'
import '../../toolbar/index.js'

export type { FindDirection, Finder, FindQuery, FindResult } from '@fusion.dev/helix-core'

/** What `attach` returns: how a finder reports a search it finished later, and lets go of Find. */
export interface FindSink {
  /** Takes the finder's marks away, and Find goes back to searching what `for` names. */
  detach(): void
  /** Reports where a search stands, for a finder whose `find` returned nothing and counted later. */
  found(result: FindResult): void
}

/** The options a bar can show, in the order it shows them. */
export type FindOption = 'match-case' | 'regex' | 'whole-word'

/** The properties a change to which searches again, from the current match. */
const SEARCHED = ['for', 'matchCase', 'open', 'query', 'regex', 'skip', 'wholeWord'] as const

/**
 * @summary A bar that finds words in content and moves among the matches.
 *
 * @description
 * Searches the content `for` names, by id, and marks every match, with the
 * current one marked apart. The count says which match is current and how many
 * there are. Find opens with Command+F, or Control+F on Windows and Linux,
 * while the reader is in that content or in the bar. Everywhere else on the
 * page, the key opens the browser's own find. `shortcut` changes the key, and
 * empty turns it off.
 *
 * The match case, whole word, and regular expression options are drawn in the
 * bar. `options` names the ones it draws. Text that is not shown is not
 * searched, nor text under `inert` or `aria-hidden="true"`, nor what `skip`
 * matches. Text under `hidden="until-found"` and in a closed `<details>` is
 * searched, and opened when its match becomes current, as the browser's find
 * opens it: an Accordion section opens. A match is scrolled into the middle of
 * what scrolls it unless it is already in sight. While Find is open, a change
 * to the content searches again once the content is still.
 *
 * Content drawn some other way, such as a terminal's grid, an editor's
 * document, or rows of a list that are not all in the page, is searched by a
 * finder the page attaches with `attach(finder)`. Terminal and Code Editor
 * draw a Find of their own, which searches through their renderer. Find offers
 * replacing to a finder that can replace, unless `readonly` is set.
 *
 * The bar is a search landmark named by `label`. The count is said in a live
 * region as it changes.
 *
 * **Keyboard.** In the field, Enter moves to the next match and Shift+Enter to
 * the previous one. Escape closes the bar from anywhere in it, and focus
 * returns to where it was before the bar opened. The find key pressed again
 * moves focus to the field and selects what it holds. In the replace field,
 * Enter replaces the current match, and Command+Enter or Control+Enter
 * replaces every match.
 *
 * @since 0.220.0
 * @status experimental
 * @category navigation
 * @documentation https://fusion.dev/helix/components/find
 *
 * @slot actions - Controls of your own in the bar's toolbar, between its options and the buttons that move between matches.
 * @slot close-icon - Replaces the glyph inside the close button.
 * @slot match-case-icon - Replaces the glyph inside the match case button.
 * @slot next-icon - Replaces the glyph inside the next match button.
 * @slot previous-icon - Replaces the glyph inside the previous match button.
 * @slot regex-icon - Replaces the glyph inside the regular expression button.
 * @slot whole-word-icon - Replaces the glyph inside the whole word button.
 *
 * @event {HelixBeforeCloseEvent} helix-before-close - Fired before the bar closes, and cancelable.
 * @event {HelixBeforeOpenEvent} helix-before-open - Fired before the bar opens, and cancelable. Canceling it keeps the bar closed.
 * @event {HelixFoundEvent} helix-found - Sent after each search and each move among the matches, with `count` and the current match's `index`, counting from 0, or -1 for none.
 * @event {ToggleEvent} toggle - Sent when the bar opens or closes, with `newState` and `oldState`.
 *
 * @csspart actions - The `actions` slot, in the toolbar.
 * @csspart bar - The bar, a search landmark: the field, the count, the toolbar, and the replace row while it shows.
 * @csspart close - The button that closes the bar.
 * @csspart close-button - The close button's inner button.
 * @csspart close-live - The close button's live region, which speaks while the button is pending.
 * @csspart close-spinner - The ring the close button turns while it is pending.
 * @csspart close-text - The box the close button's icon sits in.
 * @csspart controls - The toolbar: the options, your actions, and the buttons that move between matches and close the bar.
 * @csspart controls-toolbar - The box inside the toolbar that lays its buttons out.
 * @csspart count - Which match is current and how many there are, such as "3 of 12 matches".
 * @csspart field - The search field.
 * @csspart live - The live region that says the count as it changes.
 * @csspart match-case - The button that matches case. Pressed while it does.
 * @csspart match-case-button - The match case button's inner button.
 * @csspart match-case-live - The match case button's live region, which speaks while the button is pending.
 * @csspart match-case-pressed - The match case button while case has to match, beside `match-case`.
 * @csspart match-case-spinner - The ring the match case button turns while it is pending.
 * @csspart match-case-text - The box the match case button's icon sits in.
 * @csspart next - The button that moves to the next match.
 * @csspart next-button - The next match button's inner button.
 * @csspart next-live - The next match button's live region, which speaks while the button is pending.
 * @csspart next-spinner - The ring the next match button turns while it is pending.
 * @csspart next-text - The box the next match button's icon sits in.
 * @csspart previous - The button that moves to the previous match.
 * @csspart previous-button - The previous match button's inner button.
 * @csspart previous-live - The previous match button's live region, which speaks while the button is pending.
 * @csspart previous-spinner - The ring the previous match button turns while it is pending.
 * @csspart previous-text - The box the previous match button's icon sits in.
 * @csspart regex - The button that reads the field as a regular expression. Pressed while it does.
 * @csspart regex-button - The regular expression button's inner button.
 * @csspart regex-live - The regular expression button's live region, which speaks while the button is pending.
 * @csspart regex-pressed - The regular expression button while the field reads as one, beside `regex`.
 * @csspart regex-spinner - The ring the regular expression button turns while it is pending.
 * @csspart regex-text - The box the regular expression button's icon sits in.
 * @csspart replace - The button that replaces the current match.
 * @csspart replace-all - The button that replaces every match.
 * @csspart replace-all-button - The Replace all button's inner button.
 * @csspart replace-all-live - The Replace all button's live region, which speaks while the button is pending.
 * @csspart replace-all-spinner - The ring the Replace all button turns while it is pending.
 * @csspart replace-all-text - The box the Replace all button's words sit in.
 * @csspart replace-button - The Replace button's inner button.
 * @csspart replace-field - The field the replacement is typed in.
 * @csspart replace-live - The Replace button's live region, which speaks while the button is pending.
 * @csspart replace-spinner - The ring the Replace button turns while it is pending.
 * @csspart replace-text - The box the Replace button's words sit in.
 * @csspart replace-toggle - The button that shows the replace row. Expanded while it shows.
 * @csspart replace-toggle-button - The replace toggle's inner button.
 * @csspart replace-toggle-live - The replace toggle's live region, which speaks while the button is pending.
 * @csspart replace-toggle-spinner - The ring the replace toggle turns while it is pending.
 * @csspart replace-toggle-text - The box the replace toggle's icon sits in.
 * @csspart whole-word - The button that matches whole words only. Pressed while it does.
 * @csspart whole-word-button - The whole word button's inner button.
 * @csspart whole-word-live - The whole word button's live region, which speaks while the button is pending.
 * @csspart whole-word-pressed - The whole word button while only whole words match, beside `whole-word`.
 * @csspart whole-word-spinner - The ring the whole word button turns while it is pending.
 * @csspart whole-word-text - The box the whole word button's icon sits in.
 *
 * @cssstate open - While the bar is open.
 * @cssstate replace-open - While the replace row shows.
 */
@customElement('helix-headless-find')
export class HelixHeadlessFind extends MixinControllerOpen(HelixElement) {
  protected static override markRules = [MIRROR_RULE]

  /**
   * The key this family's words are registered under, its styled tag:
   * `registerWords('de', { 'helix-find': { label: 'Suchen' } })`.
   */
  static words = 'helix-find'

  /** The close button's label. */
  @words
  @property({ attribute: 'close-label' })
  closeLabel = 'Close find'

  /** The name of the bar's toolbar, read by screen readers. */
  @words
  @property({ attribute: 'controls-label' })
  controlsLabel = 'Find controls'

  /** The name the element gives itself where `label` is empty. */
  @words
  @property({ attribute: 'fallback-label' })
  fallbackLabel = 'Find'

  /**
   * The id of the element whose text Find searches, in the same tree as Find.
   * With a finder attached, it names only where the find key opens the bar.
   */
  @property()
  for = ''

  /** What the count says when the regular expression cannot be read. */
  @words
  @property({ attribute: 'invalid-label' })
  invalidLabel = 'Not a valid regular expression'

  /**
   * The field's name and placeholder, and the name of the bar.
   *
   * Empty by default, which leaves the name to `fallbackLabel`.
   */
  @property()
  label = ''

  /** Whether case has to match, so "Error" does not find "error". The reader turns it on and off from the bar. */
  @property({ attribute: 'match-case', type: Boolean })
  matchCase = false

  /** The match case button's label. */
  @words
  @property({ attribute: 'match-case-label' })
  matchCaseLabel = 'Match case'

  /**
   * What the count says of the matches. `{index}` is the current match,
   * counting from 1, and `{count}` how many there are.
   */
  @words
  @property({ attribute: 'matches-label' })
  matchesLabel =
    '{count, plural, =0 {No matches} one {{index} of # match} other {{index} of # matches}}'

  /** The next match button's label. */
  @words
  @property({ attribute: 'next-label' })
  nextLabel = 'Next match'

  /**
   * Which options the bar draws, as a list of `match-case`, `whole-word`, and
   * `regex`, or `none`. They are always drawn in that order.
   */
  @property()
  options = 'match-case whole-word regex'

  /** The previous match button's label. */
  @words
  @property({ attribute: 'previous-label' })
  previousLabel = 'Previous match'

  /** What the field holds: what the reader typed, or what you set. */
  @property()
  query = ''

  /** Hides replacing, for content the reader cannot change. The attribute is `readonly`, the platform's spelling. */
  @property({ attribute: 'readonly', type: Boolean })
  readOnly = false

  /** Whether the field reads as a regular expression, in JavaScript's syntax. The reader turns it on and off from the bar. */
  @property({ type: Boolean })
  regex = false

  /** The regular expression button's label. */
  @words
  @property({ attribute: 'regex-label' })
  regexLabel = 'Use regular expression'

  /** The Replace all button's words. */
  @words
  @property({ attribute: 'replace-all-label' })
  replaceAllLabel = 'Replace all'

  /** The replace field's name and placeholder. */
  @words
  @property({ attribute: 'replace-field-label' })
  replaceFieldLabel = 'Replace with'

  /** The Replace button's words. */
  @words
  @property({ attribute: 'replace-label' })
  replaceLabel = 'Replace'

  /** What the replace field holds, which Replace puts in place of a match. */
  @property()
  replacement = ''

  /** The label of the button that shows the replace row. */
  @words
  @property({ attribute: 'replace-toggle-label' })
  replaceToggleLabel = 'Find and replace'

  /**
   * The key that opens the bar, as a chord such as `mod+f`, where `mod` is
   * Command on an Apple keyboard and Control elsewhere. Empty turns the key
   * off, as for a bar the page opens itself.
   */
  @property()
  shortcut = 'mod+f'

  /**
   * Elements inside the content whose text is not searched, as a selector,
   * such as line numbers or the buttons beside each message.
   */
  @property()
  skip = ''

  /** Whether only whole words match. The reader turns it on and off from the bar. */
  @property({ attribute: 'whole-word', type: Boolean })
  wholeWord = false

  /** The whole word button's label. */
  @words
  @property({ attribute: 'whole-word-label' })
  wholeWordLabel = 'Match whole word'

  /** Where the search stands, or nothing before one. */
  @state()
  private result: FindResult | undefined = undefined

  /** Whether the replace row shows, where the finder can replace. */
  @state()
  private replaceOpen = false

  /** The finder a frame or the page attached, which searches in place of the text finder. */
  @state()
  private attached: Finder | undefined = undefined

  /** What the live region says now, and how many times something has been said. */
  @state()
  private announcement = ''

  @state()
  private said = 0

  /** The text finder over the content `for` names, made for that content and `skip`. */
  private own: { finder: Finder; root: Element; skip: string } | undefined

  /** The finder whose marks are drawn, which `end` is sent to. */
  private marking: Finder | undefined

  /** Where focus was before the bar opened, which it returns to as the bar closes. */
  private returnTo: Element | undefined

  /** Whether the reader last pressed or focused inside the content or the bar, where the find key is Find's. */
  private inside = false

  /**
   * Searches with `finder` in place of the text finder, and returns how it
   * reports a search it finishes later. Attaching another lets go of this one.
   */
  attach(finder: Finder): FindSink {
    this.endSearch()
    this.attached = finder
    this.replaceOpen = this.replaceOpen && finder.replace !== undefined
    if (this.open) {
      queueMicrotask(() => this.search('first'))
    }
    return {
      detach: () => {
        if (this.attached === finder) {
          this.endSearch()
          this.attached = undefined
        }
      },
      found: (result) => {
        if (this.attached === finder) {
          this.report(result)
        }
      },
    }
  }

  /**
   * Opens the bar and puts focus in its field, with what it holds selected.
   * Text selected in the content, on one line, becomes the search.
   */
  async show(): Promise<void> {
    const active = deepActiveElement()
    if (active !== null && !deepContains(this, active)) {
      this.returnTo = active
    }
    const selected = this.attached ? '' : this.selectedText()
    if (selected !== '') {
      this.query = selected
    }
    if (!this.requestOpen(true)) {
      return
    }
    await this.updateComplete
    const field = this.partNamed<HTMLInputElement>('field')
    field?.focus()
    field?.select()
  }

  /** Closes the bar and takes the marks away. Focus in the bar returns to where it was before the bar opened. */
  hide(): void {
    const active = deepActiveElement()
    const focused = active !== null && deepContains(this, active)
    if (!this.requestOpen(false)) {
      return
    }
    const back = this.returnTo
    this.returnTo = undefined
    if (focused && back?.isConnected) {
      ;(back as HTMLElement).focus()
    }
  }

  /** Moves to the next match, after the last one to the first. */
  next(): void {
    if (this.open) {
      this.search('next')
    }
  }

  /** Moves to the previous match, before the first one to the last. */
  previous(): void {
    if (this.open) {
      this.search('previous')
    }
  }

  /** Searches again, staying on the current match where it still matches, for content changed in a way Find cannot see. */
  refresh(): void {
    if (this.open) {
      this.search('first')
    }
  }

  override connectedCallback(): void {
    super.connectedCallback()
    const document = this.ownerDocument
    document.addEventListener('keydown', this.handleShortcut, true)
    document.addEventListener('pointerdown', this.handleWhere, true)
    document.addEventListener('focusin', this.handleWhere, true)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    const document = this.ownerDocument
    document.removeEventListener('keydown', this.handleShortcut, true)
    document.removeEventListener('pointerdown', this.handleWhere, true)
    document.removeEventListener('focusin', this.handleWhere, true)
    this.endSearch()
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.finishHydration()
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    this.toggleState('replace-open', this.replacing)
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    if (!this.open) {
      if (changed.has('open')) {
        this.endSearch()
      }
      return
    }
    /* Searched once the update is over, since a search reports where it
       stands and that is a change the next update draws. */
    if (SEARCHED.some((name) => changed.has(name))) {
      queueMicrotask(() => this.search('first'))
    }
  }

  /** The element `for` names, or nothing. */
  private get target(): Element | null {
    return this.for === '' ? null : elementById(this, this.for)
  }

  /** The finder that searches now: the one attached, or the text finder over what `for` names. */
  private get finder(): Finder | undefined {
    if (this.attached) {
      return this.attached
    }
    const root = this.target
    if (root === null) {
      return undefined
    }
    if (this.own?.root !== root || this.own.skip !== this.skip) {
      this.own?.finder.end()
      this.own = {
        finder: textFinder(root, { found: (result) => this.report(result), skip: this.skip }),
        root,
        skip: this.skip,
      }
    }
    return this.own.finder
  }

  /** The query as a finder reads it. */
  private get findQuery(): FindQuery {
    return {
      caseSensitive: this.matchCase,
      regex: this.regex,
      replace: this.replacement,
      search: this.query,
      wholeWord: this.wholeWord,
    }
  }

  /** Whether the field can be searched for: empty, or a pattern that reads. */
  private get readable(): boolean {
    return this.query === '' || findPattern(this.findQuery) !== undefined
  }

  /**
   * Whether the finder can replace and the content can be changed. Never
   * while hydrating, since a server has no finder: the update after hydration
   * draws the replace toggle.
   */
  private get replaceable(): boolean {
    return !this.hydrating && !this.readOnly && this.attached?.replace !== undefined
  }

  /** Whether the replace row shows. */
  private get replacing(): boolean {
    return this.replaceOpen && this.replaceable
  }

  /**
   * The count, as the reader reads it, and empty before a search. The
   * template writes `nothing` for empty: Lit hydrating a server's empty string
   * has no text node to change, and writes the next count into the part's
   * closing marker, where nothing shows.
   */
  private get countText(): string {
    if (!this.readable) {
      return this.invalidLabel
    }
    return this.result === undefined
      ? ''
      : formatWords(this, 'matchesLabel', {
          count: this.result.count,
          index: Math.max(this.result.index, 0) + 1,
        })
  }

  /** Whether the bar draws an option. */
  private offers(option: FindOption): boolean {
    return this.options.split(/\s+/).includes(option)
  }

  /** The text selected in the content, where it lies on one line, or nothing. */
  private selectedText(): string {
    const selection = this.ownerDocument.getSelection?.()
    const root = this.target
    const text = selection?.toString() ?? ''
    const anchor = selection?.anchorNode ?? null
    return root !== null &&
      anchor !== null &&
      root.contains(anchor) &&
      text.trim() !== '' &&
      !/[\r\n]/.test(text)
      ? text
      : ''
  }

  /** Searches with the finder, and says where the search stands. */
  private search(direction: FindDirection): void {
    const finder = this.finder
    if (!finder) {
      return
    }
    if (this.marking !== finder) {
      this.endSearch()
    }
    if (this.query === '' || !this.readable) {
      this.endSearch()
      if (!this.readable) {
        this.say(this.invalidLabel)
      }
      return
    }
    this.marking = finder
    const result = finder.find(this.findQuery, direction)
    if (result) {
      this.report(result)
    }
  }

  /** Takes the last search's marks away, where it drew any. */
  private endSearch(): void {
    this.marking?.end()
    this.marking = undefined
    this.result = undefined
  }

  /** Where a search stands, drawn in the count, said, and sent as `helix-found`. Nothing while the bar is closed. */
  private report(result: FindResult): void {
    if (!this.open) {
      return
    }
    this.result = result
    this.say(this.countText)
    this.dispatchEvent(new HelixFoundEvent({ count: result.count, index: result.index }))
  }

  /** Replaces the current match, or every match. */
  private replace(all: boolean): void {
    const finder = this.finder
    if (!finder?.replace || this.readOnly || this.query === '' || !this.readable) {
      return
    }
    const result = finder.replace(this.findQuery, all)
    if (result) {
      this.report(result)
    }
  }

  /** Says something in the live region, once, even where it is what was said last. */
  private say(text: string): void {
    this.announcement = text
    this.said += 1
  }

  /** Whether an event's path runs through the bar or the content. */
  private within(event: Event): boolean {
    const path = event.composedPath()
    const root = this.target
    return path.includes(this) || (root !== null && path.includes(root))
  }

  /** Where the reader last pressed or put focus, which decides whose the find key is. */
  private readonly handleWhere = (event: Event): void => {
    this.inside = this.within(event)
  }

  /**
   * The find key, heard on the document before anything else, and taken only
   * where the reader is in the content or the bar, so the key opens the
   * browser's own find everywhere else.
   */
  private readonly handleShortcut = (event: KeyboardEvent): void => {
    if (
      event.defaultPrevented ||
      event.isComposing ||
      this.shortcut === '' ||
      !matchesChord(event, this.shortcut, onApple()) ||
      !(this.inside || this.within(event)) ||
      this.finder === undefined
    ) {
      return
    }
    event.preventDefault()
    void this.show()
  }

  private readonly handleInput = (event: Event): void => {
    this.query = (event.target as HTMLInputElement).value
  }

  private readonly handleReplaceInput = (event: Event): void => {
    this.replacement = (event.target as HTMLInputElement).value
  }

  /** Escape closes the bar from anywhere in it, and Enter moves between matches or replaces. */
  private readonly handleKeys = (event: KeyboardEvent): void => {
    if (event.defaultPrevented || event.isComposing) {
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      this.hide()
      return
    }
    if (event.key !== 'Enter') {
      return
    }
    const origin = event.composedPath()[0]
    if (!(origin instanceof HTMLInputElement)) {
      return
    }
    event.preventDefault()
    if (origin.getAttribute('part') === 'replace-field') {
      this.replace(event.metaKey || event.ctrlKey)
    } else {
      this.search(event.shiftKey ? 'previous' : 'next')
    }
  }

  /** Turns one of the options on or off, which searches again with it. */
  private toggleOption(option: 'matchCase' | 'regex' | 'wholeWord'): void {
    this[option] = !this[option]
  }

  /** The button that shows the replace row, drawn where the finder can replace. */
  protected renderReplaceToggle(): TemplateResult | typeof nothing {
    if (!this.replaceable) {
      return nothing
    }
    const button = this.tag('icon-button')
    return html`<${button}
      part="replace-toggle"
      exportparts="button: replace-toggle-button, live: replace-toggle-live, spinner: replace-toggle-spinner, text: replace-toggle-text"
      .expanded=${this.replacing}
      label=${this.replaceToggleLabel}
      @click=${() => {
        this.replaceOpen = !this.replaceOpen
      }}
      @helix-press=${stopPress}
    >
      ${this.replacing ? drawIcon(caretDown) : html`<span data-mirror>${drawIcon(caretRight)}</span>`}
    </${button}>`
  }

  /** The options the bar draws, each pressed while it applies. */
  protected renderOptionButtons(): TemplateResult {
    const button = this.tag('icon-button')
    return html`${
      this.offers('match-case')
        ? html`<${button}
            part="match-case${this.matchCase ? ' match-case-pressed' : ''}"
            exportparts="button: match-case-button, live: match-case-live, spinner: match-case-spinner, text: match-case-text"
            aria-pressed=${this.matchCase ? 'true' : 'false'}
            label=${this.matchCaseLabel}
            @click=${() => this.toggleOption('matchCase')}
            @helix-press=${stopPress}
          >
            <slot name="match-case-icon">${drawIcon(textAa)}</slot>
          </${button}>`
        : nothing
    }${
      this.offers('whole-word')
        ? html`<${button}
            part="whole-word${this.wholeWord ? ' whole-word-pressed' : ''}"
            exportparts="button: whole-word-button, live: whole-word-live, spinner: whole-word-spinner, text: whole-word-text"
            aria-pressed=${this.wholeWord ? 'true' : 'false'}
            label=${this.wholeWordLabel}
            @click=${() => this.toggleOption('wholeWord')}
            @helix-press=${stopPress}
          >
            <slot name="whole-word-icon">${drawIcon(textAUnderline)}</slot>
          </${button}>`
        : nothing
    }${
      this.offers('regex')
        ? html`<${button}
            part="regex${this.regex ? ' regex-pressed' : ''}"
            exportparts="button: regex-button, live: regex-live, spinner: regex-spinner, text: regex-text"
            aria-pressed=${this.regex ? 'true' : 'false'}
            label=${this.regexLabel}
            @click=${() => this.toggleOption('regex')}
            @helix-press=${stopPress}
          >
            <slot name="regex-icon">${drawIcon(asterisk)}</slot>
          </${button}>`
        : nothing
    }`
  }

  /**
   * The toolbar after the field: the options, the page's actions, and the
   * buttons that move between matches and close the bar. The field stands
   * outside it, because a toolbar takes the arrows and a text field needs
   * them.
   */
  protected renderControls(): TemplateResult {
    const toolbar = this.tag('toolbar')
    const button = this.tag('icon-button')
    const searchable = this.readable && (this.result?.count ?? 0) > 0
    return html`<${toolbar} part="controls" exportparts="toolbar: controls-toolbar" label=${this.controlsLabel}>
      ${this.renderOptionButtons()}
      <slot name="actions" part="actions"></slot>
      <${button}
        part="previous"
        exportparts="button: previous-button, live: previous-live, spinner: previous-spinner, text: previous-text"
        ?disabled=${!searchable}
        label=${this.previousLabel}
        @click=${() => this.search('previous')}
        @helix-press=${stopPress}
      >
        <slot name="previous-icon">${drawIcon(caretUp)}</slot>
      </${button}>
      <${button}
        part="next"
        exportparts="button: next-button, live: next-live, spinner: next-spinner, text: next-text"
        ?disabled=${!searchable}
        label=${this.nextLabel}
        @click=${() => this.search('next')}
        @helix-press=${stopPress}
      >
        <slot name="next-icon">${drawIcon(caretDown)}</slot>
      </${button}>
      <${button}
        part="close"
        exportparts="button: close-button, live: close-live, spinner: close-spinner, text: close-text"
        label=${this.closeLabel}
        @click=${() => this.hide()}
        @helix-press=${stopPress}
      >
        <slot name="close-icon">${drawIcon(x)}</slot>
      </${button}>
    </${toolbar}>`
  }

  /** The replace row: its field, then Replace and Replace all. */
  protected renderReplace(): TemplateResult | typeof nothing {
    if (!this.replacing) {
      return nothing
    }
    const button = this.tag('button')
    const searchable = this.readable && (this.result?.count ?? 0) > 0
    return html`<input
        part="replace-field"
        aria-label=${this.replaceFieldLabel}
        autocomplete="off"
        placeholder=${this.replaceFieldLabel}
        spellcheck="false"
        type="text"
        .value=${live(this.replacement)}
        @input=${this.handleReplaceInput}
      />
      <${button}
        part="replace"
        exportparts="button: replace-button, live: replace-live, spinner: replace-spinner, text: replace-text"
        ?disabled=${!searchable}
        @click=${() => this.replace(false)}
        @helix-press=${stopPress}
      >
        ${this.replaceLabel}
      </${button}>
      <${button}
        part="replace-all"
        exportparts="button: replace-all-button, live: replace-all-live, spinner: replace-all-spinner, text: replace-all-text"
        ?disabled=${!searchable}
        @click=${() => this.replace(true)}
        @helix-press=${stopPress}
      >
        ${this.replaceAllLabel}
      </${button}>`
  }

  protected override render(): TemplateResult {
    return html`<div
        part="bar"
        role="search"
        aria-label=${this.label || this.fallbackLabel}
        ?hidden=${!this.open}
        @keydown=${this.handleKeys}
      >
        ${this.renderReplaceToggle()}
        <input
          part="field"
          aria-invalid=${this.readable ? nothing : 'true'}
          aria-label=${this.label || this.fallbackLabel}
          autocomplete="off"
          placeholder=${this.label || this.fallbackLabel}
          spellcheck="false"
          type="search"
          .value=${live(this.query)}
          @input=${this.handleInput}
        />
        <span part="count" aria-hidden="true">${this.countText || nothing}</span>
        ${this.renderControls()}
        ${this.renderReplace()}
      </div>
      <span part="live" role="status">${keyed(this.said, this.announcement)}</span>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-find': HelixHeadlessFind
  }
}

import {
  commaList,
  customElement,
  deepActiveElement,
  deepContains,
  focusItemOf,
  HelixElement,
  hostAria,
  KeyboardNavigationController,
  type NavigableItem,
  pressedValue,
  prunedValue,
  requestValue,
  rovingStop,
  type SelectionMode,
  slottedWords,
  typeaheadByWords,
  UpgradeController,
  whenHydrated,
  words,
} from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { HelixHeadlessTag } from '../root/tag-root.js'

/** How many tags a group lets a reader select: core's `SelectionMode`. */
export type TagSelectionMode = SelectionMode

/**
 * @summary A set of tags that the arrow keys move through, and that can be removed and selected from the keyboard.
 *
 * @description
 * A part of `Tag` that holds tags as one control: a grid of rows, one tab stop
 * for the whole set. The arrow keys move between tags, Home and End go to the
 * first and the last, and a typed letter goes to the next tag starting with
 * it. Delete or Backspace removes the focused tag where it is `dismissible`,
 * by sending its `helix-dismiss`: remove it from your list in the handler, and
 * focus moves to the next tag, or the previous one after the last.
 *
 * `selection-mode` lets a reader select tags, with Space, Enter or a press:
 * `single` selects one at a time and `multiple` any number. In `multiple`,
 * Shift with an arrow, Home or End selects the range from the tag last
 * pressed to the tag focus moves to, Shift with a press or Space selects the
 * range to that tag, and Control or Command with A selects every tag that is
 * not disabled. `selection-behavior="replace"` selects the tag a reader
 * presses or moves to alone, as a file list does, and Control or Command
 * with a press or Space adds or takes out one tag. `disallow-empty-selection`
 * keeps one tag selected once one is. `value` holds the
 * selected tags' values, separated by commas, and a change asks with
 * `helix-before-change` and tells with `change`. Enter on a tag with an
 * `href` follows its link. A `disabled` tag is passed over. A selected tag
 * that is removed leaves `value`, which then sends `change`.
 *
 * Name the set with `label`. Each tag is named by its words alone, without
 * its remove button. `value` takes an array of values on the property as
 * well, as React sets `value={['Apple']}`; a press writes it back as a
 * string.
 *
 * **Removing the last tag keeps focus in the group.** With no tags left the
 * set is a `group`, and focus moves to its `empty` part,
 * which holds the `empty` slot: put words there such as "No filters" for a
 * reader to hear. With nothing slotted it says `empty-label`, "No tags".
 * Where only disabled tags are left, the first of them holds the tab stop and
 * takes focus, so the reader stays in the set.
 *
 * @since 0.1.0
 * @status stable
 * @aliases Tag list, Chip group, Token list
 * @documentation https://fusion.dev/helix/components/tag
 *
 * @slot - The tags, in the order they are read.
 * @slot empty - Shown in place of the tags while there are none, such as "No filters". Its fallback is `empty-label`.
 *
 * @event {Event} change - Fired once a press has changed which tags are selected.
 * @event {HelixBeforeChangeEvent} helix-before-change - Fired before a press changes which tags are selected, with the `value` it would leave. Cancelable.
 * @event {HelixDismissEvent} helix-dismiss - A tag's remove button was pressed, or Delete or Backspace on the focused tag. Bubbles from that tag, which is its `target`; remove the tag in response. Cancelable.
 *
 * @csspart empty - Holds the `empty` slot while the group has no tags, rendered only then. Takes focus when the last tag is removed.
 */
@customElement('helix-headless-tag-group')
export class HelixHeadlessTagGroup extends HelixElement {
  /**
   * The key this part's words are registered under, its styled tag:
   * `registerWords('de', { 'helix-tag-group': { emptyLabel: 'Keine Schlagwörter' } })`.
   */
  static words = 'helix-tag-group'

  /**
   * Keeps at least one tag selected once one is, as React Aria's
   * `disallowEmptySelection`: a press or a key that would leave none selected
   * is refused. Removing the last selected tag still takes it out of `value`.
   */
  @property({ attribute: 'disallow-empty-selection', type: Boolean })
  disallowEmptySelection = false

  /**
   * The words the group shows and says once its last tag is removed, where
   * nothing is in the `empty` slot.
   */
  @words
  @property({ attribute: 'empty-label' })
  emptyLabel = 'No tags'

  /**
   * The name of the set, such as "Filters", which a screen reader announces
   * before its tags.
   */
  @property()
  label = ''

  /**
   * What a press, Space, or a move does to the tags already selected.
   * `toggle`, the default, keeps them: a press adds or takes out the tag, and
   * the arrow keys move focus alone. `replace` selects the tag alone, as a
   * file list does, and the arrow keys carry the selection with focus.
   * Control or Command with a press or Space adds or takes out one tag in
   * `multiple`, and with an arrow moves focus without selecting.
   */
  @property({ attribute: 'selection-behavior' })
  selectionBehavior: 'replace' | 'toggle' = 'toggle'

  /**
   * How many tags a reader can select: `single`, `multiple`, or none.
   *
   * Absent selects nothing, and the tags carry no selected state at all.
   */
  @property({ attribute: 'selection-mode' })
  selectionMode?: TagSelectionMode

  /**
   * The selected tags' values, separated by commas, since a value may hold a
   * space.
   *
   * Set it to start with tags selected. A tag's value is its `value`, or its
   * words where it has none.
   */
  @property()
  value: string | readonly string[] = ''

  /** The tag the reader was last on, which keeps the tab stop. */
  private last: HelixHeadlessTag | undefined

  /**
   * Where a range chosen with Shift and an arrow starts, and where it reached,
   * in `multiple`: the tag last pressed or moved to without Shift.
   */
  private anchor: HelixHeadlessTag | undefined
  private reached: HelixHeadlessTag | undefined

  /**
   * The arrow keys, Home, End and typed letters, moving focus and choosing
   * nothing. From the focused tag rather than the selection, since a reader
   * moves through selected and unselected tags alike, and without wrapping, as
   * a list of tags has a first and a last.
   */
  protected readonly keys = new KeyboardNavigationController(this, {
    items: () => this.reachable.map((tag) => this.navigable(tag)),
    origin: 'focus',
    selects: () => false,
    typeahead: typeaheadByWords(),
    wrap: false,
  })

  /**
   * `value` as one written list, separated by commas, however it was set:
   * an array of values is joined.
   */
  private get written(): string {
    return typeof this.value === 'string'
      ? this.value
      : this.value
          .map((one) => String(one).trim())
          .filter((one) => one !== '')
          .join(', ')
  }

  /** The tags the group holds, in order. */
  get tags(): HelixHeadlessTag[] {
    return [...(this.children ?? [])].filter(
      (child): child is HelixHeadlessTag => child instanceof HelixHeadlessTag,
    )
  }

  /** The tags a key can land on, which are the ones that are not disabled. */
  private get reachable(): HelixHeadlessTag[] {
    return this.tags.filter((tag) => !tag.disabled)
  }

  /** A tag as the keyboard controller sees it: an item it moves focus to and never chooses. */
  private navigable(tag: HelixHeadlessTag): NavigableItem {
    return focusItemOf(tag, {
      disabled: tag.disabled,
      focus: () => tag.focusItem(),
      words: tag.words,
    })
  }

  /**
   * What a tag stands for in `value`: its own `value`, or its words.
   *
   * The words read off the tag's children here rather than through its
   * `words`, which answers nothing until the tag's own first update: the
   * group's first pass runs before that, and would match no tag.
   */
  private valueFor(tag: HelixHeadlessTag): string {
    return tag.value || slottedWords(tag, ['start', ''])
  }

  /**
   * Tells every tag its place: whether it holds the one tab stop and whether
   * it is selected. Through `whenHydrated`, so a tag a server rendered draws
   * its served markup first.
   */
  private sync(): void {
    const mode = this.selectionMode ?? 'none'
    const chosen = new Set(commaList(this.written))
    const tags = this.tags
    const items = tags.map((tag) => ({
      disabled: tag.disabled,
      selected: chosen.has(this.valueFor(tag)),
      tag,
    }))
    /* **And the first tag where every tag is disabled**, as React Aria's grid
       keeps a stop of its own with no row to land on, so a group whose last
       tag that could take focus was removed keeps focus and a stop. */
    const holder =
      rovingStop(
        items,
        items.find((item) => item.tag === this.last),
        {
          disabled: (item) => item.disabled,
          selected: (item) => item.selected,
        },
      )?.tag ?? tags[0]
    for (const tag of tags) {
      whenHydrated(tag, () => {
        tag.focusable = tag === holder
        tag.selected = mode === 'none' ? undefined : chosen.has(this.valueFor(tag))
      })
    }
  }

  /** The tag a press or a key came from, read off the event's path. */
  private tagOf(event: Event): HelixHeadlessTag | undefined {
    return event
      .composedPath()
      .find((node): node is HelixHeadlessTag => node instanceof HelixHeadlessTag)
  }

  /**
   * Selects the tag, or lets it go, asking first.
   *
   * `helix-before-change` carries the `value` the press would leave, and a
   * listener that refuses it keeps the selection. `change` follows once it
   * has moved.
   */
  protected press(tag: HelixHeadlessTag, cause?: KeyboardEvent | MouseEvent): void {
    const mode = this.selectionMode ?? 'none'
    if (mode === 'none' || tag.disabled) {
      return
    }
    /* Shift extends from the tag last pressed, in either behavior, as React
       Aria's selection does. */
    if (mode === 'multiple' && cause?.shiftKey && this.anchor?.isConnected) {
      this.extend(this.anchor, tag)
      return
    }
    this.anchor = tag
    this.reached = tag
    const adds = cause?.ctrlKey === true || cause?.metaKey === true
    this.ask(
      this.replaces && !(adds && mode === 'multiple')
        ? this.valueFor(tag)
        : pressedValue(mode, this.written, this.valueFor(tag)),
    )
  }

  /** Whether a press or a move selects the tag alone. */
  private get replaces(): boolean {
    return this.selectionMode !== undefined && this.selectionBehavior === 'replace'
  }

  /**
   * Asks for `value` to become `next`, where it changes and where it leaves a
   * tag selected under `disallow-empty-selection`.
   */
  private ask(next: string): void {
    if (next === this.written) {
      return
    }
    if (this.disallowEmptySelection && commaList(next).length === 0) {
      return
    }
    requestValue(this, next, (value) => {
      this.value = value
    })
  }

  /** The reachable tags from one to the other, either way round. */
  private span(from: HelixHeadlessTag, to: HelixHeadlessTag): HelixHeadlessTag[] {
    const tags = this.reachable
    const [start, end] = [tags.indexOf(from), tags.indexOf(to)].sort((a, b) => a - b)
    return start === undefined || end === undefined || start < 0 ? [] : tags.slice(start, end + 1)
  }

  /**
   * Shift and an arrow, Home or End, in `multiple`: the range from the anchor
   * to the tag focus moved to is selected, in place of the range the last such
   * key selected, as React Aria's selection extends.
   */
  private extend(from: HelixHeadlessTag, to: HelixHeadlessTag): void {
    const anchor = this.anchor?.isConnected ? this.anchor : from
    const before = new Set(this.span(anchor, this.reached?.isConnected ? this.reached : from))
    const after = this.span(anchor, to)
    this.anchor = anchor
    this.reached = to
    const kept = this.tags.filter(
      (tag) => commaList(this.written).includes(this.valueFor(tag)) && !before.has(tag),
    )
    const chosen = [...new Set([...kept, ...after])]
    this.choose(this.tags.filter((tag) => chosen.includes(tag)))
  }

  /** Asks for `value` to hold these tags' values, in their order. */
  private choose(tags: readonly HelixHeadlessTag[]): void {
    this.ask([...new Set(tags.map((tag) => this.valueFor(tag)))].join(', '))
  }

  private readonly handleKeydown = (event: KeyboardEvent): void => {
    const tag = this.tagOf(event)
    if (!tag || tag.disabled || event.altKey) {
      return
    }
    const multiple = this.selectionMode === 'multiple'
    /* Control or Command with A selects every tag that can be, in `multiple`. */
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
      if (multiple) {
        event.preventDefault()
        this.choose(this.reachable)
      }
      return
    }
    /* Control or Command with Space adds or takes out the tag, under
       `replace` in `multiple`, where Space alone selects it alone. */
    if ((event.ctrlKey || event.metaKey) && event.key === ' ') {
      if (this.replaces && multiple) {
        event.preventDefault()
        this.press(tag, event)
      }
      return
    }
    if (event.ctrlKey || event.metaKey) {
      return
    }
    /* The keyboard controller, listening first, has already moved focus. */
    if (MOVES.has(event.key)) {
      const to = this.last
      if (multiple && event.shiftKey && to && to !== tag) {
        this.extend(tag, to)
      } else if (!event.shiftKey) {
        this.anchor = to
        this.reached = to
        /* Under `replace` the selection moves with focus. */
        if (this.replaces && to && !to.disabled) {
          this.ask(this.valueFor(to))
        }
      }
      return
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
      if (tag.dismissible) {
        event.preventDefault()
        tag.dismiss()
      }
      return
    }
    if (event.key === 'Enter' && tag.href !== '') {
      event.preventDefault()
      tag.renderRoot.querySelector<HTMLElement>('[part~="link"]')?.click()
      return
    }
    if ((event.key === ' ' || event.key === 'Enter') && this.selectionMode) {
      event.preventDefault()
      this.press(tag, event)
    }
  }

  /* A press on the tag selects it, except on its remove button or its link,
     which are presses on something else. */
  private readonly handleClick = (event: MouseEvent): void => {
    const tag = this.tagOf(event)
    const control = event
      .composedPath()
      .some(
        (node) =>
          node instanceof Element &&
          /(^| )(dismiss|link)( |$)/.test(node.getAttribute('part') ?? ''),
      )
    if (tag && !control) {
      this.press(tag, event)
    }
  }

  /**
   * What happens once a tag has asked to be removed and the page has had its
   * turn: a selected tag that left takes its value out of `value`, and focus
   * that the last tag took with it comes to the group's `empty` part.
   *
   * Asked after the event and again a frame later, as `MixinDismissible`
   * asks, because a framework removes the tag on its next render, after the
   * handler. A canceled dismissal changes nothing.
   */
  private readonly handleDismiss = (event: Event): void => {
    const tag = this.tagOf(event)
    if (!tag) {
      return
    }
    const had = deepContains(this, deepActiveElement())
    const settle = async (): Promise<void> => {
      if (event.defaultPrevented || tag.isConnected) {
        return
      }
      const left = this.tags.map((one) => this.valueFor(one))
      const pruned = prunedValue(this.written, this.valueFor(tag), left)
      if (pruned !== this.written) {
        this.value = pruned
        this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
      }
      const active = document.activeElement
      if (!had || (active !== null && active !== document.body)) {
        return
      }
      /* Tags remain and every one is disabled, so none took focus from the
         dismissed one: the first, which holds the stop, takes it. */
      const [first] = this.tags
      if (first) {
        if (this.reachable.length === 0) {
          this.sync()
          first.focusItem()
        }
        return
      }
      this.requestUpdate()
      await this.updateComplete
      this.renderRoot.querySelector<HTMLElement>('[part~="empty"]')?.focus()
    }
    queueMicrotask(() => void settle())
    requestAnimationFrame(() => void settle())
  }

  private readonly handleSlotchange = (): void => {
    this.sync()
    this.requestUpdate()
  }

  /** Reads a tag again once it upgrades, so it takes its role and its place. */
  protected readonly upgradeWatch = new UpgradeController(this, this.handleSlotchange)

  /* Wherever the reader lands, by key or by pointer, holds the stop next. */
  private readonly handleFocusin = (event: FocusEvent): void => {
    const tag = this.tagOf(event)
    if (tag && tag !== this.last) {
      this.last = tag
      this.sync()
    }
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('keydown', this.handleKeydown)
    this.addEventListener('click', this.handleClick)
    this.addEventListener('focusin', this.handleFocusin)
    this.addEventListener('helix-dismiss', this.handleDismiss)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('keydown', this.handleKeydown)
    this.removeEventListener('click', this.handleClick)
    this.removeEventListener('focusin', this.handleFocusin)
    this.removeEventListener('helix-dismiss', this.handleDismiss)
  }

  /**
   * Whether the group is known to hold no tags, which a server and a
   * hydrating render cannot know: there it holds whatever it was given.
   */
  private get empty(): boolean {
    return this.childrenKnown && this.tags.length === 0
  }

  /* The set is a grid of rows, said through `ElementInternals` so nothing is
     written onto the host. `willUpdate`, which a server calls too. A grid with
     no rows is no grid, so an emptied set is a group of nothing. */
  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed)
    const empty = this.empty
    hostAria(this.internals, { label: this.label, role: empty ? 'group' : 'grid' })
    this.internals.ariaMultiSelectable = this.selectionMode === 'multiple' && !empty ? 'true' : null
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed)
    this.sync()
  }

  protected override render(): TemplateResult {
    /* A tag arriving or leaving changes who holds the stop, and whether the
       set is empty. The `empty` part only while it is, so a set of tags
       renders what it did. */
    const empty = this.empty
      ? html`<div part="empty" tabindex="-1"><slot name="empty">${this.emptyLabel}</slot></div>`
      : nothing
    return html`<slot @slotchange=${this.handleSlotchange}></slot>${empty}`
  }
}

/** The keys that move focus between tags, which Shift turns into a range. */
const MOVES = new Set(['ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'End', 'Home'])

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-tag-group': HelixHeadlessTagGroup
  }
}

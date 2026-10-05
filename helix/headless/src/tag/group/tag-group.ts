import {
  commaList,
  customElement,
  deepActiveElement,
  deepContains,
  HelixBeforeChangeEvent,
  HelixElement,
  hostAria,
  KeyboardNavigationController,
  type NavigableItem,
  requestChange,
  rovingStop,
  slottedWords,
  typeaheadBy,
  whenHydrated,
} from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { HelixHeadlessTag } from '../root/tag-root.js'
import { pressedValue, prunedValue, type TagSelectionMode } from '../selection.js'

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
 * `single` selects one at a time and `multiple` any number. `value` holds the
 * selected tags' values, separated by commas, and a change asks with
 * `helix-before-change` and tells with `change`. Enter on a tag with an
 * `href` follows its link. A `disabled` tag is passed over. A selected tag
 * that is removed leaves `value`, which then sends `change`.
 *
 * Name the set with `label`. Each tag is named by its words alone, without
 * its remove button.
 *
 * **Removing the last tag keeps focus in the group.** With no tags left the
 * set is a `group`, and focus moves to its `empty` part,
 * which holds the `empty` slot: put words there such as "No filters" for a
 * reader to hear.
 *
 * @since 0.1.0
 * @status stable
 * @aliases Tag list, Chip group, Token list
 * @documentation https://fusion.dev/helix/components/tag
 *
 * @slot - The tags, in the order they are read.
 * @slot empty - Shown in place of the tags while there are none, such as "No filters".
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
   * The name of the set, such as "Filters", which a screen reader announces
   * before its tags.
   */
  @property()
  label = ''

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
  value = ''

  /** The tag the reader was last on, which keeps the tab stop. */
  private last: HelixHeadlessTag | undefined

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
    typeahead: typeaheadBy((item) => (item as NavigableItem & { words: string }).words),
    wrap: false,
  })

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
  private navigable(tag: HelixHeadlessTag): NavigableItem & { words: string } {
    return {
      contains: (node) => tag.contains(node),
      disabled: tag.disabled,
      focusItem: () => tag.focusItem(),
      select: () => {},
      selected: false,
      words: tag.words,
    }
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
    const chosen = new Set(commaList(this.value))
    const tags = this.tags
    const items = tags.map((tag) => ({
      disabled: tag.disabled,
      selected: chosen.has(this.valueFor(tag)),
      tag,
    }))
    const holder = rovingStop(
      items,
      items.find((item) => item.tag === this.last),
      { disabled: (item) => item.disabled, selected: (item) => item.selected },
    )?.tag
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
  protected press(tag: HelixHeadlessTag): void {
    const mode = this.selectionMode ?? 'none'
    if (mode === 'none' || tag.disabled) {
      return
    }
    requestChange({
      apply: (value) => {
        this.value = value
        this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
      },
      event: (value) => new HelixBeforeChangeEvent({ value }),
      host: this,
      next: pressedValue(mode, this.value, this.valueFor(tag)),
    })
  }

  private readonly handleKeydown = (event: KeyboardEvent): void => {
    const tag = this.tagOf(event)
    if (!tag || tag.disabled || event.altKey || event.ctrlKey || event.metaKey) {
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
      this.press(tag)
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
      this.press(tag)
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
      const pruned = prunedValue(this.value, this.valueFor(tag), left)
      if (pruned !== this.value) {
        this.value = pruned
        this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
      }
      const active = document.activeElement
      if (!had || this.tags.length > 0 || (active !== null && active !== document.body)) {
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
      ? html`<div part="empty" tabindex="-1"><slot name="empty"></slot></div>`
      : nothing
    return html`<slot @slotchange=${this.handleSlotchange}></slot>${empty}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-tag-group': HelixHeadlessTagGroup
  }
}

import {
  AriaForwardController,
  closestInstance,
  commaList,
  customElement,
  HelixElement,
  inlineStep,
  keyClaimed,
  MixinCollection,
  MixinControllerActive,
  scrollItemIntoView,
  selectsAll,
  slottedWords,
  Typeahead,
  treeArrow,
  typesCharacter,
  whenHydrated,
} from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { HelixHeadlessTreeItem } from '../item/tree-item.js'
import { type CheckableRow, checkedState, pressRow } from '../selection.js'

/** Keys the tree handles, per the APG tree pattern. */
const KEYS = new Set([
  'ArrowDown',
  'ArrowUp',
  'ArrowRight',
  'ArrowLeft',
  'Home',
  'End',
  'Enter',
  ' ',
])

/**
 * @summary A hierarchy of items, with branches that open and close.
 *
 * @description
 * The tree is a single tab stop, and arrow keys move focus between items, as
 * the tree pattern requires, so Tab moves past a long sidebar in one press. The
 * tree moves the tab stop to the focused item, so the browser's focus order
 * stays intact.
 *
 * Items are found with `instanceof`, never by tag name, so the headless tier
 * does not depend on the styled one.
 *
 * Typing a letter moves to the next visible item whose name starts with it,
 * and `*` opens every branch beside the focused item.
 *
 * `selection-mode="multiple"` draws a check mark on every row and lets a
 * reader check many, as Web Awesome's and Ark UI's checkbox trees do. Checking
 * a branch checks every item under it, and a branch some of whose items are
 * checked is partly checked. Space or a press on the mark checks the focused
 * row, and Enter or a press on a branch's row opens it. `active` then holds the
 * checked values, comma separated, which `values` also gives as a list, and
 * the tree says `aria-multiselectable`.
 *
 * `selection-mode="leaf"` chooses one item at a time and only the items at the
 * ends: a press, Enter or Space on a branch opens or closes it and chooses
 * nothing, as Web Awesome's `leaf` mode does.
 *
 * Keys: Up and Down Arrow move between the items a reader can see; Right
 * Arrow opens a shut branch and then moves into it, and Left Arrow shuts an
 * open one and then moves to its parent, the two swapping on a right-to-left
 * page. Home and End go to the first and the last item, Enter and Space choose
 * or open, and the tree's one tab stop stays on the item last reached. In a
 * tree of check marks, Control+A (Command+A on an Apple keyboard) checks every
 * item or clears them all, and Shift with Up or Down Arrow moves and checks.
 *
 * @since 0.1.0
 * @status stable
 * @category navigation
 * @aliases FileTree, Navigation tree
 * @documentation https://fusion.dev/helix/components/tree
 *
 * @slot - The tree's items.
 *
 * @event {HelixActivateEvent} helix-activate - Fired after the current node changes, so the tree already holds the new one.
 * @event {HelixBeforeActivateEvent} helix-before-activate - Fired before the current node changes, and cancelable. Canceling it is the only way to stop the change.
 * @event {HelixSelectEvent} helix-select - Fired when an item is chosen. The item sends it, and you can listen for it on the tree. Cancelable: canceling it changes nothing.
 *
 * @csspart empty - Shown when there are no rows to show.
 * @csspart live - A copy of the empty and loading messages, in a live region that announces them when they change. Visually hidden in the styled tier.
 * @csspart loading - Shown while the rows load.
 * @csspart tree - The tree container.
 */
@customElement('helix-headless-tree')
export class HelixHeadlessTree extends MixinCollection(MixinControllerActive(HelixElement)) {
  /**
   * Accessible name for the tree.
   *
   * An `aria-label` or `aria-labelledby` on the host names the tree too, and
   * wins over this.
   */
  @property()
  label = 'Tree'

  /** Carries a host `aria-label` and `aria-labelledby` to the tree. */
  protected readonly aria = new AriaForwardController(this, {
    label: true,
    target: () => this.partNamed('tree'),
  })

  /** The letters typed so far, for moving to an item by its name. */
  private readonly typeahead = new Typeahead()

  /**
   * What a deeper level means: `peer` for no change, `subordinate` for a lower
   * rank, or `heading` for a parent that heads the items under it.
   *
   * All three answers are right, for different trees, which is why this is
   * asked rather than decided. `peer` is a file explorer: every row is the same
   * kind of thing, a name that may hold more names, and the indent alone says
   * where one sits. `subordinate` is side navigation or a categorization: a
   * section holds pages and a facet holds values, so a step inward is a change
   * of kind and the rows say so. `heading` is a documentation sidebar, where
   * the change is at the *parent*: "Getting started" is not a lesser page than
   * the pages under it and not a page at all, it is the name of the list, so
   * the branch takes the rail-heading treatment and its children stay at the
   * size every other row is.
   *
   * `subordinate` and `heading` are not the same answer said twice. One keys on
   * depth and quiets the child; the other keys on holding children and relabels
   * the parent, so a top-level leaf beside a branch is untouched by the first
   * and untouched by the second for opposite reasons.
   *
   * On the root rather than the item, because it is a fact about the tree. Set
   * per row it would make a tree writable in which one branch ranks its
   * children and the next does not, and it would have to be repeated on every
   * row to say one thing.
   *
   * Here rather than on the styled tier, because it is not about paint: with
   * every stylesheet deleted it is still true that this tree ranks its depths,
   * that this one heads them, and that a file explorer does neither. The styled
   * tier steps a subordinate row once down the type scale and sets a heading
   * branch as a label; a headless consumer reads the attribute and the
   * `--tree-level` each row carries, and draws either however they like.
   *
   * **Optional, with no default**, per the reflected-property rule: a value
   * written here appears in the served markup of every tree anybody renders.
   * The resting state is the absence of the attribute, which is `peer`.
   */
  @property({ reflect: true })
  nesting?: 'heading' | 'peer' | 'subordinate'

  /**
   * Whether a reader can check many items, or choose only the items at the
   * ends. Unset, one item is chosen at a time, branches included.
   *
   * Optional, so a tree of one choice writes no attribute onto the host.
   */
  @property({ attribute: 'selection-mode', reflect: true })
  selectionMode?: 'leaf' | 'multiple'

  /**
   * The checked values, as a list, under `selection-mode="multiple"`, and the
   * chosen value alone otherwise. Writing it sets `active`.
   */
  get values(): string[] {
    return this.multiple ? commaList(this.active) : this.active === '' ? [] : [this.active]
  }

  set values(next: string[]) {
    this.active = next.join(',')
  }

  /** Whether many items can be checked. */
  private get multiple(): boolean {
    return this.selectionMode === 'multiple'
  }

  private watcher: MutationObserver | undefined

  /**
   * Every item, in the order a reader moving down would meet them.
   *
   * **By identity rather than by tag**, which is the same reason Splitter
   * writes out at `findOuter`: a tag list names one tier's element from the
   * other's package, and misses any third tag, which is exactly what
   * subclassing an item produces. The item then never enters the array a single
   * arrow press rebuilds, so it is silently unreachable from the keyboard.
   *
   * `'*'` and a filter rather than a tag: the walk is one native pass and the
   * `instanceof` is what narrows it, so the labels, icons and whatever a
   * consumer slotted into a row are gone by the time the array exists.
   */
  private get items(): HelixHeadlessTreeItem[] {
    return [...this.querySelectorAll('*')].filter(
      (node): node is HelixHeadlessTreeItem => node instanceof HelixHeadlessTreeItem,
    )
  }

  /** Items a reader can actually reach: not inside a collapsed branch. */
  private get visibleItems(): HelixHeadlessTreeItem[] {
    return this.items.filter((item) => {
      let parent = item.parentElement
      while (parent && parent !== this) {
        if (parent instanceof HelixHeadlessTreeItem && !parent.open) {
          return false
        }
        parent = parent.parentElement
      }
      return true
    })
  }

  /* Through the mixin, so a consumer can refuse the change. Writing the value
     straight from the event makes `helix-before-activate` an announcement
     nobody can answer.

     **And only if the item's own choice stood.** `helix-select` is cancelable
     and the item documents it as refusable; this element is the only thing that
     acts on it, so a refusal nothing read was a veto that did nothing. The rows
     are still synced either way: what a refusal stops is the selection moving,
     not the tree redrawing what it already holds. */
  private readonly handleSelection = (event: Event): void => {
    /* Only a choice made by one of this tree's own items. A menu in a row's
       `end` slot sends `helix-select` too, and it bubbles out of the row. */
    const origin = event.target
    if (!(origin instanceof HelixHeadlessTreeItem) || !this.items.includes(origin)) {
      return
    }
    if (!event.defaultPrevented) {
      this.requestActive(
        this.multiple
          ? pressRow(this.rowOf(origin), this.values, this.order).join(',')
          : (event as CustomEvent<{ value: string }>).detail.value,
      )
    }
    this.syncItems()
  }

  /** Every value in the tree, in the order a reader meets the items. */
  private get order(): string[] {
    return this.items.map((item) => item.value).filter((value) => value !== '')
  }

  /**
   * Whether an item holds others, read from the tree as well as from the item.
   *
   * **An item hydrating what a server sent has not said it is a branch yet**:
   * it learns that from its children on the render after, and nothing then
   * asks the tree again. Read from its own render alone, a folder served with
   * one of its files checked was counted a leaf and drawn unchecked rather
   * than partly checked, once hydrated.
   */
  private holds(item: HelixHeadlessTreeItem): boolean {
    return item.isBranch || this.items.some((other) => other !== item && item.contains(other))
  }

  /** What the multiple selection reads of an item. */
  private rowOf(item: HelixHeadlessTreeItem): CheckableRow {
    const branch = this.holds(item)
    const leaves = branch
      ? this.items
          .filter(
            (other) =>
              other !== item &&
              item.contains(other) &&
              !this.holds(other) &&
              !other.disabled &&
              other.value !== '',
          )
          .map((other) => other.value)
      : []
    return { branch, disabled: item.disabled, leaves, value: item.value }
  }

  /**
   * Pushes tree-owned state down: which item is selected, which holds the tab
   * stop, and how deep each one sits.
   *
   * Depth is computed here rather than by each item counting its own ancestors,
   * so an item moved in the tree gets the right indent without knowing it moved.
   */
  private syncItems(): void {
    const visible = this.visibleItems
    /* Through the mixin, which resolves an exact match and otherwise falls back
       to the first item that is not disabled. */
    const chosen = this.resolveActive(visible)
    /* The keyboard keeps its place: the stop moves only when the row holding it
       is no longer reachable. Bound to the selection instead, a branch opening
       or a child arriving throws the reader back to the selected row from
       wherever they had arrowed to. */
    /* A stop inside a branch that has just closed goes to the nearest row
       still showing above it, which is where a reader who closed the branch
       is. */
    const held =
      visible.find((item) => item.focusable) ??
      this.visibleAncestor(this.items.find((item) => item.focusable))
    const stop = held ?? chosen
    /* A branch under `leaf` is not chosen, which is what heading a list
       already means to an item. */
    const heads = this.nesting === 'heading' || this.selectionMode === 'leaf'
    const multiple = this.multiple
    const checked = new Set(this.values)

    for (const item of this.items) {
      const selected = !multiple && item.value !== '' && item.value === this.active
      const state = multiple ? checkedState(this.rowOf(item), checked) : false
      const focusable = item === stop
      let level = 1
      let parent = item.parentElement
      while (parent && parent !== this) {
        if (parent instanceof HelixHeadlessTreeItem) {
          level += 1
        }
        parent = parent.parentElement
      }
      /* Not into a row still hydrating what a server sent: see `whenHydrated`.
         `Steps` writes into its children the same way, and here the write is
         load-bearing rather than tidy. A row serves no `aria-level` at all,
         because a server cannot count ancestors it has no tree to walk; landed
         in the hydrating render, the depth is primed as the committed value and
         never written, so the attribute would be missing for the life of the
         page. Waiting for that render lets the one after it write the depth. */
      whenHydrated(item, () => {
        item.selected = selected
        item.checkable = multiple
        item.checked = state
        item.focusable = focusable
        item.level = level
        item.heads = heads
      })
    }
  }

  /** The nearest item around `item` that a reader can see, if any. */
  private visibleAncestor(
    item: HelixHeadlessTreeItem | undefined,
  ): HelixHeadlessTreeItem | undefined {
    const visible = this.visibleItems
    let node = item?.parentElement ?? null
    while (node && node !== this) {
      if (node instanceof HelixHeadlessTreeItem && visible.includes(node)) {
        return node
      }
      node = node.parentElement
    }
    return undefined
  }

  /**
   * Moves to the next visible item whose name starts with the letters typed,
   * or opens every branch beside the focused item on `*`.
   *
   * Returns whether the press was one of those.
   */
  private handleTyping(current: HelixHeadlessTreeItem, event: KeyboardEvent): boolean {
    if (!typesCharacter(event) || keyClaimed(event)) {
      return false
    }
    if (event.key === ' ' && !this.typeahead.typing()) {
      return false
    }
    if (event.key === '*') {
      const siblings = [...(current.parentElement?.children ?? [])].filter(
        (node): node is HelixHeadlessTreeItem =>
          node instanceof HelixHeadlessTreeItem && node.slot === current.slot,
      )
      for (const sibling of siblings) {
        if (sibling.isBranch && !sibling.open) {
          sibling.requestOpen(true)
        }
      }
      this.syncItems()
      return true
    }
    const visible = this.visibleItems
    const at = this.typeahead.match(
      event.key,
      visible.map((item) => slottedWords(item, [''])),
      visible.indexOf(current),
    )
    if (at >= 0) {
      this.focusOn(visible[at])
    }
    return true
  }

  /**
   * The keys of a tree of check marks, as the tree pattern gives them:
   * Control+A (Command+A on an Apple keyboard) checks every item, or clears
   * them all where every one is checked, and Shift with Up or Down Arrow moves
   * to the item before or after and checks or unchecks it.
   *
   * Returns whether the press was one of those.
   */
  private handleMultiple(current: HelixHeadlessTreeItem, event: KeyboardEvent): boolean {
    if (selectsAll(event)) {
      const leaves = this.items
        .filter((item) => !this.holds(item) && !item.disabled && item.value !== '')
        .map((item) => item.value)
      this.requestActive(
        pressRow(
          { branch: true, disabled: false, leaves, value: '' },
          this.values,
          this.order,
        ).join(','),
      )
      this.syncItems()
      return true
    }
    if (event.shiftKey && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      const visible = this.visibleItems
      const next = visible[visible.indexOf(current) + (event.key === 'ArrowDown' ? 1 : -1)]
      if (next) {
        this.focusOn(next)
        next.select()
      }
      return true
    }
    return false
  }

  private move(from: HelixHeadlessTreeItem, delta: number): void {
    const visible = this.visibleItems
    const index = visible.indexOf(from)
    const next = visible[Math.min(visible.length - 1, Math.max(0, index + delta))]
    this.focusOn(next)
  }

  private focusOn(item: HelixHeadlessTreeItem | undefined): void {
    if (!item) {
      return
    }
    for (const entry of this.items) {
      entry.focusable = entry === item
    }
    item.focusItem()
    /* And bring it into view, or focus lands below the fold and the tree stays
       where it is.

       Not `scrollIntoView`, which scrolls every scrollable ancestor including
       the page. A reader who pressed Down in a sidebar did not ask the document
       to move. */
    scrollItemIntoView(item, { padding: 4 })
  }

  private readonly handleKeydown = (event: KeyboardEvent): void => {
    /* The innermost item the press came from, which `find` cannot give.
     *
     * `items` is every tree item in document order and a nested one is inside
     * all of its ancestors, so `entry.contains(target)` matches the outermost
     * ancestor first and every key pressed on a nested node moves the root of
     * its branch instead. The shallow cases all look right.
     *
     * `closestInstance` walks up by identity and crosses shadow roots on the
     * way, which is the util that exists for exactly this. `closest('*')` is a
     * no-op: it returns the element it was called on. */
    const current = closestInstance(event.target as Element | null, HelixHeadlessTreeItem)
    if (!current || !this.items.includes(current)) {
      return
    }
    if (this.multiple && this.handleMultiple(current, event)) {
      event.preventDefault()
      return
    }
    if (this.handleTyping(current, event)) {
      event.preventDefault()
      return
    }
    if (!KEYS.has(event.key)) {
      return
    }
    this.typeahead.reset()

    /* In and out are along the line, which is where a shut branch's chevron
       points: right on a left-to-right page and left on a right-to-left one,
       so the key that opens a branch is the one its chevron points along. */
    const along = inlineStep(this, event.key)

    /* Space checks the row in a tree of check marks, and leaves a branch open
       or shut: Enter is what opens one there. */
    if (this.multiple && event.key === ' ') {
      current.select()
      event.preventDefault()
      return
    }

    if (event.key === 'ArrowDown') {
      this.move(current, 1)
    } else if (event.key === 'ArrowUp') {
      this.move(current, -1)
    } else if (event.key === 'Home') {
      this.focusOn(this.visibleItems[0])
    } else if (event.key === 'End') {
      this.focusOn(this.visibleItems.at(-1))
    } else if (along !== 0) {
      // Open a closed branch, then step into it. Two presses rather than one
      // that does both, which is what the pattern specifies.
      const arrow = treeArrow(
        { branch: current.isBranch, disabled: current.disabled, open: current.open },
        along,
      )
      if (arrow === 'open' || arrow === 'close') {
        current.requestOpen(arrow === 'open')
        this.syncItems()
      } else if (arrow === 'child') {
        this.move(current, 1)
      } else if (arrow === 'parent') {
        const parent = closestInstance(current.parentElement, HelixHeadlessTreeItem)
        this.focusOn(parent instanceof HelixHeadlessTreeItem ? parent : undefined)
      }
    } else {
      if (current.isBranch) {
        if (current.choosable) {
          current.select()
        }
        current.toggleOpen()
        this.syncItems()
      } else {
        /* `activate`, not `select`. Announcing the choice and stopping there
           leaves a tree used as navigation walkable with the arrows and never
           enterable: the pointer has a link under it and the keyboard has
           nothing. */
        current.activate()
      }
    }

    event.preventDefault()
  }

  /**
   * A branch opened or closed, whoever did it.
   *
   * Listening for the item's own `toggle` rather than calling `syncItems` from
   * each keyboard path: that misses the pointer, and collapsing a branch by
   * clicking its row then left the tree's one tab stop on a row inside the
   * subtree just hidden, so Tab passed over the tree. It also covers a
   * consumer setting `open` directly.
   *
   * **In capture**, because `toggle` does not bubble, which is the platform's
   * shape for it. The `helix-before-*` pair this listened for does not bubble
   * either, and is sent before the branch has moved.
   */
  private readonly handleBranch = (): void => {
    this.syncItems()
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('helix-select', this.handleSelection)
    this.addEventListener('toggle', this.handleBranch, true)
    this.addEventListener('keydown', this.handleKeydown)
    /* Nested items arrive on a *branch's* slot, not on this element's, so the
       root's `slotchange` never fires for them: without this, a subtree
       rendered after first paint gets no `level`, no `selected` and no
       `focusable`, and sits at the wrong indent with no way into it. A
       framework filling a branch on demand is exactly that case. */
    this.watcher = new MutationObserver(() => this.syncItems())
    this.watcher.observe(this, { childList: true, subtree: true })
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('helix-select', this.handleSelection)
    this.removeEventListener('toggle', this.handleBranch, true)
    this.removeEventListener('keydown', this.handleKeydown)
    this.watcher?.disconnect()
    this.watcher = undefined
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.syncItems()
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    if (changed.has('active') || changed.has('nesting') || changed.has('selectionMode')) {
      this.syncItems()
    }
  }

  protected override render(): TemplateResult {
    return html`<div
      part="tree"
      role="tree"
      aria-busy=${this.loading ? 'true' : nothing}
      aria-multiselectable=${this.multiple ? 'true' : nothing}
      aria-label=${this.label}
    >
      <slot
        @slotchange=${(event: Event) => {
          this.countRows(event)
          this.syncItems()
        }}
      ></slot>
      ${this.renderStatus(this.hasRows)}
    </div>${this.renderLive(this.hasRows)}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-tree': HelixHeadlessTree
  }
}

import {
  customElement,
  deepActiveElement,
  deepContains,
  focusableElements,
  HelixElement,
  hostAria,
} from '@fusion.dev/helix-core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary The region that holds toast messages, and the only element that announces them.
 *
 * @description
 * The region and its items are one family because a live region must be in the
 * document before a message is added to it. Assistive technology often does not
 * announce a region that arrives already holding its message. `Radio.Group` is
 * part of its family for the same reason.
 *
 * **The region is polite, never assertive.** `role="alert"` interrupts whatever
 * a screen reader is reading. For something that cannot wait, use a `Dialog`,
 * which stops the page for every user.
 *
 * **The region never creates or removes items.** You render items and remove
 * them. An item requests closing with a cancelable `helix-dismiss` event. A
 * dismissed item hides itself and stays in the DOM, so your framework's state
 * and the DOM stay in sync. It hides on its own unless you set `open`, which
 * makes the state yours.
 *
 * There is no `toast.show()`. For a `toast()` function, write a small one over
 * your app's state, which also lets you render the same messages on the server,
 * in a test, or more than once.
 *
 * **The stack is in the top layer.** The `region` part is a `popover="manual"`
 * shown while a message is showing, and shown again above a modal dialog that
 * opened after it. Position the `region` part, which is the box in the top
 * layer. While a modal `Dialog`, `Drawer` or `Lightbox` is open, the browser
 * makes everything outside it inert, the stack included, so a message stays
 * visible and its actions cannot be pressed. Where the browser has
 * `ariaNotify`, a message that arrives then is announced through it. For a
 * message with an action, render a second region inside the dialog.
 *
 * When a message with focus inside it is dismissed, focus moves to the next
 * message, then the one before it, then back to where it was before it entered
 * the stack.
 *
 * @since 0.1.0
 * @status stable
 * @category overlays
 * @aliases Toaster, Snackbar
 * @documentation https://fusion.dev/helix/components/toast
 *
 * @slot - The messages.
 *
 * @event {HelixDismissEvent} helix-dismiss - A message is being dismissed, by its control or by its timer. The message sends it, and you can listen for it on the region. Cancelable: canceling it keeps the message.
 *
 * @csspart region - The stack the messages are in. It is in the top layer while a message shows.
 */
@customElement('helix-headless-toast')
export class HelixHeadlessToast extends HelixElement {
  /**
   * Accessible name for the region, such as "Notifications".
   */
  @property()
  label = 'Notifications'

  /**
   * Which corner or edge the stack sits at.
   *
   * Named here rather than on each message, because where a page puts its
   * toasts is a fact about the page: a stack whose members disagreed about
   * where they were would not be a stack.
   *
   * **Six corners in one word, where `Carousel` splits the same question in
   * two.** That family takes a placement and an alignment, and argues at its own
   * declaration that one attribute naming both facts multiplies rather than
   * composing. It is right there and wrong here, and the difference is the
   * shape of the product. A carousel's is ragged: its `overlay` belongs to no
   * edge at all, and its two groups of chrome move independently, shipping
   * different defaults so they do not land on each other, which is what makes
   * rewriting one to move the other a real cost. A stack's is two edges by
   * three alignments, every pair real and every pair named this way by every
   * toast a reader has already met. Fusing spells the domain out and loses
   * nothing; a stack has one position and takes it once.
   *
   * **Optional, and bottom-end is the absence of it.** Reflecting *and*
   * defaulting is the pair that writes onto a host: every toast region anybody
   * rendered would gain a `placement="bottom-end"` nobody typed, which a React
   * consumer's server markup does not have. A sheet carries the resting
   * arrangement in its own `:host` rule and the selectors describe only the
   * departures, which is what `orientation` does.
   */
  @property({ reflect: true })
  placement?:
    | 'bottom-center'
    | 'bottom-end'
    | 'bottom-start'
    | 'top-center'
    | 'top-end'
    | 'top-start'

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    /* On the host through internals, so the region is a landmark to anything
       walking the light DOM as well as to a screen reader, and so nothing is
       written onto the host as an attribute a server's markup never had. */
    hostAria(this.internals, { label: this.label, role: 'status' })
    this.internals.ariaLive = 'polite'
    /* Additions are what a reader needs; a message going away is not news, and
       announcing removals means every dismissal is read out. */
    this.internals.ariaRelevant = 'additions'
    /* `role="status"` carries an implicit `aria-atomic="true"`, which means the
       whole region is re-read whenever any part of it changes. With a stack of
       four, the fifth arrival announces all five. `additions` alone does not
       help: it says which mutations count, not how much is read out when one
       does. Both are needed, and only one was here. */
    this.internals.ariaAtomic = 'false'
  }

  /** The element focus came from when it entered the stack. */
  private focusOrigin: HTMLElement | undefined

  /** Watches the messages arrive and hide, to raise or lower the stack. */
  private watcher: MutationObserver | undefined

  /** The messages that are showing, in order. */
  private get showing(): HTMLElement[] {
    return [...this.children].filter(
      (one): one is HTMLElement => one instanceof HTMLElement && !one.hidden,
    )
  }

  private get region(): HTMLElement | null {
    return this.partNamed('region')
  }

  /**
   * Puts the stack in the top layer while a message shows, and on top of it.
   *
   * Shown again when a message arrives under a modal opened after it, because
   * the top layer is ordered by when each element entered it. Only then,
   * because showing it again starts every message's entrance over.
   */
  private place(added: readonly Node[] = []): void {
    const region = this.region
    if (!region || typeof region.showPopover !== 'function') {
      return
    }
    const showing = this.showing
    const open = popoverOpen(region)
    if (showing.length === 0) {
      if (open) {
        this.lowerWhenStill(region)
      }
      return
    }
    const arrived = added.filter(
      (one): one is HTMLElement => one instanceof HTMLElement && showing.includes(one),
    )
    const blocked = arrived.length > 0 && this.blocked()
    if (open && blocked) {
      region.hidePopover()
    }
    if (!open || blocked) {
      region.showPopover()
    }
    if (blocked) {
      this.notify(arrived)
    }
  }

  /**
   * Takes the stack out of the top layer once the last message has finished
   * leaving. Hidden at once, the stack would cut the exit short.
   */
  private lowerWhenStill(region: HTMLElement): void {
    const running =
      typeof this.getAnimations === 'function' ? this.getAnimations({ subtree: true }) : []
    void Promise.allSettled(running.map((one) => one.finished)).then(() => {
      if (this.showing.length === 0 && popoverOpen(region)) {
        region.hidePopover()
      }
    })
  }

  /**
   * Whether a modal dialog this stack is not inside is open, which makes the
   * stack inert.
   *
   * Two places to look: the modal `Dialog` and `Drawer` the scroll lock
   * records, whose `<dialog>` is in a shadow root, and an open modal `<dialog>`
   * in the document itself.
   */
  private blocked(): boolean {
    const lock = (globalThis as unknown as Record<symbol, { holders: Set<Element> } | undefined>)[
      Symbol.for('fusion.helix.scroll-lock')
    ]
    const holders = [...(lock?.holders ?? [])]
    try {
      const native = document.querySelector('dialog:modal')
      if (native) {
        holders.push(native)
      }
    } catch {
      // A document that cannot parse `:modal` has no modal dialog to find.
    }
    return holders.some((holder) => !deepContains(holder, this))
  }

  /**
   * Announces messages that arrived while the live region is inert.
   *
   * `ariaNotify` speaks without a live region in the accessibility tree, which
   * is the one channel left under a modal. A browser without it says nothing,
   * as it did before.
   */
  private notify(arrived: readonly HTMLElement[]): void {
    const speaker = document as Document & { ariaNotify?: (announcement: string) => void }
    if (typeof speaker.ariaNotify !== 'function') {
      return
    }
    for (const one of arrived) {
      const words = (one.textContent ?? '').replace(/\s+/gu, ' ').trim()
      if (words !== '') {
        speaker.ariaNotify(words)
      }
    }
  }

  /** Remembers where focus came from when it enters the stack. */
  private readonly handleFocusIn = (event: FocusEvent): void => {
    const from = event.relatedTarget
    if (from instanceof HTMLElement && !deepContains(this, from)) {
      this.focusOrigin = from
    }
  }

  /**
   * Keeps focus on the stack when the message holding it goes.
   *
   * Read after the item's update, because the dismissal is a request a
   * listener after this one can still refuse. A refused one leaves the
   * message, and focus with it.
   */
  private readonly handleDismiss = (event: Event): void => {
    const item = event.target
    if (!(item instanceof HTMLElement) || item.parentElement !== this) {
      return
    }
    if (!item.matches(':focus-within')) {
      return
    }
    const before = this.showing
    const at = before.indexOf(item)
    /* A microtask first: the item applies the dismissal after this event has
       been dispatched, and only then is there an update to wait for. */
    void Promise.resolve()
      .then(() => (item as Partial<{ updateComplete: Promise<unknown> }>).updateComplete)
      .then(() => {
        if (!item.hidden) {
          return
        }
        const active = deepActiveElement()
        if (active && active !== document.body && !deepContains(item, active)) {
          return
        }
        const after = before.slice(at + 1).filter((one) => !one.hidden)
        const earlier = before
          .slice(0, at)
          .filter((one) => !one.hidden)
          .reverse()
        for (const next of [...after, ...earlier]) {
          const target = focusTarget(next)
          if (target) {
            target.focus()
            return
          }
        }
        if (this.focusOrigin?.isConnected) {
          this.focusOrigin.focus()
        }
      })
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('focusin', this.handleFocusIn)
    this.addEventListener('helix-dismiss', this.handleDismiss)
    this.watcher = new MutationObserver((records) => {
      this.place(records.flatMap((record) => [...record.addedNodes]))
    })
    this.watcher.observe(this, {
      attributeFilter: ['hidden'],
      attributes: true,
      childList: true,
      subtree: true,
    })
    if (this.hasUpdated) {
      this.place()
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('focusin', this.handleFocusIn)
    this.removeEventListener('helix-dismiss', this.handleDismiss)
    this.watcher?.disconnect()
    this.watcher = undefined
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.place()
  }

  protected override render(): TemplateResult {
    return html`<div part="region" popover="manual"><slot></slot></div>`
  }
}

/** Whether a popover is showing, asked where the selector may not parse. */
const popoverOpen = (region: HTMLElement): boolean => {
  try {
    return region.matches(':popover-open')
  } catch {
    return false
  }
}

/**
 * Where focus goes in a message: its dismiss control, or the first thing in
 * it that takes focus.
 */
const focusTarget = (item: HTMLElement): HTMLElement | null =>
  item.shadowRoot?.querySelector<HTMLElement>('[part="dismiss"]') ??
  focusableElements(item)[0] ??
  null

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-toast': HelixHeadlessToast
  }
}

import {
  customElement,
  DelayController,
  deepActiveElement,
  deepContains,
  FocusScopeController,
  fillTemplate,
  focusableElements,
  HelixElement,
  hostAria,
  scrollHolders,
} from '@fusion.dev/helix-core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { matchesHotkey, parseHotkey } from '../hotkey.js'
import { messageWords } from '../words.js'

/**
 * @summary The region that holds toast messages, and the only element that announces them.
 *
 * @description
 * The region and its items are one family because a live region must be in the
 * document before a message is added to it. Assistive technology often does not
 * announce a region that arrives already holding its message. `Radio.Group` is
 * part of its family for the same reason.
 *
 * **The region is a landmark named by `label`, and it says each message once
 * as it arrives**: a `danger` message assertively, and every other one
 * politely. It says the word for the tone, the heading, the description and
 * the text, and not the actions, through two live regions of its own, the
 * `live` parts, which it empties again a moment later. The stack itself is not
 * a live region, so a message is never said twice, and changing the words of a
 * message already showing says nothing. Each message is an `alertdialog` named
 * by its words, so a reader who moves into the stack hears which message they
 * are on.
 *
 * **`hotkey` takes focus to the stack and back**, F8 unless you set it, and
 * `label` says which key: `{hotkey}` in it is filled in, so the default name
 * is "Notifications (F8)". Pressed while focus is in the stack, it gives focus
 * back to where it was.
 *
 * **The region never creates or removes items.** You render items and remove
 * them. An item requests closing with a cancelable `helix-dismiss` event. A
 * dismissed item hides itself and stays in the DOM, so your framework's state
 * and the DOM stay in sync. It hides on its own unless you set `open`, which
 * makes the state yours.
 *
 * **`add()` shows a message from script**, for a page with no framework state
 * to render them from: it appends a message of the region's own tier and
 * removes it once it has been dismissed and has finished leaving. Messages
 * you render yourself stay yours, and the region never removes them. A touch
 * or a pen swipes a message away toward the end of the line.
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
 * @csspart live - The two regions that say each message as it arrives, a polite `status` and an assertive `alert`, inside the stack. Empty at rest, and hide them with the standard clip, never `display: none`.
 * @csspart region - The stack the messages are in. It is in the top layer while a message shows, and takes focus from `hotkey` where no message holds a control.
 */
@customElement('helix-headless-toast')
export class HelixHeadlessToast extends HelixElement {
  /**
   * The key that takes focus to the stack and back, such as `F8` or `Alt+T`:
   * keys joined by `+`, the last one the key. Empty turns it off.
   */
  @property()
  hotkey = 'F8'

  /**
   * Accessible name for the region, with `{hotkey}` filled in. Translate it with
   * the rest of your interface.
   */
  @property()
  label = 'Notifications ({hotkey})'

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
    /* A landmark, so a reader finds the stack among the page's regions, and a
       live region as well, which a region may be. */
    /* **A landmark and not a live region.** The stack was a polite one and a
       `danger` message an assertive one inside it, so a danger message was
       news to both and could be said twice. The two `live` parts say each
       arrival once instead, in the voice its tone asks for. */
    hostAria(this.internals, {
      label: fillTemplate(this.label, { hotkey: this.hotkey }),
      role: 'region',
    })
  }

  /** What the polite region is saying. */
  @state()
  private said = ''

  /** What the assertive region is saying. */
  @state()
  private urgent = ''

  /* The regions are emptied a moment after they speak, so a reader moving
     through the stack meets each message once, in the message. */
  private readonly hush = new DelayController(this, { renders: false })

  /**
   * Says messages that have just arrived, each once, `danger` ones assertively.
   *
   * Emptied first and filled a frame later, so a message with the same words
   * as the one before is still a change, and so a region the stack has just
   * shown is in the accessibility tree before its words land.
   */
  private announce(arrived: readonly HTMLElement[]): void {
    const urgent = arrived.filter(isDanger).map(messageWords).join(' ')
    const said = arrived
      .filter((one) => !isDanger(one))
      .map(messageWords)
      .join(' ')
    if (said.trim() === '' && urgent.trim() === '') {
      return
    }
    this.said = ''
    this.urgent = ''
    const fill = (): void => {
      this.said = said
      this.urgent = urgent
      this.hush.start(1000, () => {
        this.said = ''
        this.urgent = ''
      })
    }
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(fill)
    } else {
      fill()
    }
  }

  /**
   * Says the messages that have just arrived: through the regions, or through
   * `ariaNotify` where a modal dialog has made them inert.
   */
  private tell(added: readonly Node[]): void {
    const showing = this.showing
    const arrived = added.filter(
      (one): one is HTMLElement => one instanceof HTMLElement && showing.includes(one),
    )
    if (arrived.length === 0) {
      return
    }
    if (this.blocked()) {
      this.notify(arrived)
    } else {
      this.announce(arrived)
    }
  }

  /** The element focus came from when it entered the stack. */
  private focusOrigin: HTMLElement | undefined

  /* Where the hotkey takes focus: the first control in a showing message, or
     the stack itself. */
  private readonly scope = new FocusScopeController(this, {
    /* Each message's own way in, its dismiss control or the first thing in it
       that takes focus, since a message's control is in its shadow root. */
    contents: () =>
      this.showing.flatMap((one) => {
        const target = focusTarget(one)
        return target ? [target] : []
      }),
    surface: () => this.region,
  })

  /** Takes focus to the stack and back, on `hotkey`. */
  private readonly handleHotkey = (event: KeyboardEvent): void => {
    if (event.defaultPrevented || !matchesHotkey(event, parseHotkey(this.hotkey))) {
      return
    }
    if (this.scope.holdsFocus) {
      event.preventDefault()
      this.scope.leave()
      return
    }
    if (this.showing.length > 0) {
      event.preventDefault()
      this.scope.enter()
    }
  }

  /** Messages `add()` made, which are the region's to remove. */
  private readonly made = new WeakSet<Element>()

  /**
   * Shows a message from script, and returns the element.
   *
   * The message is the region's own tier of `Toast.Item`, appended to the
   * stack, holding `message` as its text. The region removes it once it has
   * been dismissed and has finished leaving, which is the one case where it
   * removes anything: a message you render stays yours.
   *
   * `heading` gives the message a title, which names it, and `message` becomes
   * the line of detail under it. `action` is an element for the message's
   * `actions` slot, such as an Undo button you have wired up.
   */
  add(
    message: string,
    options: {
      action?: Element
      dismissible?: boolean
      duration?: number
      heading?: string
      tone?: 'danger' | 'info' | 'success' | 'warning'
    } = {},
  ): HTMLElement {
    const tier = (this.constructor as typeof HelixElement).tier
    const item = document.createElement(`${tier}toast-item`)
    if (options.heading === undefined) {
      item.textContent = message
    } else {
      item.append(slotted('heading', options.heading), slotted('description', message))
    }
    if (options.action) {
      options.action.setAttribute('slot', 'actions')
      item.append(options.action)
    }
    if (options.tone) {
      item.setAttribute('tone', options.tone)
    }
    if (options.duration !== undefined) {
      item.setAttribute('duration', String(options.duration))
    }
    if (options.dismissible ?? true) {
      item.toggleAttribute('dismissible', true)
    }
    this.made.add(item)
    this.append(item)
    return item
  }

  /** Removes a message `add()` made, once it has hidden and finished leaving. */
  private sweep(): void {
    for (const one of [...this.children]) {
      if (!(one instanceof HTMLElement) || !one.hidden || !this.made.has(one)) {
        continue
      }
      this.made.delete(one)
      const running =
        typeof one.getAnimations === 'function' ? one.getAnimations({ subtree: true }) : []
      void Promise.allSettled(running.map((animation) => animation.finished)).then(() =>
        one.remove(),
      )
    }
  }

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
    const holders = scrollHolders()
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
    const speaker = document as Document & {
      ariaNotify?: (announcement: string, options?: { priority?: 'high' | 'normal' }) => void
    }
    if (typeof speaker.ariaNotify !== 'function') {
      return
    }
    for (const one of arrived) {
      const words = messageWords(one)
      if (words !== '') {
        speaker.ariaNotify(words, { priority: isDanger(one) ? 'high' : 'normal' })
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
    if (!deepContains(item, deepActiveElement())) {
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
    document.addEventListener('keydown', this.handleHotkey)
    this.watcher = new MutationObserver((records) => {
      const added = records.flatMap((record) => [...record.addedNodes])
      this.place(added)
      this.tell(added)
      this.sweep()
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
    document.removeEventListener('keydown', this.handleHotkey)
    this.watcher?.disconnect()
    this.watcher = undefined
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.place()
  }

  protected override render(): TemplateResult {
    /* The regions inside the stack, so they are in the top layer with it and
       take no place on the page. */
    return html`<div part="region" popover="manual" tabindex="-1"><slot></slot><span part="live" role="status">${this.said}</span><span part="live" role="alert">${this.urgent}</span></div>`
  }
}

/** Whether a message is a `danger` one, which is said assertively. */
const isDanger = (item: HTMLElement): boolean =>
  ((item as HTMLElement & { tone?: string }).tone ?? item.getAttribute('tone')) === 'danger'

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

/** A block of words for one of a message's named slots. */
const slotted = (slot: string, words: string): HTMLElement => {
  const element = document.createElement('div')
  element.slot = slot
  element.textContent = words
  return element
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-toast': HelixHeadlessToast
  }
}

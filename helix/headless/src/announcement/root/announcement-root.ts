import {
  ArrivalController,
  ariaChord,
  CountdownController,
  customElement,
  deepActiveElement,
  FocusScopeController,
  HelixElement,
  hostAria,
  MixinDismissible,
  markRegion,
  matchesChord,
  onApple,
  reportRuntime,
  slottedWords,
} from '@fusion.dev/helix-core'
import { x } from '@fusion.dev/helix-icons'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'

/**
 * @summary A message for the whole page, shown above its header, that can be dismissed.
 *
 * @description
 * An announcement is a banner above the page header with news about the whole
 * site or session, such as a trial ending, a degraded service, or a change of
 * terms. For a passage inside a document, use `Callout`, which stays where it
 * is placed and cannot be dismissed.
 *
 * The announcement is always a polite live region, whatever its `tone`.
 * `role="alert"` is assertive and interrupts a screen reader, so an
 * announcement served with the page would interrupt on every page load.
 *
 * The live region is its own part. When the announcement appears after the page
 * has loaded, the message is written into the region one frame later, so screen
 * readers read it reliably, and the region is emptied seven seconds later.
 * While the region holds the copy, the message itself is hidden from screen
 * readers, so it is in the page once. When the announcement is in the served
 * HTML, the region stays empty and nothing is read out.
 *
 * The dismiss button fires `helix-dismiss`, and the announcement stays in the
 * document, so remove it in your listener. The event is cancelable, and
 * `dismiss()` returns `false` when a listener calls `preventDefault()`. When
 * your listener removes an announcement whose dismiss button has focus, focus
 * moves to the dismiss button of the announcement beside it. With no other
 * announcement beside it, move focus yourself, for example to the page's main
 * heading.
 *
 * **The announcement is a landmark region**, named by `label`, "Announcement"
 * unless you set it, so a screen reader lists it among the page's regions.
 * `hotkey`, F6 unless you set it, moves focus to the announcement's first
 * control, an action or the dismiss button, and pressed there moves focus
 * back to where it was, as React Aria's toast region does. An announcement
 * with no control leaves the key to the browser. When an announcement that
 * the key moved focus into is removed with focus still inside, focus goes
 * back to where it was before the key.
 *
 * **Set `queued` to show several announcements one at a time.** A queued
 * announcement waits while a queued announcement before it in the same parent
 * is still there, and shows when that one is removed: its message is then
 * read out, and its `duration` starts. While it waits it renders nothing,
 * is no region, and carries `:state(waiting)`. A server cannot see the
 * announcements beside it, so a served page shows every one until the script
 * runs.
 *
 * Set `duration` to dismiss it after a time. The clock stops while the pointer
 * or focus is on the announcement, and continues from what was left, so a
 * reader partway through is not cut off. It stops while the page is hidden too,
 * in another tab or a minimized window, so the message is not spent where
 * nobody can see it. While the clock is stopped the announcement carries
 * `:state(paused)`. When the time runs out it sends `helix-dismiss`, as the
 * button does.
 *
 * @since 0.1.0
 * @status stable
 * @category feedback
 * @aliases Banner, Notification bar, Alert bar
 * @documentation https://fusion.dev/helix/components/announcement
 *
 * @slot - The message.
 * @slot actions - Actions for the message, usually a link or a button.
 * @slot dismiss-icon - Replaces the cross inside the dismiss button, as `Callout`'s slot of the same name does.
 * @slot icon - Replaces the cross inside the dismiss button. Deprecated: use `dismiss-icon`, which is read first.
 *
 * @event {HelixDismissEvent} helix-dismiss - The dismiss button was pressed, or `duration` ran out. The announcement does not remove itself, so remove it in response. Cancelable.
 *
 * @csspart actions - The region after the message that holds the actions.
 * @csspart content - The region that holds the message.
 * @csspart dismiss - The button that dismisses the announcement.
 * @csspart dismiss-mark - The cross on the dismiss button, shown when the `dismiss-icon` and `icon` slots are empty.
 * @csspart live - A copy of the message in a live region, read by screen readers when the announcement appears after the page has loaded, and emptied seven seconds later. Visually hidden in the styled tier.
 *
 * @cssstate paused - The clock `duration` started is stopped, while the pointer or focus is on the announcement or the page is hidden.
 * @cssstate waiting - The announcement is `queued` behind another, and renders nothing until that one is removed.
 */
@customElement('helix-headless-announcement')
export class HelixHeadlessAnnouncement extends MixinDismissible(HelixElement) {
  /**
   * How long the announcement stays, in milliseconds, before it sends
   * `helix-dismiss`. When it is not set, it stays until it is dismissed.
   *
   * Read once when the announcement is first rendered, as `Toast` reads its
   * own. The clock stops while the pointer or focus is on the announcement.
   */
  @property({ type: Number })
  duration?: number

  /**
   * The key that moves focus to the announcement's first control, and back
   * to where it was, written as keys joined by `+`, such as `F6` or `Alt+A`.
   *
   * F6 by default, the key React Aria's regions answer to. Empty turns it
   * off. With several announcements, the first one in the page takes focus.
   */
  @property()
  hotkey = 'F6'

  /**
   * The name of the announcement's region, which screen readers list among
   * the page's landmarks. Translate it with the rest of your interface.
   *
   * Empty leaves the announcement no region.
   */
  @property()
  label = 'Announcement'

  /**
   * Whether the announcement waits its turn behind the queued announcements
   * before it in the same parent, showing when the last of them is removed.
   *
   * Off by default, so every announcement on a page shows at once.
   */
  @property({ reflect: true, type: Boolean })
  queued = false

  /**
   * The band's color.
   *
   * Paint only: unlike `Callout`, no value here draws a mark, changes the label,
   * or moves the live region off polite. `neutral` is the resting value, said
   * out loud so a consumer can put a band back to it from markup.
   *
   * **The set is `Tag`'s and `Badge`'s, and now actually is.** This doc claimed
   * to match `Tag` while differing from it in both directions: it carried
   * `surface`, which `Tag` does not, and lacked `accent`, which `Tag` has. Three
   * components saying what a thing means, in three vocabularies, one of which
   * described itself as a fourth.
   *
   * `accent` is the second emphasis, the second color a theme names, and the
   * brand itself until one is named. `primary` is the brand.
   *
   * **`surface` was never a color and has moved to `separation`**, which is the
   * axis that owns where a box sits relative to the page. It said the band rode
   * the surface step instead of the sunken one, which is an elevation, and a
   * band can be `info` and elevated at once: two values true together are two
   * axes, which is the test the registry answers to.
   */
  @property({ reflect: true })
  tone?: 'accent' | 'danger' | 'info' | 'neutral' | 'primary' | 'success' | 'warning'

  /** Whether a queued announcement before this one is still there. */
  @state()
  private waiting = false

  /** Watches the parent for the announcements before this one leaving. */
  private queue: MutationObserver | undefined

  /** Whether a queued announcement comes before this one in its parent. */
  private behind(): boolean {
    /* A server's markup is hydrated as it was served, every announcement
       shown; the update after it asks again. */
    if (!this.queued || (this.shadowRoot !== null && !this.hasUpdated)) {
      return false
    }
    for (let at = this.previousElementSibling; at; at = at.previousElementSibling) {
      if (at instanceof HelixHeadlessAnnouncement && at.queued) {
        return true
      }
    }
    return false
  }

  /* Filled a frame after the band appears, when it appears after the page has
     loaded; at once, and silently, when it came with the page. A waiting
     announcement has no words yet, so they are news when its turn comes. */
  protected readonly arrival = new ArrivalController(this, {
    arriving: () => !this.serverRendered && document.readyState === 'complete',
    text: () => (this.waiting ? '' : slottedWords(this, [''])),
  })

  /** The time `duration` gives it, held while a reader is on it. */
  private readonly countdown = new CountdownController(this, {
    done: () => {
      this.dismiss()
    },
    /* A hidden page holds the clock as a pointer does, so a timed message is
       not spent in a background tab. */
    holdWhileHidden: true,
    paused: (paused) => {
      this.toggleState('paused', paused)
    },
  })

  /* Where `hotkey` takes focus: the actions and the dismiss button. */
  private readonly scope = new FocusScopeController(this, {
    contents: () => [
      ...(this.renderRoot
        ?.querySelector<HTMLSlotElement>('slot[name="actions"]')
        ?.assignedElements({ flatten: true }) ?? []),
      ...[...(this.renderRoot?.querySelectorAll('[part="dismiss"]') ?? [])],
    ],
    surface: () => null,
  })

  /** Where focus was when `hotkey` moved it in. */
  private origin: HTMLElement | undefined

  /** Whether focus is inside the announcement, kept as it moves. */
  private focused = false

  /* On the document, since the key is pressed anywhere in the page. Pressed
     inside another announcement, it is that one's to answer. */
  private readonly handleHotkey = (event: KeyboardEvent): void => {
    if (event.defaultPrevented || !matchesChord(event, this.hotkey, onApple())) {
      return
    }
    if (this.scope.holdsFocus) {
      /* Back only where the key found focus; a reader who tabbed in has
         nowhere to go back to, and the key stays the browser's. */
      if (this.scope.leave()) {
        event.preventDefault()
      }
      this.origin = undefined
      return
    }
    const other = event
      .composedPath()
      .some((node) => node !== this && node instanceof HelixHeadlessAnnouncement)
    if (other || this.scope.controls.length === 0) {
      return
    }
    event.preventDefault()
    const active = deepActiveElement()
    this.origin = active instanceof HTMLElement ? active : undefined
    this.scope.enter()
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    /* Through internals, so nothing is written onto the host. */
    hostAria(this.internals, {
      label: this.label,
      role: this.label.trim() && !this.waiting ? 'region' : '',
    })
    if ('ariaKeyShortcuts' in this.internals) {
      this.internals.ariaKeyShortcuts = ariaChord(this.hotkey, onApple()) || null
    }
  }

  /* Hover and focus hold the clock, counted by the countdown. On the host,
     because the announcement's regions are its children, with no box around
     them all. */
  private readonly handleHold = (event: Event): void => {
    this.focused ||= event.type === 'focusin'
    this.countdown.hold()
  }

  private readonly handleRelease = (event: Event): void => {
    /* Asked a moment later, once focus has landed. Chromium 151 sends
       `focusout` to a band being removed with focus inside, before its
       `disconnectedCallback`, which then thought focus had already left and
       gave none back. */
    if (event.type === 'focusout') {
      queueMicrotask(() => {
        this.focused = this.matches(':focus-within')
      })
    }
    this.countdown.release()
  }

  override connectedCallback(): void {
    /* Before the controllers hear of the connection, so the arrival hears no
       words from an announcement that is waiting. */
    this.waiting = this.behind()
    super.connectedCallback()
    this.watchQueue()
    this.addEventListener('mouseenter', this.handleHold)
    this.addEventListener('mouseleave', this.handleRelease)
    this.addEventListener('focusin', this.handleHold)
    this.addEventListener('focusout', this.handleRelease)
    document.addEventListener('keydown', this.handleHotkey)
    /* The clock again after a move, from what was left of it. */
    if (this.hasUpdated) {
      this.countdown.resume()
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('mouseenter', this.handleHold)
    this.removeEventListener('mouseleave', this.handleRelease)
    this.removeEventListener('focusin', this.handleHold)
    this.removeEventListener('focusout', this.handleRelease)
    document.removeEventListener('keydown', this.handleHotkey)
    this.queue?.disconnect()
    /* The countdown lets every hold go as the host leaves, the hidden page's
       among them. Removed with focus inside, after the key moved it in: focus goes back
       where the key found it, a frame later, so a neighbor the dismissal
       handed focus to keeps it. `focused` still says where focus was, since
       a `focusout` the removal sends is read only after this. */
    const origin = this.focused ? this.origin : undefined
    this.focused = false
    this.origin = undefined
    if (origin) {
      requestAnimationFrame(() => {
        const active = deepActiveElement()
        if (origin.isConnected && (active === null || active === document.body)) {
          origin.focus({ preventScroll: true })
        }
      })
    }
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    /* Here rather than in `connectedCallback`, which the server never calls,
       and started only once: the clock belongs to this announcement's life on
       screen. */
    /* Asked again here, where every attribute has been read, so a clock is
       never started for an announcement that turns out to be waiting. */
    this.watchQueue()
    if (!this.waiting) {
      this.countdown.start(this.duration)
    }
    /* Said once for an element that slots the old `icon`, which is still
       drawn but has a replacement. */
    if (this.querySelector(':scope > [slot="icon"]')) {
      reportRuntime({
        kind: 'deprecated',
        message: `<${this.localName}>'s \`icon\` slot is deprecated: slot the glyph as \`dismiss-icon\`, the name Callout uses.`,
        tag: this.localName,
      })
    }
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.markEmpty()
    if (changed.has('queued')) {
      this.watchQueue()
    }
    this.toggleState('waiting', this.waiting)
    if (changed.has('waiting') && this.waiting) {
      /* The words it heard as it hydrated are forgotten, so they are news
         when its turn comes. */
      this.arrival.say()
    } else if (changed.get('waiting') === true) {
      /* Its turn: the clock starts now, as it would have on arrival. */
      this.countdown.start(this.duration)
    }
  }

  /* A queued announcement asks again whenever its parent's children change,
     which is how one before it leaves. */
  private watchQueue(): void {
    this.queue?.disconnect()
    this.waiting = this.behind()
    if (this.queued && this.parentElement && typeof MutationObserver !== 'undefined') {
      this.queue ??= new MutationObserver(() => {
        this.waiting = this.behind()
      })
      this.queue.observe(this.parentElement, { childList: true })
    }
  }

  /**
   * Says on the `actions` region whether anything is in it.
   *
   * An empty region is not free: it is still a flex item, so it still takes the
   * container's gap. There is no selector that can ask, `slot:empty` being
   * about a slot's fallback rather than its assigned nodes, so the component
   * asks and says so, on the region inside this shadow root rather than on the
   * host: an attribute written onto the host is a change to markup the consumer
   * rendered, which React reports on hydration and does not patch up.
   */
  private markEmpty(): void {
    /* `hidden` beside the mirror, because `data-empty` is the hook a sheet
       selects on and this tier ships none: an empty region left in the box tree
       is a gap a consumer cannot close without knowing to look for it. Both
       stay, since `[hidden]` is a UA rule and a sheet setting `display` on this
       part outranks it. */
    markRegion(this.renderRoot, 'actions', ['actions'])
  }

  /**
   * The cross inside the dismiss button, behind a seam.
   *
   * Slot fallback, so a consumer replaces it by slotting; and a method, so the
   * tier above replaces it by overriding. Those answer different people: the
   * slot is for the page and the method is for whoever is building the styled
   * layer, and a fallback with only the first is one a tier can restyle and
   * cannot change.
   *
   * Not `renderIcon`, which is what `Toast` and `Callout` call the method that
   * draws a tone mark. An announcement has no tone mark at all.
   */
  protected renderDismissIcon(): TemplateResult {
    /* `dismiss-icon` first, `Callout`'s name for the same slot, and the old
       `icon` inside it, so a page that slots either gets its glyph. */
    return html`<slot name="dismiss-icon"
      ><slot name="icon">
        <svg part="dismiss-mark" viewBox=${x.viewBox} fill="currentColor" aria-hidden="true">
          ${unsafeSVG(x.content)}
        </svg>
      </slot></slot
    >`
  }

  protected override render(): TemplateResult | typeof nothing {
    if (this.waiting) {
      return nothing
    }
    /* **The message is in the tree once.** While the live copy holds it, the
       message itself is hidden from readers; when the copy empties, it is
       back. */
    return html`<div aria-hidden=${this.arrival.said === '' ? nothing : 'true'} part="content"
        ><slot @slotchange=${() => this.arrival.say()}></slot
      ></div>
      <span part="live" role="status">${this.arrival.said}</span>
      <div part="actions"><slot name="actions" @slotchange=${() => this.markEmpty()}></slot></div>
      ${
        /* A plain `<button>`, the way `Menu` renders its way back and every
           other in-shadow control in the library. Never a nested component
           here: `[part="dismiss"]` would select the host and stop at its shadow
           boundary, so the styled tier could not reach the inner control at
           all, and the parent would depend invisibly on the child being
           registered. */
        this.dismissible
          ? html`<button
              part="dismiss"
              type="button"
              aria-label=${this.dismissLabel}
              @click=${() => this.dismiss()}
            >
              ${this.renderDismissIcon()}
            </button>`
          : nothing
      }`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-announcement': HelixHeadlessAnnouncement
  }
}

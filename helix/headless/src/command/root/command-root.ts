import {
  customElement,
  type HelixChangeEvent,
  HelixElement,
  HelixSelectEvent,
  MixinControllerOpen,
} from '@helix-io/core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import type { HelixBaseListbox } from '../../listbox/root/listbox-root.js'
/* Side-effect imports, because this renders both in its own shadow root and a
   custom element registers on import. The public tags rather than the base
   ones: a consumer on the styled tier gets the styled pair, and one on the
   headless tier brings their own under those names. */
import '../../dialog/index.js'
import '../../listbox/index.js'

/**
 * A hotkey, as the pieces a `keydown` can be compared against.
 *
 * `mod` is the platform's own: Command on a Mac and Control everywhere else,
 * which is what every application means by it and what a consumer would
 * otherwise have to detect and write twice.
 */
const parse = (hotkey: string) => {
  const parts = hotkey.toLowerCase().split('+')
  return {
    alt: parts.includes('alt'),
    key: parts.at(-1) ?? '',
    mod: parts.includes('mod'),
    shift: parts.includes('shift'),
  }
}

/**
 * @summary A list of commands, opened from anywhere and filtered by typing.
 *
 * @description
 * **The list is `helix-listbox`, filtering and all.** Listbox already owns
 * narrowing, the empty state, the highlight over what matched,
 * `aria-activedescendant`, scrolling an option into view and the keyboard that
 * moves between them. Its own note says a command palette is that list again
 * with something different opening it, and this is that something: a dialog,
 * and a key that summons it.
 *
 * **The value is not kept.** A palette runs a command and forgets it: nothing
 * here is a form control and nothing is submitted, so what it reports is that
 * an option was chosen, once, with `helix-select`. A consumer that wants the
 * last command remembered is a consumer with somewhere better to keep it.
 *
 * **The hotkey is global and the element does not have to be open to hear it.**
 * The listener is on the document, because the point of a palette is that it
 * answers from wherever the reader is, including from inside another control's
 * text field. `mod` is Command on a Mac and Control elsewhere, resolved here so
 * a consumer writes one thing.
 *
 * The filter is emptied as the palette closes, for the reason Combobox and
 * Select both record: a control reopened still narrowed by the last visit's
 * search is one whose second use starts from the first one's leftovers, and a
 * palette is used far more often than either.
 *
 * @since 0.1.0
 * @status experimental
 * @category navigation
 * @aliases Command palette, Quick open, Spotlight
 * @documentation https://helix.fusion.dev/components/command
 *
 * @slot - The commands, which are `helix-option` elements and their groups.
 * @slot footer - Under the list, for the keys a reader can press.
 *
 * @csspart dialog - The overlay's own box, forwarded from the dialog.
 * @csspart listbox - The list inside it.
 * @csspart items - The scrolling box of commands, forwarded from the listbox.
 * @csspart empty - What shows where the filter has hidden everything.
 * @csspart search - The region holding the field that narrows the list.
 * @csspart search-field - The field itself.
 * @csspart footer - The row under the list.
 *
 * @event {HelixSelectEvent} helix-select - Fired when a command is chosen.
 * @event {HelixOpenEvent} helix-open - Fired when the palette opens.
 * @event {HelixCloseEvent} helix-close - Fired when it closes.
 */
@customElement('helix-base-command')
export class HelixBaseCommand extends MixinControllerOpen(HelixElement) {
  /** Accessible name for the overlay, which has no visible heading. */
  @property()
  label = 'Commands'

  /** Shown in the field before anything is typed. */
  @property()
  placeholder = 'Search commands'

  /** Words shown where the filter has matched nothing. */
  @property({ attribute: 'empty-text' })
  emptyText = 'No commands'

  /**
   * The key that opens it, as `mod+k` or `shift+p` or plain `k`.
   *
   * Empty turns it off, for a consumer who opens the palette from a button or
   * from their own shortcut handler. There is no list of defaults to fight
   * with: one key, said once.
   */
  @property()
  hotkey = 'mod+k'

  /**
   * Whether the consumer put anything under the list.
   *
   * Asked of the slot rather than of CSS. A wrapper holding a slot always has a
   * child element, which is the slot, so `:not(:has(*))` on it is never true
   * and an empty footer would draw its rule and its padding over nothing. Steps
   * was caught by the same thing.
   */
  @state()
  private footed = false

  private get listbox(): HelixBaseListbox | null {
    return this.renderRoot?.querySelector<HelixBaseListbox>('[part="listbox"]') ?? null
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
    if (this.hotkey === '') {
      return
    }
    const wanted = parse(this.hotkey)
    const mod = event.metaKey || event.ctrlKey
    if (
      event.key.toLowerCase() !== wanted.key ||
      mod !== wanted.mod ||
      event.shiftKey !== wanted.shift ||
      event.altKey !== wanted.alt
    ) {
      return
    }
    event.preventDefault()
    this.requestOpen(!this.open)
  }

  /**
   * Takes what the list announced and says it under this element's name.
   *
   * The listbox says `helix-change`, which is the right word for a control that
   * holds a value and the wrong one for a palette: nothing here changed, a
   * command ran. It is stopped and re-announced rather than relayed, so a
   * consumer hears one event naming the element they put on the page.
   */
  private readonly handleChange = (event: Event): void => {
    event.stopPropagation()
    const { value } = (event as HelixChangeEvent).detail
    if (!this.dispatchEvent(new HelixSelectEvent({ value }))) {
      return
    }
    this.requestOpen(false)
  }

  /*
   * Keeps an option's own announcement inside the palette.
   *
   * Every option says `helix-select` when it is chosen, which is how the list
   * hears it, and the list does not stop it: the options are light DOM children
   * of this element, so it carried straight on out to the consumer. They then
   * heard two selections for one command, an option's and the palette's, under
   * one event name and distinguishable only by looking at the target.
   *
   * The one this element dispatches has itself as the target and is let past.
   * Combobox stops the listbox's `helix-change` for the same reason.
   *
   * `stopImmediatePropagation`, not `stopPropagation`. The consumer's listener
   * is on this same element, and stopping propagation only keeps an event off
   * the *next* node: every other listener already bound here still runs, so the
   * option's selection reached the consumer anyway. The listbox hears it well
   * before this, from inside the shadow root, so nothing this element needs is
   * lost by ending it here.
   */
  /**
   * The row under the keyboard, read from the attribute the listbox writes.
   *
   * `data-active` rather than a reference the listbox hands over, because the
   * options are this element's own light DOM children and the attribute is
   * already published: asking the listbox would mean a second channel saying
   * what the markup says.
   */
  private get activeOption(): (Element & { alternate?: string; value?: string }) | null {
    return this.querySelector('[data-active]')
  }

  /**
   * Takes the row's second destination, where the reader asked for it.
   *
   * **Command intercepts rather than Listbox reporting, and that is the whole
   * design.** Enter belongs to the listbox: it owns the active row, it decides
   * what choosing means, and it announces `helix-change`. Teaching it about a
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
    if (!(event.metaKey || event.ctrlKey) || !this.open) {
      return
    }
    if (event instanceof KeyboardEvent && event.key !== 'Enter') {
      return
    }
    const row =
      event instanceof KeyboardEvent
        ? this.activeOption
        : (event.target as Element | null)?.closest?.(
            '[data-active], helix-option, helix-base-option',
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

  private readonly swallowOptionSelect = (event: Event): void => {
    if (event.target !== this) {
      event.stopImmediatePropagation()
    }
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('helix-select', this.swallowOptionSelect)
    /* Capture, so both reach this before the listbox and the row do. */
    this.addEventListener('keydown', this.handleAlternate, { capture: true })
    this.addEventListener('click', this.handleAlternate, { capture: true })
    document.addEventListener('keydown', this.handleHotkey)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('helix-select', this.swallowOptionSelect)
    this.removeEventListener('keydown', this.handleAlternate, { capture: true })
    this.removeEventListener('click', this.handleAlternate, { capture: true })
    document.removeEventListener('keydown', this.handleHotkey)
  }

  protected override updated(changed: PropertyValues): void {
    super.updated?.(changed)
    /* On the change rather than on every update. Both of these reach into the
       listbox, and asking it to filter on a render it did not cause is how a
       render becomes a loop: the list updates, something it owns comes back
       through this element, and the next update asks again. Only the moment the
       palette opens or shuts is either of them true. */
    if (!changed.has('open')) {
      return
    }
    if (this.open) {
      /* The field takes focus as the palette arrives. A reader who pressed a
         key to summon a search expects to be typing in it, and the dialog would
         otherwise put focus on itself. */
      this.renderRoot
        .querySelector<HelixBaseListbox>('[part="listbox"]')
        ?.renderRoot?.querySelector<HTMLInputElement>('[part="search-field"]')
        ?.focus()
    } else {
      this.listbox?.requestFilter('')
    }
  }

  /**
   * The surface the palette opens in, behind a seam the styled tier can move.
   *
   * A method rather than a fragment inline, so a tier above can render its own,
   * wrap this one, pass it a property the base does not know about, or leave it
   * out, without reimplementing the whole template to do any of them. The
   * public tag rather than the base one: a consumer on the styled tier gets the
   * styled element, and one on the headless tier brings their own under that
   * name.
   */
  protected renderDialog(): TemplateResult {
    return html`<helix-dialog
      exportparts="dialog"
      label=${this.label}
      .open=${this.open}
      @helix-close=${() => {
        if (this.open) {
          this.requestOpen(false)
        }
      }}
    >
      <helix-listbox
        part="listbox"
        exportparts="items, empty, search, search-field"
        aria-label=${this.label}
        empty-text=${this.emptyText}
        filter-label=${this.placeholder}
        filterable
        @helix-change=${this.handleChange}
      >
        <slot></slot>
      </helix-listbox>
      <div ?hidden=${!this.footed} part="footer" slot="footer">
        <slot
          name="footer"
          @slotchange=${(event: Event) => {
            this.footed = (event.target as HTMLSlotElement).assignedNodes().length > 0
          }}
        ></slot>
      </div>
    </helix-dialog>`
  }

  protected override render(): TemplateResult {
    /* No part of its own on the host, and the dialog's own box forwarded under
       its own name: `::part(dialog)` then reaches the thing with the shadow and
       the padding, rather than a host that is only a wrapper. `align` is not set
       here either, being a styled-tier property: where the panel sits is
       presentation, and this tier renders no CSS. */
    return html`${this.renderDialog()}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-command': HelixBaseCommand
  }
}

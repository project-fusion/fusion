import {
  customElement,
  type HelixBeforeChangeEvent,
  HelixElement,
  HelixSelectEvent,
  MixinControllerOpen,
} from '@fusion.dev/helix-core'
import type { PropertyValues, TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { html } from 'lit/static-html.js'
import type { HelixHeadlessListbox } from '../../listbox/root/listbox-root.js'
/* Relative, so this registers the base pair and the styled file's identical
   imports register the styled pair. `tier` picks which the template asks for. */
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
 * command, store it yourself.
 *
 * The hotkey listener is on the document, so the hotkey works from anywhere on
 * the page, including inside another control's text field, whether or not the
 * palette is open. `mod` means Command on a Mac and Control elsewhere, so you
 * write one binding.
 *
 * The filter is cleared when the palette closes, so each opening starts from
 * the full list. Combobox and Select do the same.
 *
 * @since 0.1.0
 * @status stable
 * @category navigation
 * @aliases Command palette, Quick open, Spotlight
 * @documentation https://fusion.dev/helix/components/command
 *
 * @slot - The commands, and any groups of them.
 * @slot footer - Content under the list, such as the keys that work in the palette.
 *
 * @event {HelixBeforeCloseEvent} helix-before-close - The palette is about to close. Cancelable: cancel it to keep it open.
 * @event {HelixBeforeOpenEvent} helix-before-open - The palette is about to open. Cancelable: cancel it to keep it closed.
 * @event {HelixSelectEvent} helix-select - A command was chosen. Cancelable: cancel it to keep the palette open.
 * @event {Event} toggle - The palette opened or closed. The event carries `newState` and `oldState`.
 *
 * @csspart dialog - The box of the dialog the palette opens in, forwarded from `Dialog`.
 * @csspart footer - The row under the list.
 * @csspart listbox - The listbox inside the palette.
 * @csspart listbox-empty - The text shown when the filter matches no commands.
 * @csspart listbox-feedback - The listbox's error message.
 * @csspart listbox-filter-icon - The icon beside the filter field.
 * @csspart listbox-filter-mark - The default icon beside the filter field, drawn when no icon is slotted.
 * @csspart listbox-hint - Help text under the list.
 * @csspart listbox-items - The list of commands.
 * @csspart listbox-label - The label above the list.
 * @csspart listbox-live - The listbox's `live` part, a live region that holds the empty and loading text for screen readers.
 * @csspart listbox-loading - The text shown while the commands are loading.
 * @csspart listbox-search - The region that holds the filter field.
 * @csspart listbox-search-field - The filter field.
 *
 * @cssstate open - While the palette is open.
 */
@customElement('helix-headless-command')
export class HelixHeadlessCommand extends MixinControllerOpen(HelixElement) {
  /**
   * The text shown when the filter matches no commands.
   */
  @property({ attribute: 'empty-text' })
  emptyText = 'No commands'

  /**
   * The key that opens the palette, written as `mod+k`, `shift+p`, or `k`.
   *
   * Empty turns it off, for a consumer who opens the palette from a button or
   * from their own shortcut handler. There is no list of defaults to fight
   * with: one key, said once.
   */
  @property()
  hotkey = 'mod+k'

  /**
   * Accessible name for the overlay, which has no visible heading.
   */
  @property()
  label = 'Commands'

  /**
   * The text shown in the filter field before anything is typed.
   */
  @property()
  placeholder = 'Search commands'

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
    this.requestOpen(false)
  }

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

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    if (this.childrenKnown) {
      this.footed = this.knownChildren.some((child) => child.slot === 'footer')
    }
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.finishHydration()
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
      this.partNamed<HelixHeadlessListbox>('listbox')
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
   * out, without reimplementing the whole template to do any of them. The tag is
   * interpolated rather than written, so `tier` resolves it: this renders the
   * headless element, and a styled subclass that sets `tier` renders the styled one
   * from the same template.
   */
  protected renderDialog(): TemplateResult {
    return html`<${this.tag('dialog')}
    exportparts="dialog"
      label=${this.label}
      .open=${this.open}
      @helix-before-close=${() => {
        if (this.open) {
          this.requestOpen(false)
        }
      }}
    >
      <${this.tag('listbox')}
        part="listbox"
      exportparts="empty: listbox-empty, feedback: listbox-feedback, filter-icon: listbox-filter-icon,
        filter-mark: listbox-filter-mark, hint: listbox-hint, items: listbox-items,
        label: listbox-label, live: listbox-live, loading: listbox-loading, search: listbox-search,
        search-field: listbox-search-field"
        aria-label=${this.label}
        empty-text=${this.emptyText}
        filter-label=${this.placeholder}
        filterable
        @helix-before-change=${this.handleChange}
        @change=${this.stopInner}
        @input=${this.stopInner}
      >
        <slot></slot>
      </${this.tag('listbox')}>
      <div ?hidden=${!this.footed} part="footer" slot="footer">
        <slot
          name="footer"
          @slotchange=${(event: Event) => {
            this.footed = (event.target as HTMLSlotElement).assignedNodes().length > 0
          }}
        ></slot>
      </div>
    </${this.tag('dialog')}>`
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
    'helix-headless-command': HelixHeadlessCommand
  }
}

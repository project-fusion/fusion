import {
  customElement,
  DismissController,
  FloatingController,
  HelixFormElement,
  hostAria,
  MixinControllerOpen,
  MixinControllerValue,
  MixinField,
} from '@helix-io/core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import type { HelixBaseListbox } from '../../listbox/root/listbox-root.js'
import '../../listbox/index.js'

/**
 * @summary A closed list that opens to be chosen from.
 *
 * @description
 * **A trigger and a `Listbox`, not a listbox reimplemented behind a button.**
 * The list this opens is the same element a consumer can use on its own, with
 * the same keyboard, the same filtering and the same multi-select rules. What
 * Select adds is the closing: a trigger that says what is chosen, a surface
 * that floats, and somewhere for focus to go back to.
 *
 * The options are the consumer's, in the consumer's light DOM, slotted through
 * into the listbox. That is why the listbox walks through slots to find them:
 * from its point of view the options belong to something else.
 *
 * **What it does not do is duplicate the value.** `Select` owns it, hands it
 * down, and takes changes back; the listbox is the thing being operated and not
 * a second place the answer lives.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Dropdown, Picker
 * @documentation https://helix.fusion.dev/components/select
 *
 * @slot - The options, and any groups of them.
 * @slot indicator - The mark on the trigger saying this opens, usually a caret.
 * @slot label - Richer than a string.
 * @slot hint - Richer than a string.
 *
 * @event {HelixChangeEvent} helix-change - Relayed from the listbox when the answer changes.
 * @event {HelixOpenEvent} helix-open - Fired when the list opens.
 * @event {HelixCloseEvent} helix-close - Fired when it closes.
 *
 * @csspart label - The question, over the trigger.
 * @csspart trigger - The closed control, which says what is chosen.
 * @csspart surface - The floating panel.
 * @csspart listbox - The list inside it.
 * @csspart hint - Help under the trigger.
 * @csspart feedback - What is wrong with it.
 */
@customElement('helix-base-select')
export class HelixBaseSelect extends MixinControllerOpen(
  MixinControllerValue(MixinField(HelixFormElement)),
) {
  /**
   * Whether the list can be narrowed by typing.
   *
   * Passed to the listbox rather than acted on here, because the listbox owns
   * the filtering, the empty state and the keyboard. This property existed and
   * was never read: it reflected, it type-checked, and nothing anywhere
   * rendered a field. API that does nothing is worse than API that is missing,
   * because a consumer sets it and believes it.
   */
  @property({ reflect: true, type: Boolean })
  filterable = false

  /** Whether more than one option can be the answer. */
  @property({ reflect: true, type: Boolean })
  multiple = false

  /** Name the control reports under when its form is submitted. */
  @property()
  name = ''

  /** Shown on the trigger while nothing is chosen. */
  @property()
  placeholder = 'Choose'

  /**
   * The list inside the surface, or nothing where there is no DOM to hold one.
   *
   * The optional chain is the server. `renderRoot` is a property Lit's element
   * shim does not carry, and this getter is reached from `display`, which is
   * read during `render`: without it the select threw on every server render
   * and could not be served at all. Found by writing its SSR spec, which is
   * the only thing that would have found it, because the client is where every
   * other path runs and the client always has a root.
   *
   * The other reads of `renderRoot` here are inside callbacks the controllers
   * invoke, and a controller only runs on a connected element, so they cannot
   * be reached from the server and are left plain.
   */
  private get listbox(): HelixBaseListbox | null {
    return this.renderRoot?.querySelector<HelixBaseListbox>('[part="listbox"]') ?? null
  }

  /* The surface floats, so it is placed against the trigger rather than laid
     out beside it: a panel in flow would be clipped by anything with
     `overflow` between here and the page. */
  protected readonly floating = new FloatingController(this, {
    anchor: () => this.renderRoot.querySelector<HTMLElement>('[part="trigger"]'),
    floating: () => this.renderRoot.querySelector<HTMLElement>('[part="surface"]'),
    /* Held off the trigger by the controller rather than by a margin on the
       panel. A margin is inside the box the controller measures, so it would be
       counted once in the placement and again in the layout, and the gap would
       change as the panel flipped above the trigger for want of room. The same
       four pixels the menu holds its surface off its own trigger. */
    offset: () => 4,
    placement: 'bottom-start',
  })

  private readonly dismisser = new DismissController(this, {
    boundary: () => this.renderRoot.querySelector<HTMLElement>('[part="surface"]'),
    onDismiss: () => this.close(),
  })

  /**
   * What the trigger says: the chosen options' words, or the placeholder.
   *
   * Read off the options rather than stored, because the words are the
   * consumer's content and storing a copy is storing something that goes stale
   * the moment they change it.
   */
  private get display(): string {
    const chosen = new Set(this.value === '' ? [] : this.value.split(','))
    const words = (this.listbox?.options ?? [])
      .filter((option) => chosen.has(option.value))
      .map((option) => option.text)
    return words.length > 0 ? words.join(', ') : this.placeholder
  }

  /** Closes the list and puts focus back where it came from. */
  private close(): void {
    if (!this.isOpen) {
      return
    }
    this.requestOpen(false)
    // Back to the trigger, because focus is inside a panel that is going away
    // and a reader who loses it lands at the top of the document.
    this.renderRoot.querySelector<HTMLElement>('[part="trigger"]')?.focus()
  }

  private readonly handleChange = (event: Event): void => {
    const next = (event.target as HelixBaseListbox).value
    this.value = next
    /* Closed on a choice, unless more than one can be made: a multi-select that
       shut after each pick would be a control the reader has to reopen to use
       again. `helix-change` is left to travel, since it came from the listbox
       and says the same thing this would. */
    if (!this.multiple) {
      this.close()
    }
    event.stopPropagation()
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
  }

  private readonly handleTriggerKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      this.requestOpen(true)
    }
  }

  /** Reports the answer and the verdict on it. */
  private sync(): void {
    this.internals.setFormValue(this.value === '' ? null : this.value)
    if (this.required && this.value === '') {
      this.internals.setValidity(
        { valueMissing: true },
        'Choose one to continue.',
        this.renderRoot.querySelector<HTMLElement>('[part="trigger"]') ?? undefined,
      )
    } else {
      this.internals.setValidity({})
    }
    this.refreshFeedback()
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    hostAria(this.internals, { label: this.label })
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.sync()
    this.linkHost()
    if (this.isOpen) {
      /* Started here, and it was not started at all: the controller was
         constructed and nothing ever ran it. Without it the surface keeps the
         `position: absolute` its stylesheet declares and no offsets, so it
         lands at the host's own top-left, which is over the label and above the
         trigger rather than under it. The menu and the tooltip both start
         theirs; this one was the odd one out. */
      this.floating.start()
      this.dismisser.activate()
      // Into the list, which is where the keyboard has to be for the arrows to
      // mean anything.
      this.renderRoot.querySelector<HTMLElement>('[part="listbox"]')?.focus()
    } else {
      this.floating.stop()
      this.dismisser.deactivate()
    }
  }

  protected override render(): TemplateResult {
    return html`${this.renderLabel()}
      <button
        part="trigger"
        id="control"
        type="button"
        aria-haspopup="listbox"
        aria-expanded=${this.isOpen ? 'true' : 'false'}
        aria-describedby=${this.describedBy ?? nothing}
        ?disabled=${this.disabled}
        @click=${() => this.toggleOpen()}
        @keydown=${this.handleTriggerKeydown}
      >
        <span part="value">${this.display}</span>
        <slot name="indicator"></slot>
      </button>

      <div part="surface" ?hidden=${!this.isOpen}>
        <helix-listbox
          part="listbox"
          exportparts="items, empty"
          .value=${this.value}
          ?multiple=${this.multiple}
          ?filterable=${this.filterable}
          aria-label=${this.label || nothing}
          @helix-change=${this.handleChange}
        >
          <!-- The trigger's words are read off the options, and on the first
               render there are none: the slot has not been assigned yet, so a
               select with a value came up showing its placeholder. Assignment
               changes no property, so nothing else would schedule the update
               that fixes it. -->
          <slot @slotchange=${() => this.requestUpdate()}></slot>
        </helix-listbox>
      </div>
      ${this.renderHint()}${this.renderFeedback()}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-select': HelixBaseSelect
  }
}

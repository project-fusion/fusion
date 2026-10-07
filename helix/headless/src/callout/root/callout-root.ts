import {
  animationsSettled,
  customElement,
  drawDismiss,
  drawDismissGlyph,
  formatWords,
  HelixElement,
  hostAria,
  MixinDismissible,
  slottedWords,
  TONE_MARKS,
  toneMark,
  words,
  wordsConverter,
} from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'

/** The tones a callout takes. */
type CalloutTone = 'danger' | 'info' | 'neutral' | 'success' | 'warning'

/**
 * @summary A passage set apart as a note, information, a warning, or an error.
 *
 * @description
 * `tone` is on the headless tier because it carries meaning. It picks the icon
 * and the icon region's accessible name, so a screen reader announces "Error"
 * for an error callout whether or not the color is seen. Set `tone-label` to
 * say the name in another language.
 *
 * The icon is the fallback content of a slot. Slot your own icon to replace it,
 * and the default disappears with no extra check. The tone's name stays on the
 * region around it.
 *
 * Set `dismissible` for a note a reader may put away, as Shoelace's `closable`
 * alert does. The button fires `helix-dismiss`, and unless a listener cancels
 * it the callout hides itself: `open` turns false, `:state(exiting)` holds
 * while its exit animations run, and then it is `hidden`. Remove it in your
 * listener to take it out of the page, or set `open` to show it again, which
 * holds `:state(entering)` while it comes back. Focus on its dismiss button
 * moves to the next callout's, or to the tab stop beside it, once it hides.
 *
 * A callout sets a passage apart inside a document and is read where it sits.
 * For page-level chrome above the masthead that is a live region and can be
 * dismissed, use `Announcement`.
 *
 * @since 0.1.0
 * @status stable
 * @category markers
 * @aliases Admonition, Notice, Note, Alert
 * @documentation https://fusion.dev/helix/components/callout
 *
 * @slot - The callout's content.
 * @slot dismiss-icon - Replaces the cross inside the dismiss button.
 * @slot heading - A heading above the content.
 * @slot icon - Replaces the icon chosen by `tone`.
 *
 * @event {HelixDismissEvent} helix-dismiss - The dismiss button was pressed. Unless a listener cancels it, the callout hides itself, and a listener may remove it instead. Cancelable: cancel it to keep the callout showing.
 *
 * @csspart content - The content region.
 * @csspart dismiss - The button that dismisses the callout, shown when `dismissible` is set.
 * @csspart dismiss-mark - The cross on the dismiss button, shown when the `dismiss-icon` slot is empty.
 * @csspart icon - The icon region, an image named for the tone.
 * @csspart icon-mark - The icon for the tone, shown when no icon is slotted.
 *
 * @cssstate closed - While `open` is false: the callout was dismissed, and is leaving or hidden.
 * @cssstate entering - While a callout shown again by `open` runs its entrance animations.
 * @cssstate exiting - While a dismissed callout runs its exit animations, before it is hidden.
 * @cssstate has-heading - Something is slotted into `heading`.
 * @cssstate has-icon - An icon of your own is slotted into `icon`, in place of the tone's.
 */
@customElement('helix-headless-callout')
export class HelixHeadlessCallout extends MixinDismissible(HelixElement) {
  /**
   * The key this family's words are registered under, its styled tag:
   * `registerWords('de', { 'helix-callout': { toneLabels: { danger: 'Fehler' } } })`.
   */
  static words = 'helix-callout'

  /**
   * The dismiss button's name, read by screen readers, with `{label}` for
   * what the callout is called: its heading, or the tone's name where it has
   * none.
   *
   * "Dismiss Scheduled maintenance" says which of several callouts the button
   * takes away, where every button was "Dismiss". A label without `{label}` is
   * read as written.
   */
  @words
  @property({ attribute: 'dismiss-label' })
  override dismissLabel = 'Dismiss {label}'

  /** Which journey is the latest, so an entrance settling late leaves an exit alone. */
  private turn = 0

  /** Hidden from a reader once hidden, for the focus hand-off. */
  protected override get present(): boolean {
    return this.isConnected && !this.hasAttribute('hidden')
  }

  /**
   * Hides the callout once a dismissal stands, unless the page removed it in
   * its listener, which is the page's answer and leaves `open` as it was.
   */
  override dismiss(): boolean {
    const stands = super.dismiss()
    if (stands && this.isConnected) {
      this.open = false
    }
    return stands
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    // On the host, since the host is the box.
    hostAria(this.internals, { role: 'note' })
    this.toggleState('closed', !this.open)
  }

  /**
   * Whether the callout is showing. A dismissal nobody canceled turns it
   * false and the callout hides itself, and setting it true shows the callout
   * again. Not reflected: open is the resting state, so an `open` attribute
   * would appear on markup a server sent without it.
   */
  @property({ type: Boolean })
  open = true

  /**
   * What kind of attention the passage needs.
   *
   * `tone` is the axis for what a thing means, and this is a subset of it: a
   * callout reports a status, or `neutral` for an aside that reports none, and
   * never a brand role, so it takes five of the seven values. One word per axis
   * is the whole of the registry, which is why there is no `severity` beside it.
   */
  @property({ reflect: true })
  tone?: 'danger' | 'info' | 'neutral' | 'success' | 'warning'

  /**
   * What a screen reader is told the tone is, such as "Fehler".
   *
   * Absent is the tone's words in `tone-labels`, "Error", "Information",
   * "Note", "Success" or "Warning" in English.
   */
  @property({ attribute: 'tone-label' })
  toneLabel = ''

  /**
   * What a screen reader is told each tone is, by the tone's name, written as
   * JSON in the attribute: `tone-labels='{"danger":"Fehler"}'`. A tone left
   * out keeps its English, and `tone-label` wins over both.
   *
   * `danger` is said as "Error", the word a reader understands, and
   * `neutral` as "Note", for what the passage is.
   */
  @words
  @property({ attribute: 'tone-labels', converter: wordsConverter })
  toneLabels: Partial<Record<'danger' | 'info' | 'neutral' | 'success' | 'warning', string>> = {
    danger: 'Error',
    info: 'Information',
    neutral: 'Note',
    success: 'Success',
    warning: 'Warning',
  }

  /**
   * The mark for the callout's tone, behind a seam.
   *
   * Slot fallback, so a consumer replaces it by slotting; and a method, so the
   * tier above replaces it by overriding. Those answer different people: the
   * slot is for the page and the method is for whoever is building the styled
   * layer, and a fallback with only the first is one a tier can restyle and
   * cannot change.
   *
   * The mark and its label are passed in rather than looked up again, since
   * `render` has already resolved the tone and a second lookup is a second
   * place for the fallback to disagree with the tone around it.
   */
  protected renderIcon(icon: { content: string; viewBox: string }, _label: string): TemplateResult {
    /* `aria-hidden` on the slot, so an icon a page slots is drawn and not
       read: Chromium read an unnamed image beside the tone's name. */
    return html`<slot name="icon" aria-hidden="true" @slotchange=${this.readRegions}>
      <svg part="icon-mark" fill="currentColor" viewBox=${icon.viewBox} aria-hidden="true">
        ${unsafeSVG(icon.content)}
      </svg>
    </slot>`
  }

  /**
   * The cross inside the dismiss button, behind a seam, for the reason
   * `renderIcon` gives: the slot answers the page and the method the tier
   * above.
   */
  protected renderDismissIcon(): TemplateResult {
    return html`<slot name="dismiss-icon">
      ${drawDismissGlyph()}
    </slot>`
  }

  /**
   * The dismiss button's name: `dismissLabel` with the heading's words, or the
   * tone's name.
   *
   * The heading is read from the children, so a server and a hydrating render
   * name the button for the tone, and the update after names it for the
   * heading.
   */
  private dismissName(tone: string): string {
    const heading = this.childrenKnown ? slottedWords(this, ['heading']) : ''
    return this.dismissLabel.includes('{label}')
      ? formatWords(this, 'dismissLabel', { label: heading || tone }).trim()
      : this.dismissLabel
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.finishHydration()
  }

  /* Read after every render as well as on `slotchange`, because a hydrated
     slot was filled before any listener was bound and sends no change. */
  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.readRegions()
    if (changed.has('open') && changed.get('open') !== undefined) {
      this.journey()
    } else if (changed.has('open') && !this.open) {
      /* Shut from the start, which is no journey. */
      this.setAttribute('hidden', '')
    }
  }

  /**
   * The way out after a dismissal, or back in after `open` is set again.
   *
   * **Hidden only once the exit has run**, since a hidden element draws no
   * animation: `:state(exiting)` holds until every animation on the callout
   * has finished, or two frames where it has none, and then `hidden` takes it
   * out of the page and out of the accessibility tree. Shown again at once,
   * with `:state(entering)` while it arrives.
   */
  private journey(): void {
    this.turn += 1
    const turn = this.turn
    const open = this.open
    this.toggleState('entering', open)
    this.toggleState('exiting', !open)
    if (open) {
      this.removeAttribute('hidden')
    }
    void animationsSettled(this).then(() => {
      if (turn !== this.turn) {
        return
      }
      this.toggleState('entering', false)
      this.toggleState('exiting', false)
      if (!open) {
        this.setAttribute('hidden', '')
        this.handFocusOn()
      }
    })
  }

  /** Says which regions hold something, one call apiece so each pairs with its `@cssstate`. */
  private readonly readRegions = (): void => {
    /* What a page slotted, which is not the slot's own fallback: the tone's
       mark is the icon slot's child, and a flattened read counts it. */
    const filled = (name: string): boolean => {
      const slot = this.renderRoot?.querySelector<HTMLSlotElement>(`slot[name="${name}"]`)
      return (slot?.assignedNodes({ flatten: true }) ?? []).some(
        (node) =>
          node.parentNode !== slot &&
          (node.nodeType === Node.ELEMENT_NODE || node.textContent?.trim() !== ''),
      )
    }
    this.toggleState('has-heading', filled('heading'))
    this.toggleState('has-icon', filled('icon'))
  }

  protected override render(): TemplateResult {
    /* Falls back to `info`, because a callout exists to set a passage apart and
       is therefore always *about* something. `Toast.Item` takes the same lookup
       and draws nothing instead, since a message is just the next thing that
       happened. Same vocabulary, two honest answers to an absent tone. */
    /* A `neutral` callout reports no status: it takes the information mark,
       named for what the passage is. */
    const tone: CalloutTone =
      this.tone === 'neutral' ? 'neutral' : toneMark(this.tone) ? (this.tone ?? 'info') : 'info'
    const { icon } = toneMark(tone) ?? TONE_MARKS.info

    /* **The name is on the region, so it survives a slotted icon.** It was on
       the fallback glyph, and a consumer's own icon replaced the glyph and the
       tone's name with it, which left the color as the only thing saying
       "Error". */
    const named = this.toneLabel || (this.toneLabels[tone] ?? '')
    return html`<span part="icon" role="img" aria-label=${named}>${this.renderIcon(icon, named)}</span>
      <div part="content">
        <slot name="heading" @slotchange=${() => this.requestUpdate()}></slot>
        <slot></slot>
      </div>${
        /* A plain `<button>`, as `Announcement` draws its own, so the styled
           tier reaches the control itself through `[part="dismiss"]`. */
        this.dismissible
          ? drawDismiss({
              label: this.dismissName(named),
              mark: this.renderDismissIcon(),
              onDismiss: () => this.dismiss(),
            })
          : nothing
      }`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-callout': HelixHeadlessCallout
  }
}

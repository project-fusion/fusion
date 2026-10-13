import {
  customElement,
  HelixElement,
  HelixSelectEvent,
  hostAria,
  MIRROR_RULE,
  plainClick,
  slotFilled,
  slotNamed,
} from '@fusion.dev/helix-core'
import { caretRight } from '@fusion.dev/helix-icons'
import {
  type CSSResultGroup,
  css,
  html,
  nothing,
  type PropertyValues,
  type TemplateResult,
} from 'lit'
import { property } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'

/**
 * @summary One step in a breadcrumb trail.
 *
 * @description
 * Each crumb renders its separator and sets its list-item role. It hides its
 * own separator with `:host(:first-child)`, so the trail needs no index from
 * the parent.
 *
 * Set `href` to make the whole crumb an anchor, which works with Enter, middle
 * click, and the status bar, and before any JavaScript runs. A router cannot
 * reach an anchor inside a shadow root, so intercept the click for client-side
 * navigation, as with `Tree.Item` and `List.Item`: a plain press on the link
 * sends `helix-select` with the `href` as its value first, and canceling it
 * keeps the browser from following, so a client-side router follows it
 * instead, as React Aria's `onAction` lets a router do. A press with a
 * modifier opens the link where the browser opens it and sends nothing.
 *
 * Without `href`, the crumb renders a plain `<span>` around what you slot,
 * including your own anchor.
 *
 * The current page is plain text, and `aria-current="page"` on the host conveys
 * the position. In a trail where no crumb is `current`, the last one is said
 * to be the current page, and keeps its link. An `aria-current` you write on
 * the host, such as `aria-current="location"`, replaces the one the crumb
 * gives itself.
 *
 * @since 0.1.0
 * @status stable
 * @aliases Crumb
 * @documentation https://fusion.dev/helix/components/breadcrumbs
 *
 * @slot - The step's label. Without an `href`, you can slot your own anchor
 * here. Give it `data-link="quiet"`, because a slotted anchor belongs to the
 * outer tree and the crumb's styles cannot reach it.
 * @slot end - Content after the label and outside the link, such as a switcher's
 * menu trigger, a count, or a mark. It can hold a control, and it is not read as
 * part of the link's accessible name.
 * @slot separator - Replaces the mark shown before this item, a chevron or the trail's `separator`.
 * @slot start - Content before the label, such as an icon.
 *
 * @event {HelixSelectEvent} helix-select - A plain press on the crumb's link, with its `href` as the value, before the browser follows it. Cancelable: cancel it to keep the browser from following, as a client-side router does.
 *
 * @csspart expand - The button after the first crumb of a folded slotted trail, which shows the folded crumbs.
 * @csspart fold-separator - The chevron before that button.
 * @csspart link - The crumb itself, which is an `<a>` where `href` is set.
 * @csspart separator - The separator preceding the item.
 * @csspart separator-mark - The chevron between crumbs, or the slash under the trail's `separator="slash"`, shown when no separator is slotted.
 *
 * @cssstate current - While the crumb is the current page, marked `current` or the last of a trail with none marked.
 * @cssstate end - While the `end` slot holds something, so a stylesheet can join
 * the label and what follows it into one control.
 * @cssstate folded - While a trail longer than its `max-items` has folded the crumb away. It takes no room.
 */
@customElement('helix-headless-breadcrumb')
export class HelixHeadlessBreadcrumb extends HelixElement {
  protected static override markRules = [MIRROR_RULE]

  /* The first crumb has nothing before it to separate it from, so its
     separator is not drawn, in this tier as in the styled one. Content, as
     `Blockquote`'s marks are, so it is decided here; the styled tier replaces
     the sheet and keeps the rule. */
  static override styles: CSSResultGroup = css`
    :host(:first-child) [part='separator'] {
      display: none;
    }

    :host(:state(folded)) {
      display: none;
    }
  `

  /**
   * Marks this item as the page you are on.
   */
  @property({ reflect: true, type: Boolean })
  current = false

  /**
   * @internal Set by the trail: how many crumbs after this one a slotted trail
   * longer than its `max-items` has folded, so this crumb draws the button
   * that shows them. 0 draws none.
   */
  @property({ attribute: false })
  fold = 0

  /**
   * @internal Set by the trail: whether this crumb is folded away.
   */
  @property({ attribute: false })
  folded = false

  /** @internal Set by the trail: the name of the button that shows the folded crumbs. */
  @property({ attribute: false })
  foldLabel = ''

  /**
   * @internal Set by the trail from its `separator`: the mark this crumb draws
   * before itself and before its fold button.
   */
  @property({ attribute: false })
  mark: 'chevron' | 'slash' = 'chevron'

  /**
   * The URL the crumb links to. The current page has none.
   *
   * **Optional and reflected, because a stylesheet does select on it.** A sheet
   * writes `:host(:not([href])) [part="link"]` to take the block padding off a
   * crumb that is not a link, so the attribute is what decides how tall a crumb
   * is. Unreflected, an `href` set from script reached the property, rendered
   * the anchor, and left the host looking unlinked: the crumb drew at 20px
   * where a markup twin drew at 28.
   *
   * Optional rather than defaulted, which is the general rule that a reflected
   * property takes no default: an `href` written onto every host would be a link
   * to the current page on every crumb nobody asked to be one.
   *
   * Reading cannot catch this and the picture comparison can. React assigns a
   * matching property instead of an attribute, so every crumb in the React twin
   * of `breadcrumbs/links` lost its padding at once.
   */
  @property({ reflect: true })
  href?: string

  /**
   * @internal Set by the trail: this is its last crumb and no crumb is
   * `current`, so this one is said to be the current page.
   */
  @property({ attribute: false })
  implied = false

  /** @internal Set by the trail: what a press on the fold's button does. */
  onFold: (() => void) | undefined = undefined

  /**
   * The link's `rel` value, which describes how the linked page relates to this
   * one.
   *
   * The consumer's decision.
   */
  @property()
  rel = ''

  /**
   * Where the link opens. Use it for a crumb that leaves the site.
   */
  @property()
  target = ''

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    // On the host, because the item is an `<ol>` child in the flat tree and the
    // role has to be there for the list to have items. In `willUpdate` rather
    // than `connectedCallback`, which the server never calls.
    hostAria(this.internals, { role: 'listitem' })
    this.internals.ariaCurrent = this.current || this.implied ? 'page' : null
    this.toggleState('current', this.current || this.implied)
    this.toggleState('folded', this.folded)
  }

  /**
   * Sends `helix-select` for a plain press on the link, and keeps the browser
   * from following where it was canceled.
   */
  private readonly handleLinkClick = (event: MouseEvent): void => {
    if (!plainClick(event)) {
      return
    }
    if (!this.dispatchEvent(new HelixSelectEvent({ value: this.href ?? '' }))) {
      event.preventDefault()
    }
  }

  /**
   * The button that shows the crumbs a slotted trail folded after this one,
   * with a chevron before it, drawn after the crumb's own label.
   */
  protected renderFold(): TemplateResult | typeof nothing {
    if (this.fold === 0) {
      return nothing
    }
    return html`<span part="fold-separator" aria-hidden="true">${this.renderMark()}</span
      ><button part="expand" type="button" aria-label=${this.foldLabel} @click=${() => this.onFold?.()}>
        …
      </button>`
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.markEnd()
  }

  /**
   * Says whether anything sits after the label.
   *
   * A switcher's trigger in `end` makes the crumb a split control, and its
   * label is drawn as the first half of it. No selector can ask a slot what was
   * assigned to it, so this is script. Answered from a DOM, so the server
   * writes the resting answer and the first client update corrects it.
   */
  private markEnd(): void {
    this.toggleState('end', slotFilled(slotNamed(this.renderRoot, 'end')))
  }

  /* Content arriving in the light DOM changes no property here, so nothing
     would schedule the re-read. Bound to the slot, because `slotchange` is not
     composed and stops at the shadow root that owns the slot. */
  private readonly handleEnd = (): void => {
    this.markEnd()
  }

  /**
   * The mark between one crumb and the next.
   *
   * The chevron is the slot's own fallback, so replacing it is a matter of
   * filling the slot and costs the consumer no way to opt out of the default.
   * The seam answers the other half: a tier drawing its own separator gets it
   * without reimplementing the crumb, its link and its current-page branch.
   */
  protected renderSeparator(): TemplateResult {
    return html`<slot name="separator">${this.renderMark('separator-mark')}</slot>`
  }

  /**
   * The trail's mark: a chevron, mirrored on a right-to-left page because it
   * points the way the trail runs, or a slash, which is a character and is
   * written the same way in either direction.
   */
  private renderMark(part?: string): TemplateResult {
    if (this.mark === 'slash') {
      return html`<span part=${part ?? nothing} data-mark="slash">/</span>`
    }
    return html`<svg
      part=${part ?? nothing}
      data-mirror
      fill="currentColor"
      viewBox=${caretRight.viewBox}
    >
      ${unsafeSVG(caretRight.content)}
    </svg>`
  }

  protected override render(): TemplateResult {
    /* The label and what belongs to it, which is the same content whether or not
       it is a link. Built once so the two branches below cannot drift.

       **`end` is not in here, and that is the whole of what makes a switcher
       possible.** It used to be, so anything slotted after the label rendered
       inside the `<a>`. A count or a mark survives that; a control does not.
       Nesting a button in an anchor is invalid markup, the browser hands the
       press to the link, and the reader gets a target that navigates whichever
       half of it they aimed at.

       Outside, the two halves are two targets: the word goes to its own page and
       whatever sits after it does its own job. It also stops `end` being read
       into the link's accessible name, so a crumb with a count beside it is
       announced as its own name rather than as the name and the number. */
    const label = html`<slot name="start"></slot><slot></slot>`

    /* The current page is text, not a link, whatever it was given, so `current`
       wins over `href` rather than the two contradicting each other in the
       markup. */
    const linked = (this.href ?? '') !== '' && !this.current

    return html`<span part="separator" aria-hidden="true"
        >${this.renderSeparator()}</span
      >${
        linked
          ? html`<a
              part="link"
              href=${this.href ?? ''}
              target=${this.target || nothing}
              rel=${this.rel || nothing}
              @click=${this.handleLinkClick}
              >${label}</a
            >`
          : html`<span part="link">${label}</span>`
      }<slot name="end" @slotchange=${this.handleEnd}></slot>${this.renderFold()}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-breadcrumb': HelixHeadlessBreadcrumb
  }
}

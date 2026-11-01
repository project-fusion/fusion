import {
  AriaForwardController,
  customElement,
  focusableElements,
  focusItemOf,
  HelixElement,
  IndicatorController,
  KeyboardNavigationController,
  type NavigableItem,
  reportRuntime,
  words,
} from '@fusion.dev/helix-core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/** What can take focus itself, which a destination usually is. */
const FOCUSABLE = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'

/** Whether a slotted element is a list of destinations, such as a `<ul>`. */
const isList = (element: Element): boolean =>
  element.localName === 'ul' ||
  element.localName === 'ol' ||
  element.getAttribute('role') === 'list'

/**
 * The element on a destination that says it is current: the destination
 * itself, or the link inside a list item.
 */
const markOf = (item: HTMLElement): Element | null =>
  item.hasAttribute('aria-current') ? item : item.querySelector('[aria-current]')

/**
 * A destination as the keyboard controller moves through it: the link itself,
 * a `Megamenu`'s trigger, or the first thing inside it that takes focus.
 *
 * `contains` is that control and what is inside it, and not the whole
 * destination, so an arrow pressed among the links of an open megamenu panel
 * stays with the panel.
 */
const navigable = (item: HTMLElement): NavigableItem => {
  const control = (): HTMLElement | undefined =>
    (item as HTMLElement & { navigationControl?: HTMLElement }).navigationControl ??
    (item.matches(FOCUSABLE) ? item : focusableElements(item)[0])
  return focusItemOf(item, {
    focus: () => control()?.focus(),
    owns: (node) => {
      const target = control()
      return target !== undefined && node !== null && (node === target || target.contains(node))
    },
  })
}

/** The navigations on the page, to tell two with one name apart. */
const connected = new Set<HelixHeadlessNavigation>()

/** The navigations already warned about, each once. */
const warned = new WeakSet<HelixHeadlessNavigation>()

/**
 * @summary A set of destinations, with a marker on the current one.
 *
 * @description
 * Renders a real `<nav>`, the landmark that screen reader users jump to.
 * Navigation is its own component, separate from `AppHeader`, so you can use it
 * in a header, a footer, or a sidebar.
 *
 * **It renders no links.** Bring your own, mark the current one with
 * `aria-current="page"`, and style them with the `data-navigation-item` recipe.
 * A router renders its own anchors and cannot render them inside the
 * component's shadow root.
 *
 * The component moves a marker to the current item. It finds the current item
 * by reading `aria-current`, so the attribute that screen readers announce also
 * places the marker. Any value but `false` counts, so a sidebar of sections on
 * one page can mark the section in view with `aria-current="location"`. Where
 * several are marked, `page` wins.
 *
 * **The destinations can be a list.** Slot a `<ul>` or an `<ol>` of `<li>`
 * elements, each holding a link, and a screen reader says how many there are
 * and where each one is, as in Radix's `NavigationMenu.List`. The marker and
 * the arrow keys work on the list items as they do on bare links. Give the
 * list `role="list"` as well, since Safari drops the semantics of a list drawn
 * without bullets.
 *
 * Set `orientation="vertical"` to stack the destinations in a column, for a
 * sidebar.
 *
 * Set `arrows` and the arrow keys move focus between the destinations, as
 * Radix's navigation menu does: left and right along a row, up and down a
 * column, Home and End to the ends. A `Megamenu` among them is reached at its
 * trigger. Tab still stops at every link, since a navigation is a list of
 * links and not a single control, and the keys across the other axis are
 * left to the page and to an open panel.
 *
 * While a `Megamenu`, or another disclosure among the destinations, is open,
 * the navigation is `:state(open)`, so a page can dim what lies under the
 * panel, as Radix's navigation menu marks its open state.
 *
 * A screen reader lists the page's navigation landmarks by name, so two named
 * alike cannot be told apart. Where another navigation in the same document
 * has the same name, "Main" for two with no `label`, the later one warns once
 * with the kind `duplicate-name`.
 *
 * @since 0.1.0
 * @status stable
 * @category navigation
 * @aliases Nav, NavList, Tabs
 * @documentation https://fusion.dev/helix/components/navigation
 *
 * @slot - The destinations, as your own links.
 * @slot indicator - A marker of your own, drawn inside the `indicator` part, where the current destination's place and size reach it.
 *
 * @csspart indicator - The marker that moves to the current destination. It carries the destination's place and size as `--indicator-x`, `--indicator-y`, `--indicator-inline-size` and `--indicator-block-size`, and `data-placed` once it has been placed.
 * @csspart nav - The navigation landmark.
 *
 * @cssstate open - While a megamenu or another disclosure among the destinations is open.
 */
@customElement('helix-headless-navigation')
export class HelixHeadlessNavigation extends HelixElement {
  /**
   * The key this family's words are registered under, its styled tag:
   * `registerWords('de', { 'helix-navigation': { fallbackLabel: 'Hauptmenü' } })`.
   */
  static words = 'helix-navigation'

  /* The controller carries the RTL sign and border correction: a distance
     measured from the physical left and applied from the inline-start edge
     travels the wrong way in a right-to-left document. */
  private readonly indicator = new IndicatorController(this, {
    active: () => {
      const items = this.items
      const marked = (item: HTMLElement): boolean => {
        const current = markOf(item)?.getAttribute('aria-current')
        return current !== null && current !== undefined && current !== 'false'
      }
      return (
        items.find((item) => markOf(item)?.getAttribute('aria-current') === 'page') ??
        items.find(marked)
      )
    },
    indicator: () => this.partNamed('indicator'),
    observe: () => this.items,
    surface: () => this.partNamed('nav'),
  })

  /**
   * Whether the arrow keys move focus between the destinations.
   *
   * Off by default, so a page whose readers scroll with the arrow keys while
   * a link has focus keeps doing so.
   */
  @property({ type: Boolean })
  arrows = false

  /** The name the element gives itself where `label` is empty. */
  @words
  @property({ attribute: 'fallback-label' })
  fallbackLabel = 'Main'

  /**
   * The landmark's name, read by screen readers.
   *
   * An `aria-label` or `aria-labelledby` on the host names the landmark too,
   * and wins over this, so a footer navigation written the usual way is not a
   * second "Main".
   *
   * Empty by default, which leaves the name to `fallbackLabel`.
   */
  @property()
  label = ''

  /* The arrow keys, through the shared controller: from where focus is,
     choosing nothing, stopping at the ends. Only the axis the destinations run
     along: the other is the page's to scroll with and an open panel's. */
  protected readonly keys = new KeyboardNavigationController(this, {
    items: () => (this.arrows ? this.items.map(navigable) : []),
    origin: 'focus',
    reserved: () =>
      this.orientation === 'vertical' ? ['ArrowLeft', 'ArrowRight'] : ['ArrowDown', 'ArrowUp'],
    selects: () => false,
    wrap: false,
  })

  /** Carries a host `aria-label` and `aria-labelledby` to the `<nav>`. */
  protected readonly aria = new AriaForwardController(this, {
    label: true,
    target: () => this.partNamed('nav'),
  })

  /**
   * Stacks the destinations in a column, for a sidebar, where unset is a row
   * for a header or a footer. The marker follows the current destination down
   * the column as it does along the row.
   */
  @property({ reflect: true })
  orientation?: 'vertical'

  /**
   * How the destinations are drawn, with `Tabs`' three values and for the same
   * reasons.
   *
   * Unset is a pill under the current destination with nothing behind the row,
   * for a bar inside other chrome. `underlined` is a rule under the row and a
   * thicker one under the current destination, for a bar that heads a page, as
   * a repository's or a project's sections do. `segmented` puts the pill in a
   * framed, sunken track, for a short set that reads as one control.
   *
   * **The same words as `Tabs`, because a reader cannot tell the two apart.**
   * Navigation moves between pages and tabs between the panels of one page,
   * and the bar looks the same either way. A console whose sections are pages
   * could not draw them the way its underlined tabs were drawn.
   *
   * Down a column, `underlined` stands the rule and the mark along the
   * column's inline end.
   *
   * Reflected and left unset by default, so the host carries nothing a
   * consumer's server markup does not already have.
   */
  @property({ reflect: true })
  marker?: 'segmented' | 'underlined'

  private current: MutationObserver | undefined

  /** The disclosures among the destinations that are open. */
  private readonly opened = new Set<EventTarget>()

  /**
   * Hears a disclosure among the destinations open or close. In capture,
   * because `toggle` does not bubble.
   */
  private readonly handleToggle = (event: Event): void => {
    const target = event.target
    if (target === this || target === null) {
      return
    }
    if ((event as ToggleEvent).newState === 'open') {
      this.opened.add(target)
    } else {
      this.opened.delete(target)
    }
    this.toggleState('open', this.opened.size > 0)
  }

  /** The landmark's name as a screen reader lists it. */
  private get landmarkName(): string {
    const labeled = this.getAttribute('aria-labelledby')
    if (labeled) {
      const root = this.getRootNode() as Document | ShadowRoot
      return labeled
        .split(/\s+/)
        .map((id) => root.getElementById?.(id)?.textContent?.trim() ?? '')
        .join(' ')
        .trim()
    }
    return (this.getAttribute('aria-label') ?? (this.label || this.fallbackLabel)).trim()
  }

  /**
   * Warns once where another navigation in the same document has the same
   * name, a task after the first render, so the page's other landmarks have
   * rendered too.
   */
  private auditTwin(): void {
    setTimeout(() => {
      if (!this.isConnected || warned.has(this)) {
        return
      }
      const name = this.landmarkName
      const root = this.getRootNode()
      const twin = [...connected].some(
        (other) =>
          other !== this &&
          other.isConnected &&
          (other.compareDocumentPosition(this) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0 &&
          other.getRootNode() === root &&
          other.landmarkName === name,
      )
      if (twin) {
        warned.add(this)
        reportRuntime({
          kind: 'duplicate-name',
          message: `<${this.localName}> has the name "${name}", which another navigation on the page has too, so a screen reader lists the two alike. Give each a \`label\` that says what it holds, such as "Footer".`,
          tag: this.localName,
        })
      }
    })
  }

  /**
   * The destinations the consumer slotted, and the items of a slotted list in
   * place of the list.
   */
  private get items(): HTMLElement[] {
    const slot = this.renderRoot.querySelector<HTMLSlotElement>('slot:not([name])')
    return (slot?.assignedElements() ?? []).flatMap((one) =>
      isList(one) ? [...one.children] : [one],
    ) as HTMLElement[]
  }

  /** Re-measures when the links change or hand over the current page. */
  private watch(): void {
    this.current?.disconnect()

    /* Nothing is written onto the items, and `data-navigation-item` must not be
     * written here: it would land after upgrade, so a server-rendered nav would
     * arrive unstyled and restyle itself a frame later, and a React consumer
     * who wrote the attribute themselves gets `data-navigation-item="true"`
     * from JSX, which overwriting reports as a hydration mismatch. The base
     * layer selects the links through the host instead, so the styling is true
     * the moment the markup is parsed, on the server and on the client. */
    this.indicator.place()

    // Client-side routing changes `aria-current` in place rather than
    // reloading, so nothing else would tell the marker to move.
    this.current = new MutationObserver(() => this.indicator.place())
    for (const item of this.items) {
      /* The subtree too, for the link inside a list item. */
      this.current.observe(item, { attributeFilter: ['aria-current'], subtree: true })
    }
  }

  /* Rebuilt on reconnection, because nothing else does it.
   *
   * `firstUpdated` runs once for the life of the element and
   * `disconnectedCallback` runs every time it moves, so a framework reordering
   * a list left this permanently dead: the observer gone, nothing to rebuild
   * it, and the component still rendering as though it were watching. Guarded
   * on `hasUpdated`, because the first connection happens before the first
   * render and there is nothing to watch yet. */
  override connectedCallback(): void {
    super.connectedCallback()
    connected.add(this)
    this.addEventListener('toggle', this.handleToggle, true)
    if (this.hasUpdated) {
      this.watch()
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    connected.delete(this)
    this.removeEventListener('toggle', this.handleToggle, true)
    this.opened.clear()
    this.toggleState('open', false)
    this.current?.disconnect()
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.watch()
    this.auditTwin()
  }

  protected override render(): TemplateResult {
    return html`<nav part="nav" aria-label=${this.label || this.fallbackLabel}>
      <div part="indicator" aria-hidden="true"><slot name="indicator"></slot></div>
      <slot @slotchange=${() => this.watch()}></slot>
    </nav>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-navigation': HelixHeadlessNavigation
  }
}

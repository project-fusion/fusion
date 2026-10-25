import {
  AriaForwardController,
  auditName,
  closestInstance,
  customElement,
  HelixElement,
  ToolbarController,
  toolbarAround,
} from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary A group of controls that share one tab stop.
 *
 * @description
 * A toolbar holds a mix of controls, such as buttons, toggles, and menus. A
 * button group holds one kind, so the two are separate components.
 *
 * The toolbar is one tab stop, and the arrow keys move between its controls, so
 * three toolbars take three presses of Tab to pass. Any element the browser can
 * focus counts as a control, including your own elements. A child that takes no
 * focus, such as a divider, is skipped. A menu is reached at its trigger. A
 * disabled control is skipped too, except a Button with
 * `focusable-when-disabled`, which the arrows still reach so its tooltip can
 * say why it is disabled.
 *
 * A Divider in the toolbar is a separator across the toolbar's axis, as React
 * Aria's is: vertical in a horizontal toolbar and horizontal in a vertical
 * one, without an `orientation` of its own.
 *
 * Controls inside a plain wrapper, such as a `Button Group`, are each a stop
 * of the toolbar's own, as React Aria's toolbar flattens a group: the arrows
 * walk through the group's buttons and on past it, and the group takes no tab
 * stop of its own.
 *
 * The arrows wrap from the last control to the first. Set `stop-at-ends` to
 * keep them at the ends, as Radix's `loop` set to false does.
 *
 * **Keyboard.** Tab enters the toolbar on the control that last had focus, the
 * first control at the start, and the next Tab leaves it.
 *
 * | Key | What it does |
 * |---|---|
 * | Right | Moves to the next control in a horizontal toolbar, from the last back to the first. |
 * | Left | Moves to the control before in a horizontal toolbar, from the first round to the last. |
 * | Down, Up | The same in a vertical toolbar. |
 * | Home, End | Moves to the first or the last control. |
 *
 * Left and Right swap on a right-to-left page, where the first control is on
 * the right. The arrows across the toolbar's axis are left to the control that
 * has focus, so a radio-style toggle group or a select answers them itself.
 * The toolbar is `role="toolbar"` with `aria-orientation`, named by `label`.
 *
 * **A control takes the stop through a `focusable` property.** Where a
 * control has a boolean `focusable`, the toolbar sets it `true` on the control
 * that holds the stop and `false` on every other, and the control puts its
 * own focusable part in or out of the tab order. Button, Select, Radio Group
 * and Toggle Group take part this way, and a control of your own takes part
 * by declaring the same property. This is the one place the property is
 * documented: on Helix's own controls it is internal, because only a toolbar
 * or a set writes it. A control without one has `tabindex` written on the
 * element that takes focus: a native element itself, or the control inside a
 * custom element's open shadow root, so the host keeps the markup you
 * rendered. Only a custom element whose shadow root is closed takes it on the
 * host.
 *
 * A toggle group of pressed buttons, `selection-mode="multiple"`, is walked
 * through the same way, each toggle a stop on the toolbar's axis, as React
 * Aria's toolbar walks its toggle buttons. Another nested composite, such as a
 * radio-style toggle group, is one stop on the toolbar's axis: the toolbar's
 * arrows move past it, and the arrows across the toolbar move inside it. A
 * composite with a `focusable` property, as Toggle Group has, gives up its own
 * tab stop while the toolbar's is elsewhere, so Tab stops once in the
 * toolbar. A composite without one keeps its own tab stop.
 *
 * A `<slot>` in the toolbar counts as the controls assigned to it, for a
 * toolbar a component draws in its own shadow root with your controls passed
 * into it: they share its tab stop and its arrows with the component's own.
 *
 * A toolbar inside another toolbar, a Helix one or the page's own
 * `role="toolbar"`, is a `group` of the outer one, as React Aria's is: the
 * outer toolbar's arrows walk through its controls and on past them, and it
 * takes no keys and no tab stop of its own. A server renders it as a toolbar,
 * having no parent to read, until it upgrades.
 *
 * @since 0.1.0
 * @status stable
 * @category layout
 * @aliases Actions, Action bar
 * @documentation https://fusion.dev/helix/components/toolbar
 *
 * @slot - The toolbar's controls.
 *
 * @csspart toolbar - The toolbar container.
 *
 * @cssstate horizontal - The controls run along a row, which is the default.
 * @cssstate nested - The toolbar is a group inside another toolbar, which owns the keys and the tab stop.
 * @cssstate vertical - The controls run down a column, under `orientation="vertical"`.
 */
@customElement('helix-headless-toolbar')
export class HelixHeadlessToolbar extends HelixElement {
  /**
   * The key this family's words are registered under, its styled tag, kept
   * for a subclass that adds words of its own. Toolbar has no built-in name.
   */
  static words = 'helix-toolbar'

  /**
   * The toolbar's name, read by screen readers.
   *
   * An `aria-label` or `aria-labelledby` on the host names the toolbar too,
   * and wins over this.
   *
   * Empty by default, so a page that leaves it empty gives the element no
   * name, and a development build warns.
   */
  @property()
  label = ''

  /** Carries a host `aria-label` and `aria-labelledby` to the toolbar. */
  protected readonly aria = new AriaForwardController(this, {
    label: true,
    target: () => this.partNamed('toolbar'),
  })

  /**
   * The direction the arrow keys move focus in.
   */
  @property({ reflect: true })
  orientation?: 'horizontal' | 'vertical'

  /**
   * Whether the arrow keys stop at the first and the last control. Unset, they
   * wrap around from one end to the other.
   */
  @property({ attribute: 'stop-at-ends', type: Boolean })
  stopAtEnds = false

  /**
   * The one tab stop and the arrow keys, shared with every toolbar a
   * component draws: the controls are the children, a slot among them read as
   * the elements assigned to it.
   */
  protected readonly tabStop = new ToolbarController(this, {
    arrows: () => this.axis,
    members: () => [...this.children],
    nested: () => this.nested,
    stopAtEnds: () => this.stopAtEnds,
  })

  /**
   * Whether this toolbar sits inside another, which then owns the keys and the
   * tab stop: a toolbar inside a toolbar held the reader's arrows inside it.
   * Read when it renders and when it connects, there being no parent on a
   * server.
   */
  private get nested(): boolean {
    const parent = this.parentElement
    if (!parent) {
      return false
    }
    return closestInstance(parent, HelixHeadlessToolbar) !== null || toolbarAround(this) !== null
  }

  /**
   * The orientation in force.
   *
   * Unset is horizontal, and stays unset: the default is the absent attribute,
   * so a reflected default cannot appear on the host after hydration.
   */
  private get axis(): 'horizontal' | 'vertical' {
    return this.orientation ?? 'horizontal'
  }

  override connectedCallback(): void {
    super.connectedCallback()
    /* Moved into or out of another toolbar, so the role is read again. */
    this.requestUpdate()
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    /* Development builds only. */
    auditName(
      this,
      () => null,
      'toolbar',
      () => this.label !== '',
    )
    void this.tabStop.claim()
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    this.toggleState('nested', this.nested)
    this.toggleState('horizontal', this.axis === 'horizontal')
    this.toggleState('vertical', this.axis === 'vertical')
    /* A divider in the toolbar runs across its axis, so a turned toolbar asks
       its children to read it again. After the first render only: a child's
       first render reads the toolbar for itself. */
    if (this.hasUpdated && changed.has('orientation')) {
      for (const child of this.tabStop.members) {
        ;(child as Partial<HelixElement>).requestUpdate?.()
      }
    }
  }

  protected override render(): TemplateResult {
    const nested = this.nested
    return html`<div
      part="toolbar"
      role=${nested ? 'group' : 'toolbar'}
      aria-label=${this.label || nothing}
      aria-orientation=${nested ? nothing : this.axis}
    >
      <slot @slotchange=${() => this.tabStop.claim()}></slot>
    </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-toolbar': HelixHeadlessToolbar
  }
}

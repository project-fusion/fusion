import {
  chordParts,
  customElement,
  HelixElement,
  keyClaimed,
  keyNames,
  type ListedControl,
  listControls,
  listShortcuts,
  matchesChord,
  onApple,
  timeConverter,
  words,
} from '@fusion.dev/helix-core'
import { type CSSResultGroup, css, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { html } from 'lit/static-html.js'
import '../../dialog/index.js'

/** A key a reader holds to see the badges. */
type HoldKey = 'alt' | 'ctrl' | 'mod' | 'shift'

/** A badge drawn beside a control. */
interface Badge {
  keys: string
  left: number
  name: string
  top: number
}

/** A row of the sheet. */
interface Row {
  keys: string
  name: string
}

/** The `KeyboardEvent.key` each hold key arrives as. */
const HELD: Record<HoldKey, (apple: boolean) => string> = {
  alt: () => 'Alt',
  ctrl: () => 'Control',
  mod: (apple) => (apple ? 'Meta' : 'Control'),
  shift: () => 'Shift',
}

/** A chord as the platform prints it, `⇧⌘P` on an Apple keyboard and `Ctrl+Shift+P` elsewhere. */
const printed = (keys: string, apple: boolean): string => {
  const names = keyNames(chordParts(keys), apple)
  return names.keys.join(names.separator)
}

/**
 * @summary Shows every control's shortcut and what it does while a key is held.
 *
 * @description
 * Place one in the app. Hold the platform's modifier, Command on an Apple
 * keyboard and Control elsewhere, for `delay` and a badge appears beside each
 * control on screen that has a shortcut, with its keys and its name. Release
 * the key and the badges go. Pressing any other key during the hold cancels
 * it, so a reader pressing ⌘K never sees them.
 *
 * What a badge says comes from what the controls already carry: the
 * `aria-keyshortcuts` a Kbd's `for` writes onto its control, a Menu Item's
 * `shortcut`, and the hotkeys Command and Toast register. A control's name is
 * its label. A shortcut with no control on screen, such as a palette's ⌘K, is
 * listed in the sheet.
 *
 * Press `?` outside a text field, or call `showSheet()`, to open the sheet: a
 * dialog listing every shortcut on the page by name, which is how a keyboard
 * or screen reader user gets the same list. Set `sheet-keys` to another chord,
 * or to nothing to leave `?` to the page.
 *
 * The badges are a picture of what the controls already expose, so they are
 * hidden from assistive technology.
 *
 * @since 0.216.0
 * @status experimental
 * @category navigation
 * @aliases Keyboard shortcuts, Shortcut hints, Key tips, Cheat sheet
 * @documentation https://fusion.dev/helix/components/shortcut-overlay
 *
 * @csspart badge - One control's badge.
 * @csspart badge-keys - A badge's keys.
 * @csspart badge-name - A badge's name for the control.
 * @csspart badges - The layer the badges are drawn in.
 * @csspart empty - What the sheet says when the page has no shortcuts.
 * @csspart keys - A row's keys.
 * @csspart list - The sheet's list.
 * @csspart name - A row's name for what the shortcut does.
 * @csspart row - One shortcut in the sheet.
 * @csspart sheet - The dialog listing every shortcut.
 * @csspart sheet-body - The dialog's `body` part.
 * @csspart sheet-dismiss - The dialog's `dismiss` part.
 * @csspart sheet-dismiss-mark - The dialog's `dismiss-mark` part.
 * @csspart sheet-footer - The dialog's `footer` part.
 * @csspart sheet-header - The dialog's `header` part.
 * @csspart sheet-surface - The dialog's `surface` part.
 *
 * @cssstate showing - While the badges are drawn.
 */
@customElement('helix-headless-shortcut-overlay')
export class HelixHeadlessShortcutOverlay extends HelixElement {
  static override styles: CSSResultGroup = css`
    :host {
      display: contents;
    }

    [part='badges'] {
      background: none;
      border: 0;
      inset: 0;
      margin: 0;
      overflow: visible;
      padding: 0;
      pointer-events: none;
    }

    [part='badge'] {
      left: 0;
      position: fixed;
      top: 0;
      white-space: nowrap;
    }

    [part='badge'][data-compact] [part='badge-name'] {
      display: none;
    }
  `

  /**
   * The key this family's words are registered under, its styled tag:
   * `registerWords('de', { 'helix-shortcut-overlay': { label: 'Tastenkürzel' } })`.
   */
  static words = 'helix-shortcut-overlay'

  /** How long the key is held before the badges show, in milliseconds or as `0.6s`. */
  @property({ converter: timeConverter('delay', 600) })
  delay = 600

  /** What the sheet says when the page has no shortcuts. */
  @words
  @property({ attribute: 'empty-label' })
  emptyLabel = 'No shortcuts on this screen.'

  /**
   * The key a reader holds: `mod` (Command on an Apple keyboard, Control
   * elsewhere), `alt`, `ctrl`, or `shift`.
   */
  @property()
  hold: HoldKey = 'mod'

  /** The sheet's name and heading. */
  @words
  @property()
  label = 'Keyboard shortcuts'

  /**
   * The chord that opens the sheet, `?` by default, which a press in a text
   * field never answers. Empty leaves the key to the page.
   */
  @property({ attribute: 'sheet-keys' })
  sheetKeys = '?'

  /** The badges drawn while the key is held. */
  @state()
  private badges: Badge[] = []

  /** Whether the sheet is open. */
  @state()
  private sheetOpen = false

  /** The sheet's rows, read when it opens. */
  @state()
  private rows: Row[] = []

  private timer: ReturnType<typeof setTimeout> | undefined

  /** Whether the badges are showing. */
  get showing(): boolean {
    return this.badges.length > 0
  }

  override connectedCallback(): void {
    super.connectedCallback()
    document.addEventListener('keydown', this.handleKeydown, true)
    document.addEventListener('keyup', this.handleKeyup, true)
    document.addEventListener('pointerdown', this.cancel, true)
    document.addEventListener('scroll', this.cancel, true)
    window.addEventListener('blur', this.cancel)
    window.addEventListener('resize', this.cancel)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    document.removeEventListener('keydown', this.handleKeydown, true)
    document.removeEventListener('keyup', this.handleKeyup, true)
    document.removeEventListener('pointerdown', this.cancel, true)
    document.removeEventListener('scroll', this.cancel, true)
    window.removeEventListener('blur', this.cancel)
    window.removeEventListener('resize', this.cancel)
    this.cancel()
  }

  /** Draws a badge beside every control on screen that has a shortcut. */
  show(): void {
    const apple = onApple()
    const width = window.innerWidth
    const height = window.innerHeight
    const badges: Badge[] = []
    for (const control of listControls()) {
      const box = control.element.getBoundingClientRect()
      const [keys] = control.keys
      if (!keys || box.bottom < 0 || box.top > height || box.right < 0 || box.left > width) {
        continue
      }
      badges.push({
        keys: printed(keys, apple),
        left: box.left + box.width / 2,
        name: control.name,
        top: box.bottom,
      })
    }
    this.badges = badges
    this.toggleState('showing', badges.length > 0)
  }

  /** Takes the badges away. */
  hide(): void {
    clearTimeout(this.timer)
    this.timer = undefined
    if (this.badges.length > 0) {
      this.badges = []
      this.toggleState('showing', false)
    }
  }

  /** Opens the sheet listing every shortcut on the page. */
  showSheet(): void {
    this.hide()
    this.rows = this.sheetRows()
    this.sheetOpen = true
  }

  /** Closes the sheet. */
  hideSheet(): void {
    this.sheetOpen = false
  }

  /** Every shortcut on the page, the controls' first and then the page's own, each once. */
  private sheetRows(): Row[] {
    const apple = onApple()
    const controls = listControls().filter(
      (control): control is ListedControl => control.keys.length > 0,
    )
    const owned = new Set(controls.map((control) => control.element))
    const rows: Row[] = controls.flatMap((control) =>
      control.keys.map((keys) => ({ keys: printed(keys, apple), name: control.name })),
    )
    for (const shortcut of listShortcuts()) {
      if (shortcut.target && owned.has(shortcut.target as HTMLElement)) {
        continue
      }
      rows.push({ keys: printed(shortcut.keys, apple), name: shortcut.label })
    }
    const seen = new Set<string>()
    return rows.filter((row) => {
      const key = `${row.keys}\u0000${row.name}`
      if (seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    })
  }

  private readonly cancel = (): void => {
    this.hide()
  }

  private readonly handleKeydown = (event: KeyboardEvent): void => {
    const apple = onApple()
    if (event.key === HELD[this.hold](apple)) {
      if (!event.repeat && this.timer === undefined && !this.showing) {
        this.timer = setTimeout(() => {
          this.timer = undefined
          this.show()
        }, this.delay)
      }
      return
    }
    /* Any other key: a chord is being pressed, so the badges were not asked for. */
    this.hide()
    if (this.sheetKeys !== '' && !keyClaimed(event) && matchesChord(event, this.sheetKeys, apple)) {
      event.preventDefault()
      this.showSheet()
    }
  }

  private readonly handleKeyup = (event: KeyboardEvent): void => {
    if (event.key === HELD[this.hold](onApple())) {
      this.hide()
    }
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    const layer = this.partNamed('badges') as (HTMLElement & { showPopover?: () => void }) | null
    if (
      changed.has('badges') &&
      layer?.showPopover &&
      this.badges.length > 0 &&
      !layer.matches(':popover-open')
    ) {
      layer.showPopover()
    }
    if (changed.has('badges')) {
      this.arrange()
    }
  }

  /**
   * Places each badge centered on its control's bottom edge, on whole pixels
   * and inside the viewport, where it overlaps no badge placed before it.
   *
   * **A badge that would overlap a neighbor drops its name**, keeping the
   * keys, which is what a reader holding the key is looking for; one that
   * still overlaps moves down a row. Controls side by side in a toolbar are
   * narrower than a key and a name together, and badges drawn over each other
   * read as neither.
   */
  private arrange(): void {
    const placed: Array<{ bottom: number; left: number; right: number; top: number }> = []
    const margin = 4
    const width = window.innerWidth
    const height = window.innerHeight
    const drawn = [...(this.renderRoot.querySelectorAll<HTMLElement>('[part~="badge"]') ?? [])]
    drawn.forEach((element, index) => {
      const badge = this.badges[index]
      if (!badge) {
        return
      }
      const box = (compact: boolean, top: number) => {
        element.toggleAttribute('data-compact', compact)
        const { height: tall, width: wide } = element.getBoundingClientRect()
        const left = Math.round(
          Math.min(Math.max(badge.left - wide / 2, margin), width - wide - margin),
        )
        const at = Math.round(Math.min(Math.max(top - tall / 2, margin), height - tall - margin))
        return { bottom: at + tall, left, right: left + wide, top: at }
      }
      const hits = (one: { bottom: number; left: number; right: number; top: number }) =>
        placed.filter(
          (other) =>
            one.left < other.right &&
            one.right > other.left &&
            one.top < other.bottom &&
            one.bottom > other.top,
        )
      let place = box(false, badge.top)
      if (hits(place).length > 0) {
        place = box(true, badge.top)
      }
      for (let tries = 0; tries < 4 && hits(place).length > 0; tries += 1) {
        const below = Math.max(...hits(place).map((other) => other.bottom))
        place = box(true, below + (place.bottom - place.top) / 2 + 2)
      }
      element.style.left = `${place.left}px`
      element.style.top = `${place.top}px`
      placed.push(place)
    })
  }

  protected override render(): TemplateResult {
    const dialog = this.tag('dialog')
    return html`${
      this.badges.length > 0
        ? html`<div part="badges" popover="manual" aria-hidden="true">
            ${this.badges.map(
              (badge) =>
                html`<span part="badge"
                  ><kbd part="badge-keys">${badge.keys}</kbd> <span part="badge-name">${badge.name}</span></span
                >`,
            )}
          </div>`
        : nothing
    }<${dialog}
      part="sheet"
      exportparts="body: sheet-body, dismiss: sheet-dismiss, dismiss-mark: sheet-dismiss-mark,
        footer: sheet-footer, header: sheet-header, surface: sheet-surface"
      label=${this.label}
      .open=${this.sheetOpen}
      @close=${() => {
        this.sheetOpen = false
      }}
    >
      <h2 slot="header">${this.label}</h2>
      ${
        this.rows.length === 0
          ? html`<p part="empty">${this.emptyLabel}</p>`
          : html`<dl part="list">
              ${this.rows.map(
                (row) =>
                  html`<div part="row"><dt part="name">${row.name}</dt><dd part="keys"><kbd>${row.keys}</kbd></dd></div>`,
              )}
            </dl>`
      }
    </${dialog}>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-shortcut-overlay': HelixHeadlessShortcutOverlay
  }
}

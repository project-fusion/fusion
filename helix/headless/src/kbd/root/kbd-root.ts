import {
  ariaChord,
  chordParts,
  customElement,
  elementById,
  HelixElement,
  HelixShortcutEvent,
  matchesChord,
  onApple,
  printableChord,
  wordsConverter,
} from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { type KeyNames, keyNames } from '../keys.js'
import { claimShortcut, releaseShortcut } from '../shortcut.js'

/**
 * Whether a node is something a reader types into.
 *
 * The input types are the ones that take text. A checkbox and a range are
 * `<input>` and are not typing, so a chord still reaches them.
 */
const typing = (node: EventTarget | undefined): boolean => {
  if (node instanceof HTMLTextAreaElement) {
    return true
  }
  if (node instanceof HTMLElement && node.isContentEditable) {
    return true
  }
  return node instanceof HTMLInputElement && !UNTYPED.has(node.type)
}

/** `<input>` types that hold no text, so a bare chord is not competing with one. */
const UNTYPED = new Set([
  'button',
  'checkbox',
  'color',
  'file',
  'hidden',
  'image',
  'radio',
  'range',
  'reset',
  'submit',
])

/**
 * @summary A keyboard key or chord, set inline with text.
 *
 * @description
 * Renders a `<kbd>` element.
 *
 * Each element holds one key, except when you use `keys`. For a sequence or a
 * chord, write one element per key and put the separator between them as text,
 * such as "then" or "plus".
 *
 * `keys` renders the right glyphs for the platform. Given `mod`, it renders
 * `⌘K` on Apple devices and `Ctrl+K` everywhere else. A `⌘K` typed into a
 * template is wrong for anyone on Windows.
 *
 * The element binds the shortcut only when `within` is set. By default it draws
 * the key and listens for nothing.
 *
 * **`for` names the control the shortcut works**, and the key writes its chord
 * onto that control's `aria-keyshortcuts`, in the platform's words (`Meta+K`
 * on an Apple keyboard, `Control+K` elsewhere), so a screen reader announces
 * the shortcut with the control. A chord the page wrote there itself is left
 * alone, and the key takes back only what it added.
 *
 * `caps` draws a chord as a key per key: each is a `key` part and the `+`
 * between two a `separator` part, so a sheet can draw a cap for each.
 * `key-labels` renames any key, on every platform, such as
 * `key-labels='{"mod":"Command"}'`. On an Apple keyboard a word joins the
 * next key with a hyphen, as in `Command-K`.
 *
 * **`activate` makes the shortcut work the control `for` names**, with no
 * script: `activate="focus"` moves focus to it, as `/` does to a search
 * field, and `activate="click"` presses it. It acts once `helix-shortcut` has
 * gone out and no listener canceled it, and only where `within` listens.
 *
 * @since 0.1.0
 * @status stable
 * @category typography
 * @aliases Key, Shortcut, Hotkey
 * @documentation https://fusion.dev/helix/components/kbd
 *
 * @slot - The key's label, where `keys` is not set.
 *
 * @event {HelixShortcutEvent} helix-shortcut - The chord was pressed. Cancelable: cancel it to let the key press keep its usual effect.
 *
 * @csspart kbd - The key, or the chord under `keys`.
 * @csspart key - One key of a chord under `keys` and `caps`, such as `Ctrl` in `Ctrl+K`.
 * @csspart separator - The `+` between two keys of a chord under `keys` and `caps`, drawn where the platform writes one: on Windows and Linux. An Apple keyboard writes none between glyphs, and a hyphen between words from `key-labels`.
 */
@customElement('helix-headless-kbd')
export class HelixHeadlessKbd extends HelixElement {
  /**
   * What the chord does to the control `for` names once it is pressed:
   * `focus` moves focus to the control and `click` presses it.
   *
   * Unset, the chord sends `helix-shortcut` and does nothing else, for a page
   * that acts on the event itself. It acts only where `within` listens, after
   * `helix-shortcut`, and not when a listener cancels that event.
   */
  @property()
  activate?: 'click' | 'focus'

  /**
   * Draws a chord under `keys` as one key per key, each a `key` part with a
   * `separator` part between two where the platform writes a `+`, as GitHub
   * and most docs draw `Ctrl` `K`.
   *
   * Absent, a chord is one key holding the whole label, as it always was.
   * Reflected, because the styled tier draws the caps on the keys under it.
   */
  @property({ reflect: true, type: Boolean })
  caps = false

  /**
   * The id of the control the shortcut works, which is given the chord as its
   * `aria-keyshortcuts`.
   *
   * Names an element in the same tree, the way `Tooltip.for` does. Separate
   * from `within`, which says where the key listens: a key can describe a
   * shortcut the page binds itself.
   */
  @property()
  for = ''

  /**
   * Names for keys in place of the platform's own, by the key's name in
   * `keys`, written as JSON in the attribute: `key-labels='{"mod":"Command",
   * "enter":"Return"}'` shows `Command` and `Return` wherever `mod` and
   * `enter` are written.
   *
   * For a page in another language, or a product with its own word for a key.
   * Absent, the platform's glyphs and words are used. Only what is shown
   * changes: the chord written onto `aria-keyshortcuts` keeps the names a
   * screen reader knows.
   */
  @property({ attribute: 'key-labels', converter: wordsConverter })
  keyLabels: Record<string, string> = {}

  /**
   * The key or chord to show, such as `mod+k`, `?`, or `/`.
   *
   * `mod` is the platform's own command modifier, which is the reason to write
   * a chord here rather than a glyph: it is the one token whose right answer
   * differs per reader.
   *
   * A symbol such as `?` or `!` is written as itself, without `shift`. It is
   * matched whether or not Shift was held to type it, since that depends on
   * the keyboard layout. Bound to the document, a chord that types a character
   * is not taken from a field a reader is typing in.
   */
  @property()
  keys = ''

  /**
   * Where the chord is listened for. `control` listens inside the control the
   * key sits in, and `document` listens on the whole page.
   *
   * Unset draws a key and binds nothing.
   *
   * **Named `within` because `scope` is taken.** `scope` is a real HTML
   * attribute belonging to `<th>`, so putting one on anything else is both a
   * lint failure and a word in the DOM that already means something narrower.
   * `within` says the same thing and says it about this element.
   */
  @property({ reflect: true })
  within?: 'control' | 'document'

  /** The element the listener is on, kept so it can be taken off the same one. */
  private listening: EventTarget | undefined

  /** The control and the chord written onto it, so the same pair is taken back. */
  private described: { chord: string; control: Element } | undefined

  override connectedCallback(): void {
    super.connectedCallback()
    this.listen()
    /* A frame after connecting, which is after a framework has hydrated the
       control: an attribute it never rendered, arriving while it compares, is
       one it reports. */
    requestAnimationFrame(() => this.describe())
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.deafen()
    this.undescribe()
  }

  /** Writes the chord onto the control `for` names, taking back one written before. */
  private describe(): void {
    const control = this.isConnected && this.for !== '' ? elementById(this, this.for) : null
    const chord = ariaChord(this.keys, onApple())
    if (control === this.described?.control && chord === this.described?.chord) {
      return
    }
    this.undescribe()
    if (control && chord !== '') {
      claimShortcut(control, chord)
      this.described = { chord, control }
    }
  }

  private undescribe(): void {
    if (this.described) {
      releaseShortcut(this.described.control, this.described.chord)
      this.described = undefined
    }
  }

  protected override updated(changed: Map<string, unknown>): void {
    super.updated(changed)
    /* The target changes with `within` and the chord changes with `keys`, and
       the second matters as much as the first: a listener holding the old chord
       answers to a key the element no longer advertises. */
    if (changed.has('within') || changed.has('keys')) {
      this.deafen()
      this.listen()
    }
    if (
      (changed.has('for') && changed.get('for') !== undefined) ||
      (changed.has('keys') && changed.get('keys') !== undefined)
    ) {
      this.describe()
    }
  }

  /**
   * The chord as this reader's keyboard labels it.
   *
   * As a server labels it while hydrating what one sent: it has no keyboard to
   * ask and serves the words, and a render that differs is a text Lit records
   * and never writes, so a Mac kept Ctrl. The update after hydration asks.
   */
  private get label(): KeyNames {
    return keyNames(chordParts(this.keys), !this.hydrating && onApple(), this.keyLabels ?? {})
  }

  private listen(): void {
    if (!this.within || this.keys === '') {
      return
    }
    const target = this.within === 'document' ? this.ownerDocument : this.parentElement
    if (!target) {
      return
    }
    this.listening = target
    target.addEventListener('keydown', this.handleKeydown)
  }

  private deafen(): void {
    this.listening?.removeEventListener('keydown', this.handleKeydown)
    this.listening = undefined
  }

  private readonly handleKeydown = (event: Event): void => {
    const press = event as KeyboardEvent
    /* Mid-composition is not a chord. An IME sends keystrokes that belong to
       the text being composed, and taking one is how a shortcut eats a
       character the reader was trying to type. */
    if (press.isComposing) {
      return
    }
    /* Neither is a bare character typed into a field, which is the same fault
       the IME guard above already refuses: the reader meant the key to reach
       what they are writing in.

       Only a bare printable chord. `mod+k` is a shortcut a reader expects to
       work from inside a search field, and `escape` is how they leave it, so a
       guard over every chord would break the two conventions this is for. It is
       `/` and `?` that are ambiguous, being both the most conventional
       shortcuts on the web and characters somebody types.

       `composedPath()[0]` rather than `target`, which retargets to the host at
       document level and would need a list of every tag name that holds a field.
       The path's first entry is the real one, through open shadow roots and
       through `delegatesFocus`.

       **`document` only, because `control` has already answered the question.**
       That binding listens on `this.parentElement`, so it fires only with focus
       inside the control the badge sits in, and the guard would make a bare
       printable chord unreachable there by construction: the two are mutually
       exclusive. `.examples/events.html` is exactly that shape, a `keys="/"`
       slotted into a `Input` telling the reader to put the cursor in the
       field and press slash, and it would have shipped to the docs site doing
       nothing. What is ambiguous is `/` competing with every field on the page,
       which is the `document` case and the only one this refuses. */
    if (
      this.within === 'document' &&
      printableChord(this.keys) &&
      typing(press.composedPath()[0])
    ) {
      return
    }
    if (!matchesChord(press, this.keys, onApple())) {
      return
    }
    /* Announced before it is consumed, so a consumer can refuse it: the key
       goes on to whatever would have had it wherever this is prevented. */
    const shortcut = new HelixShortcutEvent({ keys: this.keys })
    this.dispatchEvent(shortcut)
    if (shortcut.defaultPrevented) {
      return
    }
    press.preventDefault()
    this.act()
  }

  /** Focuses or presses the control `for` names, as `activate` says. */
  private act(): void {
    const control = this.activate && this.for !== '' ? elementById(this, this.for) : null
    if (!(control instanceof HTMLElement)) {
      return
    }
    if (this.activate === 'click') {
      control.click()
    } else {
      control.focus()
    }
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.finishHydration()
  }

  protected override render(): TemplateResult {
    if (this.keys === '') {
      return html`<kbd part="kbd"><slot></slot></kbd>`
    }
    /* One text node unless `caps` asks for a part per key: a chord split into
       elements is laid out as several runs of text, which places a glyph from
       a fallback font a fraction of a pixel away from where one run put it. */
    const { keys, separator } = this.label
    return html`<kbd part="kbd">${this.caps ? this.renderChord() : keys.join(separator)}</kbd>`
  }

  /**
   * The chord under `caps`, a part for each key and for each `+` between two,
   * so a sheet can draw a cap per key. Written with no space between, so a
   * chord reads as the one label it was.
   */
  protected renderChord(): TemplateResult {
    const { keys, separator } = this.label
    return html`${keys.map(
      (key, index) =>
        html`${index > 0 && separator !== '' ? html`<span part="separator">${separator}</span>` : nothing}<span part="key">${key}</span>`,
    )}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-kbd': HelixHeadlessKbd
  }
}

import { customElement, HelixElement, HelixShortcutEvent } from '@fusion.dev/helix-core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

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
 * How each name in a chord is drawn, per platform.
 *
 * Apple keyboards label their modifiers with glyphs and print no separator
 * between them, so `⌘K` is the whole of it. Everywhere else the words are the
 * label and the plus is part of the convention rather than prose, which is why
 * it is the one separator this component supplies.
 */
const APPLE: Record<string, string> = {
  alt: '⌥',
  backspace: '⌫',
  cmd: '⌘',
  ctrl: '⌃',
  del: '⌦',
  down: '↓',
  enter: '↵',
  esc: 'Esc',
  left: '←',
  meta: '⌘',
  mod: '⌘',
  opt: '⌥',
  right: '→',
  shift: '⇧',
  space: 'Space',
  tab: '⇥',
  up: '↑',
}

const ELSEWHERE: Record<string, string> = {
  alt: 'Alt',
  backspace: 'Backspace',
  cmd: 'Win',
  ctrl: 'Ctrl',
  del: 'Del',
  down: '↓',
  enter: 'Enter',
  esc: 'Esc',
  left: '←',
  meta: 'Win',
  mod: 'Ctrl',
  opt: 'Alt',
  right: '→',
  shift: 'Shift',
  space: 'Space',
  tab: 'Tab',
  up: '↑',
}

/** Whether the keyboard in front of the reader labels its modifiers with glyphs. */
const onApple = (): boolean =>
  typeof navigator !== 'undefined' && /mac|iphone|ipad|ipod/i.test(navigator.userAgent)

/**
 * @summary A keyboard key or chord, set inline with text.
 *
 * @description
 * Renders a real `<kbd>`, so the passage still means "press this" to anything
 * reading the markup.
 *
 * **One key per element, with `keys` as the stated exception.** A sequence is
 * several of these with the separator written between them as ordinary text,
 * because that separator is prose: "then" in a sequence, "plus" in a chord, and
 * a component inserting one would have to guess which.
 *
 * **`keys` exists because the glyphs were being typed by hand and were wrong.**
 * A literal `⌘K` in a template tells a reader on Windows to press a key their
 * keyboard does not have, and nothing catches it. Given `mod` this renders
 * `⌘K` on Apple and `Ctrl+K` everywhere else.
 *
 * **`within` is what binds it, and it is absent by default**, so this draws a
 * key and listens for nothing unless asked.
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
 * @csspart kbd - The key.
 */
@customElement('helix-headless-kbd')
export class HelixHeadlessKbd extends HelixElement {
  /**
   * The key or chord to show, such as `mod+k`, `shift+?`, or `/`.
   *
   * `mod` is the platform's own command modifier, which is the reason to write
   * a chord here rather than a glyph: it is the one token whose right answer
   * differs per reader.
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

  override connectedCallback(): void {
    super.connectedCallback()
    this.listen()
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.deafen()
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
  }

  /**
   * The chord as this reader's keyboard labels it.
   *
   * As a server labels it while hydrating what one sent: it has no keyboard to
   * ask and serves the words, and a render that differs is a text Lit records
   * and never writes, so a Mac kept Ctrl. The update after hydration asks.
   */
  private get label(): string {
    const apple = !this.hydrating && onApple()
    const names = apple ? APPLE : ELSEWHERE
    const parts = this.keys
      .split('+')
      .map((part) => part.trim())
      .filter((part) => part !== '')
      .map((part) => names[part.toLowerCase()] ?? (part.length === 1 ? part.toUpperCase() : part))
    return parts.join(apple ? '' : '+')
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
    if (this.within === 'document' && this.printable && typing(press.composedPath()[0])) {
      return
    }
    if (!this.matches_(press)) {
      return
    }
    /* Announced before it is consumed, so a consumer can refuse it: the key
       goes on to whatever would have had it wherever this is prevented. */
    const shortcut = new HelixShortcutEvent({ keys: this.keys })
    this.dispatchEvent(shortcut)
    if (!shortcut.defaultPrevented) {
      press.preventDefault()
    }
  }

  /**
   * Whether this chord is one bare character, and so indistinguishable from
   * typing.
   *
   * A single part means no modifier, and one code point means a character
   * rather than a name: `/` and `?` are printable, `escape` and `enter` are not.
   */
  private get printable(): boolean {
    const parts = this.keys
      .split('+')
      .map((part) => part.trim())
      .filter((part) => part !== '')
    return parts.length === 1 && [...(parts[0] ?? '')].length === 1
  }

  /** Whether a press is this chord, modifiers and all. */
  private matches_(press: KeyboardEvent): boolean {
    const parts = this.keys
      .split('+')
      .map((part) => part.trim().toLowerCase())
      .filter((part) => part !== '')
    if (parts.length === 0) {
      return false
    }
    const wanted = parts[parts.length - 1] ?? ''
    const modifiers = new Set(parts.slice(0, -1))
    const mod = onApple() ? press.metaKey : press.ctrlKey
    /* Every modifier is checked in both directions, so `mod+k` is not answered
       by `shift+mod+k`: a chord a reader did not press is a chord that should
       go to whatever did want it. */
    return (
      press.key.toLowerCase() === wanted &&
      (modifiers.has('mod') ? mod : true) &&
      (modifiers.has('shift') ? press.shiftKey : !press.shiftKey) &&
      (modifiers.has('alt') || modifiers.has('opt') ? press.altKey : !press.altKey) &&
      (modifiers.has('ctrl') ? press.ctrlKey : modifiers.has('mod') ? true : !press.ctrlKey) &&
      (modifiers.has('cmd') || modifiers.has('meta')
        ? press.metaKey
        : modifiers.has('mod')
          ? true
          : !press.metaKey)
    )
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.finishHydration()
  }

  protected override render(): TemplateResult {
    return html`<kbd part="kbd">${this.keys === '' ? html`<slot></slot>` : this.label}</kbd>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-kbd': HelixHeadlessKbd
  }
}

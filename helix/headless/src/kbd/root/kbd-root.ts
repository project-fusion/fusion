import {
  customElement,
  elementById,
  HelixElement,
  HelixShortcutEvent,
} from '@fusion.dev/helix-core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { ariaChord, claimShortcut, releaseShortcut } from '../shortcut.js'

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
   * Whether this chord types a character, and so is indistinguishable from
   * typing.
   *
   * One code point means a character rather than a name: `/` and `?` are
   * printable, `escape` and `enter` are not. **Shift is allowed beside it**,
   * because Shift is how a character is typed: `shift+?` and `shift+a` are a
   * question mark and a capital A in a field, and taking them ate every one
   * a reader typed on the page.
   */
  private get printable(): boolean {
    const parts = this.keys
      .split('+')
      .map((part) => part.trim().toLowerCase())
      .filter((part) => part !== '')
    const key = parts.at(-1) ?? ''
    return [...key].length === 1 && parts.slice(0, -1).every((modifier) => modifier === 'shift')
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
    const apple = onApple()
    /* `mod` is one key, the platform's: Command on Apple devices and Control
       elsewhere. The other one is then checked like any modifier the chord
       does not name, so Control and Command together do not answer `mod+k`. */
    const ctrl = modifiers.has('ctrl') || (modifiers.has('mod') && !apple)
    const meta = modifiers.has('cmd') || modifiers.has('meta') || (modifiers.has('mod') && apple)
    /* **A symbol is typed with Shift, so Shift says nothing about it.** On a US
       layout `?` arrives as `?` with `shiftKey` set, and a chord of `?` that
       refused Shift could never be pressed at all: the web's most common help
       shortcut, unbindable except as `shift+?`. A letter has a shifted form of
       its own, so `a` still refuses Shift and `shift+a` still asks for it. */
    const symbol = wanted.toLowerCase() === wanted.toUpperCase() && [...wanted].length === 1
    /* Every modifier is checked in both directions, so `mod+k` is not answered
       by `shift+mod+k`: a chord a reader did not press is a chord that should
       go to whatever did want it. */
    return (
      press.key.toLowerCase() === wanted &&
      (modifiers.has('shift') ? press.shiftKey : symbol || !press.shiftKey) &&
      (modifiers.has('alt') || modifiers.has('opt') ? press.altKey : !press.altKey) &&
      (ctrl ? press.ctrlKey : !press.ctrlKey) &&
      (meta ? press.metaKey : !press.metaKey)
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

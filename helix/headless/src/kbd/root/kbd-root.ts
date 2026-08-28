import { customElement, HelixElement, HelixShortcutEvent } from '@helix-io/core'
import { html, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * How each name in a chord is drawn, per platform.
 *
 * Apple keyboards label their modifiers with glyphs and print no separator
 * between them, so `⌘K` is the whole of it. Everywhere else the words are the
 * label and the plus is part of the convention rather than prose. That is the
 * one separator this component is willing to supply: the class docstring says
 * a separator between keys is prose because it is "then" in a sequence and
 * "plus" in a simultaneous press, and `keys` is only ever the second of those.
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
 * reading the markup rather than only to a reader looking at it.
 *
 * **One key per element, with `keys` as the stated exception.** A *sequence* is
 * several of these with the separator written between them as ordinary text,
 * because that separator is prose: it is "then" in a sequence and "plus" in a
 * simultaneous press, and a component that inserted one would have to guess
 * which. `keys` cannot be guessing, since a chord written `mod+k` has said
 * which it is.
 *
 * **`keys` exists because the glyphs were being typed by hand and were wrong.**
 * A literal `⌘K` in a template tells a reader on Windows to press a key their
 * keyboard does not have, and nothing catches it, a string being a string.
 * Given `mod` this renders `⌘K` on Apple and `Ctrl+K` everywhere else.
 *
 * **`within` is what binds it, and it is absent by default.** Without it this
 * draws a key and listens for nothing, which is what every existing use of this
 * component wants. The two values are the two honest lifetimes:
 *
 * - `control` listens within the element's own parent, which is the case this
 *   is mostly for: a hint sitting inside the control it belongs to, where the
 *   shortcut should work while that control has focus and stop existing when
 *   the control does.
 * - `document` listens on the document, for a chord that works from anywhere.
 *
 * *Corrected 25 Aug 2026: this said `scope`, `self` and `global` until then,
 * naming a property that has never existed under that name. The rename is
 * explained on the property itself, twenty lines below, and this paragraph
 * above it went on teaching the old one. A reader who trusted the class doc
 * wrote an attribute that binds nothing, which is also what an unset `within`
 * does, so nothing about the mistake looked like one.*
 *
 * **A hidden `kbd` is a dead shortcut, and that is the point rather than a
 * trap.** Binding here ties the key to its own advertisement, so a hint that is
 * not rendered is a shortcut that is not offered. A chord that must outlive its
 * label is a chord whose owner is not a label: give it to whatever owns the
 * action and let this element only describe it.
 *
 * Nothing binds until this upgrades, so a shortcut is not available in the
 * moments before hydration.
 *
 * @since 0.1.0
 * @status stable
 * @category typography
 * @aliases Key, Shortcut, Hotkey
 * @documentation https://helix.fusion.dev/components/kbd
 *
 * @slot - The key's label, where `keys` is not set.
 *
 * @event {HelixShortcutEvent} helix-shortcut - Fired when the chord is pressed, and cancelable.
 *
 * @csspart kbd - The key.
 */
@customElement('helix-headless-kbd')
export class HelixHeadlessKbd extends HelixElement {
  /**
   * The chord, written plainly: `mod+k`, `shift+?`, `/`.
   *
   * `mod` is the platform's own command modifier, which is the reason to write
   * a chord here rather than a glyph: it is the one token whose right answer
   * differs per reader.
   */
  @property()
  keys = ''

  /**
   * Where the chord is listened for, and whether it is listened for at all.
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

  /** The chord as this reader's keyboard labels it. */
  private get label(): string {
    const names = onApple() ? APPLE : ELSEWHERE
    const parts = this.keys
      .split('+')
      .map((part) => part.trim())
      .filter((part) => part !== '')
      .map((part) => names[part.toLowerCase()] ?? (part.length === 1 ? part.toUpperCase() : part))
    return parts.join(onApple() ? '' : '+')
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

  protected override render(): TemplateResult {
    return html`<kbd part="kbd">${this.keys === '' ? html`<slot></slot>` : this.label}</kbd>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-kbd': HelixHeadlessKbd
  }
}

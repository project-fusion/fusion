import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessKbd } from '@fusion.dev/helix-headless/kbd'
import type { CSSResultGroup } from 'lit'
import { styles } from './kbd-root.generated.css.js'

/**
 * @summary A keyboard key or chord, set inline with text.
 *
 * @description
 * Drawn as a physical key, with a hairline border, a sunken fill, and one inset
 * shadow along the bottom edge.
 *
 * Sized in `em`, so it stays in proportion with the text around it, including
 * in a heading.
 *
 * @since 0.1.0
 * @status stable
 * @category typography
 * @aliases Key, Shortcut, Hotkey
 * @use A key or a chord to press, written in a sentence, such as Ctrl+K to search.
 * @use A shortcut that works the control it names, such as / to move to a search field.
 * @instead code - A name from code inside a sentence.
 * @instead shortcut-overlay - Every shortcut on a page, shown while a key is held.
 * @practice {shortcut} Write a chord in `keys`, such as mod+k. - It draws ⌘K on Apple devices and Ctrl+K elsewhere, and a ⌘K typed into a template is wrong on Windows.
 * @practice Write a sequence as one Kbd for each key, with the word between them as text, such as then. - Each element holds one key, except under `keys`.
 * @practice Set `within` for the shortcut to work. - By default the key is drawn and listens for nothing.
 * @documentation https://fusion.dev/helix/components/kbd
 *
 * @cssproperty --kbd-background-color - The fill of the key.
 * @cssproperty --kbd-block-size - The height of a key, and the least width of one, in `em` of the text around it.
 * @cssproperty --kbd-border-color - The color of the key's border and its bottom edge.
 * @cssproperty --kbd-color - The color of the key's label.
 * @cssproperty --kbd-font-family - The face of the key's label. Monospaced by default.
 * @cssproperty --kbd-font-size - The size of the key's label, in `em` of the text around it.
 * @cssproperty --kbd-font-weight - The weight of the key's label.
 * @cssproperty --kbd-gap - The space between two keys of a chord under `caps`.
 * @cssproperty --kbd-padding-inline - The space either side of the key's label.
 * @cssproperty --kbd-radius - How far the key's corners are rounded.
 * @cssproperty --kbd-separator-color - The color of the `+` between two keys of a chord under `caps`.
 *
 * @replaces kbd
 */
@customElement('helix-kbd')
export class HelixKbd extends HelixHeadlessKbd {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-kbd': HelixKbd
  }
}

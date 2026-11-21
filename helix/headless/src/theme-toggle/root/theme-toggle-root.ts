import {
  type ColorMode,
  type ColorModeTransition,
  colorMode,
  customElement,
  drawIcon,
  HelixElement,
  onColorModeChange,
  setColorMode,
  words,
} from '@fusion.dev/helix-core'
import { moon, sun } from '@fusion.dev/helix-icons'
import { html, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'

/**
 * @summary A button that switches the page between light and dark, with the new mode spreading from the button.
 *
 * @description
 * A press moves the whole page to the other color mode. By default the new
 * mode spreads in a circle from the button. `transition` picks another way:
 * `wipe` draws it across from the inline start, `fade` fades it over the old,
 * and `none` changes it at once.
 *
 * **The choice is the page's**, held on the document element as
 * `data-color-mode`, which is the one thing `helix.css` decides the mode by.
 * Two of these on one page agree, and a page can set the mode in its markup,
 * or from its own code with `setColorMode` from `@fusion.dev/helix-core`,
 * which takes the same transitions. With no attribute the page follows the
 * reader's system setting, and the button says which mode that is.
 *
 * **The one Helix component that starts a view transition.** A view transition
 * draws the whole document twice and runs between the two pictures, so a
 * component that started one for its own sake would cancel the page's, or
 * have its own canceled. The color mode is the document's own state, so
 * changing it is the one move that is the document's to make. Where the
 * reader asked for reduced motion, or the browser has no view transitions,
 * the mode changes at once.
 *
 * It is a toggle button: a `<button>` that says whether the page is dark with
 * `aria-pressed`, under one name, `label`, whichever way it stands. Its icon
 * shows what a press does next: the moon while the page is light, and the sun
 * while it is dark.
 *
 * @since 0.241.0
 * @status experimental
 * @category actions
 * @aliases Dark mode toggle, Color mode switch, Light and dark switch, Theme switcher
 * @use A control in the page's header that switches the page between light and dark.
 * @instead toggle - A choice among light, dark, and the system setting.
 * @instead switch - A color mode setting among the other settings of a form.
 * @instead motion-toggle - A press that pauses the motion on the page.
 * @anatomy button
 * @anatomy icon
 * @practice Listen for the change event, and write the mode into the next page you serve. - The button sets the mode on the page in front of you, and the next page starts from its own markup.
 * @documentation https://fusion.dev/design/components/theme-toggle
 *
 * @slot - The button's text, where it shows more than its icon. Defaults to nothing, the icon alone, named by `label`.
 * @slot icon - Replaces the icon, which is the moon while the page is light and the sun while it is dark.
 *
 * @event {Event} change - Fired once a press has switched the page's color mode.
 *
 * @csspart button - The toggle button, with `aria-pressed` while the page is dark.
 * @csspart icon - The icon inside the button.
 *
 * @cssproperty --theme-toggle-origin-x - Where a `circle` spreads from, across the viewport, while it runs. Written on the document element.
 * @cssproperty --theme-toggle-origin-y - Where a `circle` spreads from, down the viewport, while it runs. Written on the document element.
 * @cssproperty --theme-toggle-radius - How far a `circle` reaches, to the viewport's furthest corner, while it runs. Written on the document element.
 *
 * @cssstate dark - The page is in dark mode.
 *
 * @interactive button
 */
@customElement('helix-headless-theme-toggle')
export class HelixHeadlessThemeToggle extends HelixElement {
  /**
   * The key this family's words are registered under, its styled tag:
   * `registerWords('de', { 'helix-theme-toggle': { fallbackLabel: 'Dunkler Modus' } })`.
   */
  static words = 'helix-theme-toggle'

  /** The name the element gives itself where `label` is empty. */
  @words
  @property({ attribute: 'fallback-label' })
  fallbackLabel = 'Dark mode'

  /**
   * The button's name, which stays the same whichever way it stands.
   *
   * Empty by default, which leaves the name to `fallbackLabel`.
   */
  @property()
  label = ''

  /**
   * How the page moves to the other mode: `circle` from the button, `wipe`
   * across from the inline start, `fade`, or `none`.
   *
   * Absent is `circle`.
   */
  @property()
  transition?: ColorModeTransition

  /** The page's mode, kept with the document element's attribute and the reader's setting. */
  @state()
  private mode: ColorMode = 'light'

  /** What stops hearing the page's mode. */
  private unheard: (() => void) | undefined

  override connectedCallback(): void {
    super.connectedCallback()
    this.mode = colorMode()
    this.unheard ??= onColorModeChange((mode) => {
      this.mode = mode
    })
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.unheard?.()
    this.unheard = undefined
  }

  protected override updated(): void {
    this.toggleState('dark', this.mode === 'dark')
  }

  /** Switches the page to the other mode, spreading from the middle of the button. */
  private readonly toggle = async (): Promise<void> => {
    const box = this.partNamed('button')?.getBoundingClientRect()
    const next: ColorMode = colorMode() === 'dark' ? 'light' : 'dark'
    await setColorMode(next, {
      ...(box ? { from: { x: box.left + box.width / 2, y: box.top + box.height / 2 } } : {}),
      transition: this.transition ?? 'circle',
    })
    this.mode = colorMode()
    this.dispatchEvent(new Event('change', { bubbles: true }))
  }

  protected override render(): TemplateResult {
    return html`<button
      aria-label=${this.label || this.fallbackLabel}
      aria-pressed=${this.mode === 'dark' ? 'true' : 'false'}
      part="button"
      type="button"
      @click=${this.toggle}
    ><span part="icon">${this.renderIcon()}</span><slot></slot></button>`
  }

  /**
   * The icon the `icon` slot falls back to: the moon while the page is light,
   * and the sun while it is dark, which is what a press does next. A tier
   * above draws its own here.
   */
  protected renderIcon(): TemplateResult {
    return html`<slot name="icon">${drawIcon(this.mode === 'dark' ? sun : moon)}</slot>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-theme-toggle': HelixHeadlessThemeToggle
  }
}

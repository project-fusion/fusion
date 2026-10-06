import { customElement, HelixElement, hostAria } from '@fusion.dev/helix-core'
import { nothing, type PropertyValues } from 'lit'

/**
 * @summary A rule between options or groups inside a listbox.
 *
 * @description
 * Sets one run of options apart from the next where a heading would say too
 * much, as React Aria's ListBox takes a `Separator`: actions apart from
 * choices in a command palette, say, or the options a reader uses most apart
 * from the rest.
 *
 * It has `role="separator"`, so a screen reader can say where one run ends,
 * and it is no stop: the arrow keys move from the option before it to the one
 * after. The list hides it while a filter is narrowing the options, since a
 * rule between two runs of which only some options are left separates nothing.
 *
 * @since 0.1.0
 * @status stable
 * @aliases Divider, ListBoxSeparator
 * @documentation https://fusion.dev/helix/components/option
 */
@customElement('helix-headless-option-separator')
export class HelixHeadlessOptionSeparator extends HelixElement {
  /* The role on the host through `ElementInternals`, so a page's markup never
     carries an attribute the element did not write. */
  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    hostAria(this.internals, { role: 'separator' })
  }

  /* No content: the rule is the host's own box, which the styled tier draws. */
  protected override render(): typeof nothing {
    return nothing
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-option-separator': HelixHeadlessOptionSeparator
  }
}

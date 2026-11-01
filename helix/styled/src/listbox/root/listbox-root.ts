import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessListbox } from '@fusion.dev/helix-headless/listbox'
import type { CSSResultGroup } from 'lit'
import { styles as collectionErrorStyles } from '../../shared/collection/error.css.js'
import { styles as collectionStateStyles } from '../../shared/collection/state.css.js'
import { styles as dictationStyles } from '../../shared/dictation/dictation.css.js'
import { styles as fieldStyles } from '../../shared/field/field.css.js'
import { styles as fieldStackedStyles } from '../../shared/field/field-stacked.css.js'
import { styles as liveStyles } from '../../shared/live/live.css.js'
import { styles } from './listbox-root.css.js'
import '../../voice-level/index.js'

/**
 * @summary A list of options, from which you choose one or several.
 *
 * @description
 * A framed, scrolling list with the field's three parts around it. The frame is
 * on the list itself, so a filter that hides every option leaves a box with a
 * message in it, and the border stays in place.
 *
 * Set `--listbox-max-block-size` to make the list scroll. The keyboard scrolls
 * the active option into view inside that box.
 *
 * @since 0.1.0
 * @status stable
 * @category forms
 * @aliases Options, Select list
 * @documentation https://fusion.dev/helix/components/listbox
 *
 * @cssproperty --listbox-background-color - The panel's fill. Set it to `transparent` when the list is already inside a panel.
 * @cssproperty --listbox-border - The panel's border, as a shorthand. Set it to `none` when the list is already inside a panel.
 * @cssproperty --listbox-column-min-inline-size - How narrow a column may be with `layout="grid"`. As many columns as fit are drawn. Defaults to `8rem`.
 * @cssproperty --listbox-drag-preview-background-color - The fill behind the copy of an option a pointer drags.
 * @cssproperty --listbox-drag-preview-border-color - The color of the edge around the copy of an option a pointer drags.
 * @cssproperty --listbox-drag-preview-border-width - The width of the edge around the copy of an option a pointer drags. None by default, where the shadow lifts it.
 * @cssproperty --listbox-drag-preview-opacity - The opacity of the copy of an option a pointer drags.
 * @cssproperty --listbox-drag-preview-radius - The corner radius of the copy of an option a pointer drags.
 * @cssproperty --listbox-drag-preview-shadow - The shadow that raises the copy of an option a pointer drags over the page.
 * @cssproperty --listbox-dragging-opacity - The opacity of an option being dragged, in a `reorderable` list with `@fusion.dev/helix/listbox/reorder` imported.
 * @cssproperty --listbox-drop-indicator-color - The color of the line where a dragged option would land.
 * @cssproperty --listbox-drop-indicator-size - The thickness of the line where a dragged option would land.
 * @cssproperty --listbox-error-color - The color of the line shown while `error-text` is set.
 * @cssproperty --listbox-max-block-size - Maximum height of the list before it scrolls.
 */
@customElement('helix-listbox')
export class HelixListbox extends HelixHeadlessListbox {
  /* The options drawn for `items` are this tier's. */
  static override tier = 'helix-'

  static override styles: CSSResultGroup = [
    liveStyles,
    collectionStateStyles, collectionErrorStyles,
    fieldStyles,
    fieldStackedStyles,
    styles,
    dictationStyles,
  ]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-listbox': HelixListbox
  }
}

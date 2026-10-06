/*
 * Moving the options of a listbox: `@fusion.dev/helix/listbox/reorder`.
 *
 * Its own entry, so a list that never moves options carries none of it.
 * Importing it gives every listbox what `reorderable` turns on, and each option
 * of a list that reorders the sheet that draws a move, with the hooks
 * `--listbox-dragging-opacity`, `--listbox-drop-indicator-color`, and
 * `--listbox-drop-indicator-size` set on the list.
 */
import { reorderListbox } from '@fusion.dev/helix-headless/listbox/reorder'
import { HelixListbox } from '../root/listbox-root.js'
import { styles } from './listbox-reorder.css.js'

reorderListbox(HelixListbox, styles)

export {
  ListboxReorderController,
  reorderListbox,
} from '@fusion.dev/helix-headless/listbox/reorder'

/*
 * Moving the options of a listbox: `@fusion.dev/helix-headless/listbox/reorder`.
 *
 * Its own entry, so a list that never moves options carries none of it.
 * Importing it gives every listbox of this tier what `reorderable` turns on.
 */
import { HelixHeadlessListbox } from '../root/listbox-root.js'
import { reorderListbox } from './listbox-reorder.js'

reorderListbox(HelixHeadlessListbox)

export { ListboxReorderController, reorderListbox } from './listbox-reorder.js'

/*
 * Narrowing a menu's rows: `@fusion.dev/helix/menu/filter`.
 *
 * Its own entry, so a menu that never filters carries none of it. Importing it
 * gives every menu what `filterable` turns on, and the sheet that draws the
 * field, which a menu adopts while it filters.
 */
import { filterMenu } from '@fusion.dev/helix-headless/menu/filter'
import { HelixMenu } from '../root/menu-root.js'
import { styles } from './menu-filter.css.js'

filterMenu(HelixMenu, styles)

export { filterMenu, MenuFilterController } from '@fusion.dev/helix-headless/menu/filter'

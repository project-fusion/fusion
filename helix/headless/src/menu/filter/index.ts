/*
 * Narrowing a menu's rows: `@fusion.dev/helix-headless/menu/filter`.
 *
 * Its own entry, so a menu that never filters carries none of it. Importing it
 * gives every menu of this tier what `filterable` turns on.
 */
import { HelixHeadlessMenu } from '../root/menu-root.js'
import { filterMenu } from './menu-filter.js'

filterMenu(HelixHeadlessMenu)

export { filterMenu, MenuFilterController } from './menu-filter.js'

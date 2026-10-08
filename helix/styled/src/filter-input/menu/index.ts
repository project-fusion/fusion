/*
 * The picker for a field's filters: `@fusion.dev/helix/filter-input/menu`.
 *
 * Its own entry, because it draws its pages with `Menu` and most filter
 * fields have no picker: a field that only reads typed filters, or that only
 * shows chips, carries none of it. Importing it registers the element and the
 * `Menu` and `Divider` it draws with.
 */
export * from './filter-menu.js'

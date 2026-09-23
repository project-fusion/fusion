/**
 * The set at bold weight, which is what the package draws by default.
 *
 * **A subpath that says so, beside one that does not.** The root export is this
 * same weight, so nothing here is a second copy: an import site naming `bold`
 * is saying which weight it means rather than inheriting whichever the package
 * happens to default to, which is what makes the default changeable without
 * silently restyling somebody's application.
 */
export * from './generated.js'
export type { HelixIcon } from './types.js'

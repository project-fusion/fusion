/**
 * Where a component's source is read.
 *
 * The manifest records a path and not a URL, because the ref is not its
 * business: documentation will be versioned and a reader will choose the
 * version, so an archived page has to point at the source it documents rather
 * than at whatever `main` holds today. Composing the link here is what lets
 * that choice arrive later without touching a single component.
 *
 * `REF` is the seam. It is a constant now and becomes whatever the version
 * selector in preferences resolves to, at which point this is the only file
 * that changes.
 */
const REPOSITORY = 'https://github.com/project-fusion/fusion'

/** The ref a link points at. One value today, a reader's choice later. */
export const REF = 'main'

/** A link to a family's source directory, or nothing where the path is unknown. */
export const sourceUrl = (path: string, ref: string = REF): string | undefined =>
  path ? `${REPOSITORY}/tree/${ref}/${path}` : undefined

/**
 * Where a component's source is read.
 */
const REPOSITORY = 'https://github.com/project-fusion/fusion'

/** The ref a link points at. One value today, a reader's choice later. */
export const REF = 'main'

/** A link to a family's source directory, or nothing where the path is unknown. */
export const sourceUrl = (path: string, ref: string = REF): string | undefined =>
  path ? `${REPOSITORY}/tree/${ref}/${path}` : undefined

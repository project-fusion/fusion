import { navigation } from '@helix-io/docs'
import { redirect } from 'next/navigation'

/**
 * `/helix/docs` is the first page of the documentation, not a page of its own.
 *
 * A landing page in front of a table of contents is a click between a reader
 * and the thing they asked for, and the sidebar is the table of contents. The
 * first section is a path, so its first page is where the documentation starts
 * by construction rather than by a slug written here.
 */
export default function DocsIndex() {
  const first = navigation()[0]?.pages[0]
  redirect(first ? `/helix/docs/${first.slug}` : '/helix')
}

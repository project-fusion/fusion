import type { ReactNode } from 'react'
import { DocsShell } from '@/components/docs-shell/docs-shell'

/**
 * The shell every component page sits in.
 *
 * **`(reference)` is a route group, which is what keeps the index out of it.**
 * The gallery at `/helix/components` sits in the same directory as the family
 * pages, so without the group this layout catches it and the index of 89 cards
 * renders inside a documentation sidebar in a narrow column. A group has no URL
 * of its own, so `/helix/components/button` is unchanged.
 */
export default function ComponentsLayout({ children }: { children: ReactNode }) {
  return <DocsShell>{children}</DocsShell>
}

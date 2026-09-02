import type { ReactNode } from 'react'
import { DocsShell } from '@/components/docs-shell/docs-shell'

/**
 * The shell every documentation page sits in.
 *
 * The rail is shared with the component pages and renders the same tree on both:
 * prose and reference are one navigation, so a reader partway through Theming
 * can see that Card exists without going back to the masthead.
 */
export default function DocsLayout({ children }: { children: ReactNode }) {
  return <DocsShell>{children}</DocsShell>
}

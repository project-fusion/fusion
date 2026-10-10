import type { ReactNode } from 'react'
import GalleryLoading from '@/app/(site)/helix/components/(gallery)/loading'
import ReferenceLoading from '@/app/(site)/helix/components/(reference)/[family]/loading'
import InsightsLoading from '@/app/(site)/insights/loading'
import { DocsShell } from '@/components/docs-shell/docs-shell'

/**
 * The three stand-ins, each with the page it stands in for.
 *
 * **The page is what every navigation marks current.** A stand-in shows after
 * the address has changed, so the masthead and the docs rail around it are
 * already marking the page on its way. Drawn at `/stand-ins/…`, which nothing
 * holds, they would mark nothing, so the layout and the page hand `path` to
 * both. The reference page's is Button's, which is a page the suite pictures
 * loaded as well.
 */
export const STAND_INS: Record<string, { path: string; render: (path: string) => ReactNode }> = {
  components: { path: '/helix/components', render: () => <GalleryLoading /> },
  insights: { path: '/insights', render: () => <InsightsLoading /> },
  reference: {
    path: '/helix/components/button',
    render: (path) => (
      <DocsShell path={path}>
        <ReferenceLoading />
      </DocsShell>
    ),
  },
}

import type { ReactNode } from 'react'
import GalleryLoading from '@/app/(site)/helix/components/(gallery)/loading'
import ReferenceLoading from '@/app/(site)/helix/components/(reference)/[family]/loading'
import InsightsLoading from '@/app/(site)/insights/loading'
import SiteLoading from '@/app/loading'
import { DocsShell } from '@/components/docs-shell/docs-shell'

/** A stand-in, the page it stands in for, and whether the site chrome is around it. */
interface StandIn {
  /** `false` for the root loader, which shows in place of the chrome as well. */
  chrome?: false
  path: string
  render: (path: string) => ReactNode
}

/**
 * The stand-ins, each with the page it stands in for.
 *
 * **The page is what every navigation marks current.** A stand-in shows after
 * the address has changed, so the masthead and the docs rail around it are
 * already marking the page on its way. Drawn at `/stand-ins/…`, which nothing
 * holds, they would mark nothing, so the layout and the page hand `path` to
 * both. The reference page's is Button's, which is a page the suite pictures
 * loaded as well.
 *
 * **The wordmark is the root `loading.tsx`**, which the root layout shows in
 * place of everything under it, the masthead and footer included, so it is
 * drawn with no chrome around it.
 */
export const STAND_INS: Record<string, StandIn> = {
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
  wordmark: { chrome: false, path: '/', render: () => <SiteLoading /> },
}

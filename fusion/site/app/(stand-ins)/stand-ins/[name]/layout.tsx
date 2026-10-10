import type { ReactNode } from 'react'
import { SiteChrome } from '@/components/site-chrome/site-chrome'
import { STAND_INS } from './stand-ins'

/**
 * The site's chrome around a stand-in, with the masthead marking the page the
 * stand-in precedes.
 *
 * **A group of its own rather than a route under `(site)`**, because the site
 * layout reads the address and a page cannot tell it otherwise. This draws the
 * same `SiteChrome` and only hands it the path.
 */
export default async function StandInLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ name: string }>
}) {
  const { name } = await params
  return <SiteChrome path={STAND_INS[name]?.path}>{children}</SiteChrome>
}

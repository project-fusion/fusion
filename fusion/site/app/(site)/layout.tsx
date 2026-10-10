import type { ReactNode } from 'react'
import { SiteChrome } from '@/components/site-chrome/site-chrome'

/**
 * Header, content column, and footer: everything except the tools.
 */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return <SiteChrome>{children}</SiteChrome>
}

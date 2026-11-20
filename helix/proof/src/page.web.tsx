/* A screen on the web: the page's main landmark, in the column `web.css`
   draws. The document scrolls it. */
import type { ReactNode } from 'react'

export function Page({ children }: { readonly children?: ReactNode }) {
  return <main className="proof-page">{children}</main>
}

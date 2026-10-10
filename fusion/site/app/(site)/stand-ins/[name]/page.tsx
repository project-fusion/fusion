import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import type { ReactNode } from 'react'
import { DocsShell } from '@/components/docs-shell/docs-shell'
import GalleryLoading from '../../helix/components/(gallery)/loading'
import ReferenceLoading from '../../helix/components/(reference)/[family]/loading'
import InsightsLoading from '../../insights/loading'

/**
 * Each route's `loading.tsx`, held on screen so the visual tests can picture it.
 *
 * **A stand-in shows for as long as a render takes**, which is a few hundred
 * milliseconds at most and never while a test is looking. Rendered here on its
 * own, it is a page like any other, and its pictures sit beside the pictures
 * of the page it stands in for, at the same widths and in the same schemes.
 *
 * **Each is drawn inside the layout of the route it belongs to.** The gallery
 * and the insights index sit in the site layout as this route does; the
 * reference page sits in the docs shell as well, so this wraps it in one.
 *
 * **Absent from the deployed site.** A production server answers 404 unless
 * it was started with `SITE_STAND_INS=1`, which only the visual tests' `start`
 * command sets; `next dev` always answers. `connection()` defers the check to
 * the request, because a prerendered answer would be decided at build time,
 * where the variable is never set. A refusal there comes after the root
 * `loading.tsx` has begun the response, so it is the not-found page under a
 * 200 with `noindex`, which is how every streamed route on the site answers a
 * miss.
 */
const STAND_INS: Record<string, () => ReactNode> = {
  components: () => <GalleryLoading />,
  insights: () => <InsightsLoading />,
  reference: () => (
    <DocsShell>
      <ReferenceLoading />
    </DocsShell>
  ),
}

/* The three names and no others, so any other name is a 404 before a byte is
   sent, as the company and legal pages answer. */
export const dynamicParams = false

export function generateStaticParams() {
  return Object.keys(STAND_INS).map((name) => ({ name }))
}

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: 'Loading',
}

export default async function Page({ params }: { params: Promise<{ name: string }> }) {
  await connection()
  const { name } = await params
  const standIn = STAND_INS[name]
  const served = process.env.NODE_ENV === 'development' || process.env.SITE_STAND_INS === '1'
  if (!(served && standIn)) {
    notFound()
  }
  return standIn()
}

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { STAND_INS } from './stand-ins'

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

/**
 * Each route's `loading.tsx`, held on screen so the visual tests can picture it.
 *
 * **A stand-in shows for as long as a render takes**, which is a few hundred
 * milliseconds at most and never while a test is looking. Rendered here on its
 * own, it is a page like any other, and its pictures sit beside the pictures
 * of the page it stands in for, at the same widths and in the same schemes.
 *
 * **Each is drawn inside the chrome of the route it belongs to**, which
 * `layout.tsx` beside this draws, and the reference page inside the docs shell
 * as well. Both are told the page each stands in for, in `stand-ins.tsx`.
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
export default async function Page({ params }: { params: Promise<{ name: string }> }) {
  await connection()
  const { name } = await params
  const standIn = STAND_INS[name]
  const served = process.env.NODE_ENV === 'development' || process.env.SITE_STAND_INS === '1'
  if (!(served && standIn)) {
    notFound()
  }
  return standIn.render(standIn.path)
}

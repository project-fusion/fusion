import { Suspense } from 'react'
import { FilmCapture } from './capture'

export const metadata = { title: 'Watch' }

/**
 * Full-bleed theater for the scale film.
 *
 * `?capture=1` freezes the clock so the encode script can step by timestamp.
 */
export default function Page() {
  return (
    <Suspense>
      <FilmCapture />
    </Suspense>
  )
}

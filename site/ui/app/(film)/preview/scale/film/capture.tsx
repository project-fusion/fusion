'use client'

import { useSearchParams } from 'next/navigation'
import { CinematicMode } from '../../../../(site)/preview/scale/cinematic-mode'
import { WorldFilm } from '../../../../(site)/preview/scale/world-film'

/**
 * Reads the capture flag from the query. The theater page is a server file so
 * it can own metadata; this is the client island that has to see the URL.
 */
export function FilmCapture() {
  const params = useSearchParams()
  return (
    <CinematicMode>
      <WorldFilm capture={params.get('capture') === '1'} />
    </CinematicMode>
  )
}

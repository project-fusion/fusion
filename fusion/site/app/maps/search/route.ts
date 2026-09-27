import { searchPlaces } from '@/utils/place-search/place-search'

/** Searches a second this instance sends the geocoder. */
const RATE = 4

/** The shortest search worth sending, and the longest a place is written in. */
const SHORTEST = 2
const LONGEST = 120

/** When each search this second was sent, oldest first. */
const sent: number[] = []

/** Whether a search may go now, and if so, counted as gone. */
const allowed = (now: number): boolean => {
  while (sent.length > 0 && now - (sent[0] ?? now) >= 1000) {
    sent.shift()
  }
  if (sent.length >= RATE) {
    return false
  }
  sent.push(now)
  return true
}

const degrees = (value: unknown, limit: number): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= limit
    ? value
    : undefined

/**
 * Place search for the Maps page, between the page and the geocoder.
 *
 * **A POST, so what a reader types is never in a URL.** A hosting provider
 * logs every request's URL, and a search in the query string would put the
 * text in those logs. The body is not logged, and this route keeps nothing:
 * no log line and no cache. The geocoder is asked from here, so it sees this
 * server and not the reader.
 *
 * **Throttled for the geocoder's sake.** Photon's public instance is fair
 * use, so this instance sends it at most `RATE` searches a second, and
 * answers 429 past that. The page waits for a pause in typing before it
 * asks.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const query = typeof body.q === 'string' ? body.q.trim() : ''
  if (query.length < SHORTEST || query.length > LONGEST) {
    return Response.json({ places: [] })
  }
  if (!allowed(Date.now())) {
    return Response.json({ error: 'busy' }, { status: 429 })
  }
  const lat = degrees(body.lat, 90)
  const lng = degrees(body.lng, 180)
  const language = typeof body.lang === 'string' ? body.lang.slice(0, 2).toLowerCase() : 'en'
  try {
    const places = await searchPlaces(query, {
      language,
      near: lat === undefined || lng === undefined ? undefined : { lat, lng },
    })
    return Response.json({ places })
  } catch {
    return Response.json({ error: 'unavailable' }, { status: 502 })
  }
}

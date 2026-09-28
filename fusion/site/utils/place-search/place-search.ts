/**
 * Places found by what a reader typed, from Photon, komoot's search over
 * OpenStreetMap, shaped for a search field and a map.
 *
 * **Photon's public instance** is fair use with no promise of availability,
 * which suits the Maps page's demo and not a product. The route that calls it
 * is the one place that knows it, so another geocoder is a change here.
 */

/** A place a search found: what the list shows, and where the map goes. */
export interface FoundPlace {
  /** Where an area is, to frame all of it: west, south, east, north, in degrees. */
  bounds?: [number, number, number, number] | undefined
  /** The rest of its address, such as "Austin, Texas, United States". */
  detail: string
  /** Unique within one search, for the list's option values. */
  id: string
  lat: number
  lng: number
  /** Its name, or its number and street. */
  name: string
}

/** The one feature of Photon's GeoJSON the search reads. */
interface PhotonFeature {
  geometry?: { coordinates?: [number, number] }
  properties?: {
    city?: string
    country?: string
    county?: string
    district?: string
    extent?: [number, number, number, number]
    housenumber?: string
    locality?: string
    name?: string
    osm_id?: number
    osm_type?: string
    state?: string
    street?: string
  }
}

/** The public instance, which asks for a named client and fair use. */
const PHOTON = 'https://photon.komoot.io/api/'

/** The languages Photon writes names in. Any other is its default, the local name. */
const LANGUAGES = new Set(['de', 'en', 'fr'])

/** How many places a search offers, which a list can show without scrolling. */
const LIMIT = 6

/**
 * The rest of a place's address after its name, each part once: its street
 * where the name is not already the street, its town, its state, and its
 * country. The town is the city, or the nearest smaller or larger area where
 * there is no city.
 */
const detailOf = (properties: NonNullable<PhotonFeature['properties']>, name: string): string => {
  const parts = [
    properties.name && properties.street ? properties.street : undefined,
    properties.city ?? properties.locality ?? properties.district ?? properties.county,
    properties.state,
    properties.country,
  ].filter((part): part is string => Boolean(part) && part !== name)
  return [...new Set(parts)].join(', ')
}

/**
 * Photon's features as places: named by their name, or their number and
 * street, and framed by their extent where they have one. Photon writes an
 * extent west, north, east, south, which is turned to west, south, east, north.
 */
export const placesFrom = (features: readonly PhotonFeature[]): FoundPlace[] => {
  /* **Each place once, by what the list says of it**: a building mapped as
     its outline and as the entrances on it comes back as several features
     with the same name and address, which the list could not tell apart. */
  const said = new Set<string>()
  return features.flatMap((feature, index) => {
    const [lng, lat] = feature.geometry?.coordinates ?? []
    const properties = feature.properties ?? {}
    const street = [properties.housenumber, properties.street].filter(Boolean).join(' ')
    const name = properties.name ?? street
    if (typeof lat !== 'number' || typeof lng !== 'number' || !name) {
      return []
    }
    const [west, north, east, south] = properties.extent ?? []
    const bounds =
      [west, south, east, north].every((one) => typeof one === 'number') && west !== east
        ? ([west, south, east, north] as [number, number, number, number])
        : undefined
    const detail = detailOf(properties, name)
    if (said.has(`${name}|${detail}`)) {
      return []
    }
    said.add(`${name}|${detail}`)
    return [
      {
        bounds,
        detail,
        id: `${properties.osm_type ?? 'P'}${properties.osm_id ?? index}`,
        lat,
        lng,
        name,
      },
    ]
  })
}

/** Asks Photon one question, streets only where `layer` says so. */
const ask = async (
  query: string,
  {
    language,
    layer,
    limit,
    near,
  }: {
    language: string
    layer?: 'street' | undefined
    limit: number
    near?: { lat: number; lng: number } | undefined
  },
): Promise<PhotonFeature[]> => {
  const url = new URL(PHOTON)
  url.searchParams.set('q', query)
  url.searchParams.set('limit', String(limit))
  if (LANGUAGES.has(language)) {
    url.searchParams.set('lang', language)
  }
  if (layer) {
    url.searchParams.set('layer', layer)
  }
  if (near) {
    url.searchParams.set('lat', near.lat.toFixed(2))
    url.searchParams.set('lon', near.lng.toFixed(2))
  }
  const response = await fetch(url, {
    /* **Not cached**: a cache is keyed by the address asked, and that
       address holds what the reader typed, which the privacy policy says we
       do not keep. */
    cache: 'no-store',
    headers: { 'user-agent': 'fusion.dev Maps search demo (https://fusion.dev/helix/maps)' },
  })
  if (!response.ok) {
    throw new Error(`Photon answered ${response.status}`)
  }
  const body = (await response.json()) as { features?: PhotonFeature[] }
  return body.features ?? []
}

/**
 * A house number at the start of a search, and the rest of it: `1234` and
 * `Main St, Dallas` from `1234 Main St, Dallas`. A number with a letter or a
 * range, such as `221B` or `10-12`, is one too.
 */
const numbered = (query: string): { number: string; rest: string } | undefined => {
  const match = /^\s*(\d+[a-z]?(?:-\d+[a-z]?)?)\s+(.*\S.*)$/i.exec(query)
  return match?.[1] && match[2] ? { number: match[1], rest: match[2] } : undefined
}

/** Street words written short, by their long form. */
const SHORT: Record<string, string> = {
  ave: 'avenue',
  blvd: 'boulevard',
  ct: 'court',
  dr: 'drive',
  e: 'east',
  hwy: 'highway',
  ln: 'lane',
  n: 'north',
  ne: 'northeast',
  nw: 'northwest',
  pkwy: 'parkway',
  pl: 'place',
  rd: 'road',
  s: 'south',
  se: 'southeast',
  sq: 'square',
  st: 'street',
  sw: 'southwest',
  w: 'west',
}

/** The words of a street's name that say which way or what kind it is, and not which street. */
const GENERIC = new Set([
  ...Object.keys(SHORT),
  ...Object.values(SHORT),
  'alley',
  'loop',
  'ste',
  'suite',
  'trail',
  'way',
])

/** The words of some text, lowercased, without its punctuation. */
const wordsOf = (text: string): string[] =>
  text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)

/** Whether a typed word is a word of an address, or the start of one, as `Aus` is of `Austin` while it is typed. */
const names = (typed: string, word: string): boolean =>
  word.startsWith(typed) || word === SHORT[typed]

/**
 * Whether an answer is the address asked for: it carries the number, its
 * street is named in what was typed, and every other word typed is a word of
 * its address. A number alone is not enough: `1234 Main St Dallas` found a
 * 1234 on a Main Street in California, and `2425 E Camelback Rd` a 2425 on
 * another street in a district named Camelback East.
 */
const isAddress = (feature: PhotonFeature, asked: { number: string; rest: string }): boolean => {
  const properties = feature.properties ?? {}
  if (properties.housenumber?.toLowerCase() !== asked.number.toLowerCase()) {
    return false
  }
  const typed = wordsOf(asked.rest)
  const street = wordsOf(properties.street ?? '').filter((word) => !GENERIC.has(word))
  if (!street.some((word) => typed.some((one) => names(one, word)))) {
    return false
  }
  const address = wordsOf(
    [
      properties.street,
      properties.locality,
      properties.district,
      properties.city,
      properties.county,
      properties.state,
      properties.country,
    ].join(' '),
  )
  return typed.every((one) => address.some((word) => names(one, word)))
}

/**
 * A search with its street words written out, `E Camelback Rd` as `East
 * Camelback Road`, which is how the map's streets are named and so what
 * Photon matches them by.
 */
const spelledOut = (text: string): string =>
  text.replace(/[\p{L}]+/gu, (word) => SHORT[word.toLowerCase()] ?? word)

/** How many streets a missed number offers, ahead of what else matched. */
const STREETS = 3

/**
 * Asks Photon for the places matching `query`, near `near` where it is given,
 * which ranks what is close to the map's view first.
 *
 * **A house number that is not mapped falls back to its street.** Photon
 * knows only the numbers mapped in OpenStreetMap, which in much of the United
 * States is few of them, and for a number it does not know it answers with
 * whatever else matches the words, such as a hotel down the block. So where
 * the search starts with a number and no answer carries it, the rest of the
 * search is asked again for streets only, and those lead the list, each saying
 * that its number is not mapped. The second question is asked only then, which
 * keeps the load on Photon to one question for most searches.
 */
export const searchPlaces = async (
  query: string,
  { language, near }: { language: string; near?: { lat: number; lng: number } | undefined },
): Promise<FoundPlace[]> => {
  const found = await ask(query, { language, limit: LIMIT, near })
  const asked = numbered(query)
  if (!asked || found.some((feature) => isAddress(feature, asked))) {
    return placesFrom(found)
  }
  const streets = placesFrom(
    await ask(spelledOut(asked.rest), { language, layer: 'street', limit: STREETS, near }),
  ).map((street) => ({
    ...street,
    detail: [`Number ${asked.number} is not mapped`, street.detail].filter(Boolean).join('. '),
    id: `street-${street.id}`,
  }))
  return [...streets, ...placesFrom(found)].slice(0, LIMIT)
}

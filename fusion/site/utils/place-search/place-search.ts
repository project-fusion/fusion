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

/**
 * Asks Photon for the places matching `query`, near `near` where it is given,
 * which ranks what is close to the map's view first.
 */
export const searchPlaces = async (
  query: string,
  { language, near }: { language: string; near?: { lat: number; lng: number } | undefined },
): Promise<FoundPlace[]> => {
  const url = new URL(PHOTON)
  url.searchParams.set('q', query)
  url.searchParams.set('limit', String(LIMIT))
  if (LANGUAGES.has(language)) {
    url.searchParams.set('lang', language)
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
  return placesFrom(body.features ?? [])
}

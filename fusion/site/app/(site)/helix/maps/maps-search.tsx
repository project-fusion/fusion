'use client'

import type { HelixCombobox, HelixFilterEvent } from '@fusion.dev/helix'
import { useEffect, useRef, useState } from 'react'
import type { FoundPlace } from '@/utils/place-search/place-search'
import styles from './maps.module.css'

/** How long typing pauses before a search is sent, in milliseconds. */
const PAUSE = 300

/** The shortest search sent, which the route also holds to. */
const SHORTEST = 2

/**
 * A field that finds a place by its name or address and hands it to the map.
 *
 * **Searched as you type, and asked once typing pauses**: each keystroke
 * cancels the list's own filtering, since the geocoder has already chosen
 * what matches, and the search goes to the site's route after `PAUSE`. A
 * search answered after a newer one was sent is dropped, so a slow answer
 * cannot replace a fresh one.
 *
 * **What it found is said**, in a polite live region under the field: how
 * many places, or that there were none, or that search is unavailable. The
 * geocoder is credited beside it, since what you type goes to it.
 */
export function MapsSearch({
  back,
  near,
  onChoose,
}: {
  /** What the button that returns the map to where it started says, such as "Back to the walk". */
  back: string
  /** Where the map is looking, which ranks nearby places first. */
  near: () => { lat: number; lng: number } | undefined
  /** A place was chosen, or the map was sent back, with `undefined`. */
  onChoose: (place: FoundPlace | undefined) => void
}) {
  const field = useRef<HelixCombobox>(null)
  const [places, setPlaces] = useState<FoundPlace[]>([])
  const [away, setAway] = useState(false)
  const [loading, setLoading] = useState(false)
  const [said, setSaid] = useState('')
  /* The latest search sent, so an older answer is known and dropped. */
  const latest = useRef(0)
  const waiting = useRef(0)
  const nearRef = useRef(near)
  nearRef.current = near
  const chooseRef = useRef(onChoose)
  chooseRef.current = onChoose
  const placesRef = useRef(places)
  placesRef.current = places

  useEffect(() => {
    const host = field.current
    if (!host) {
      return
    }
    const search = async (query: string, asked: number): Promise<void> => {
      const view = nearRef.current()
      try {
        const response = await fetch('/maps/search', {
          body: JSON.stringify({
            lang: document.documentElement.lang || 'en',
            q: query,
            ...(view ? { lat: view.lat, lng: view.lng } : {}),
          }),
          headers: { 'content-type': 'application/json' },
          method: 'POST',
        })
        if (asked !== latest.current) {
          return
        }
        if (!response.ok) {
          setPlaces([])
          setSaid(
            response.status === 429
              ? 'Search is busy. Try again in a moment.'
              : 'Search is not available right now.',
          )
          return
        }
        const { places: found } = (await response.json()) as { places: FoundPlace[] }
        setPlaces(found)
        setSaid(
          found.length === 0
            ? 'No places found.'
            : `${found.length} ${found.length === 1 ? 'place' : 'places'} found.`,
        )
      } catch {
        if (asked === latest.current) {
          setPlaces([])
          setSaid('Search is not available right now.')
        }
      } finally {
        if (asked === latest.current) {
          setLoading(false)
        }
      }
    }
    const typed = (event: HelixFilterEvent): void => {
      /* The geocoder has chosen what matches, so the list shows all it sent. */
      event.preventDefault()
      const query = event.detail.value.trim()
      clearTimeout(waiting.current)
      latest.current += 1
      const asked = latest.current
      if (query.length < SHORTEST) {
        setPlaces([])
        setLoading(false)
        setSaid('')
        return
      }
      setLoading(true)
      waiting.current = window.setTimeout(() => {
        void search(query, asked)
      }, PAUSE)
    }
    const chosen = (): void => {
      setSaid('')
      const value = host.value
      const place =
        typeof value === 'string' && value
          ? placesRef.current.find((one) => one.id === value)
          : undefined
      setAway(place !== undefined)
      chooseRef.current(place)
    }
    host.addEventListener('helix-filter', typed)
    host.addEventListener('change', chosen)
    return () => {
      clearTimeout(waiting.current)
      host.removeEventListener('helix-filter', typed)
      host.removeEventListener('change', chosen)
    }
  }, [])

  return (
    <div className={styles.mapsSearch}>
      <helix-combobox
        empty-text="No places found"
        label="Go to a place"
        list-label="Places"
        loading={loading}
        loading-text="Searching"
        placeholder="An address or a city"
        ref={field}
      >
        {places.map((place) => (
          <helix-option
            description={place.detail}
            key={place.id}
            label={place.name}
            value={place.id}
          >
            {place.name}
          </helix-option>
        ))}
      </helix-combobox>
      <helix-flex align-items="baseline" gap="sm" justify-content="between" wrap>
        <helix-text class={styles.mapsSearchNote} variant="caption">
          <span aria-live="polite">{said}</span>
          {said ? ' ' : ''}Search by Photon, with OpenStreetMap data.
        </helix-text>
        {/* Clears the field and sends the map back, once it has gone somewhere. */}
        {away ? (
          <button
            className={styles.mapsSearchBack}
            data-link
            onClick={() => {
              if (field.current) {
                field.current.value = ''
              }
              setAway(false)
              onChoose(undefined)
            }}
            type="button"
          >
            {back}
          </button>
        ) : null}
      </helix-flex>
    </div>
  )
}

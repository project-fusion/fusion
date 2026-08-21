'use client'

import { useRef, useState } from 'react'
import { FILM_DURATION, OceanWorld } from './ocean-world'
import '../../../preview.css'

/**
 * Watch theater over the live world.
 *
 * The picture is the ocean, the sun plate, and the water from below, on a
 * camera that actually moves. Captions sit in the site's type over that.
 */

interface Line {
  /**
   * When it appears, in seconds from the start.
   */
  at: number
  /**
   * How long it stays.
   */
  hold: number
  /**
   * The line.
   */
  text: string
}

const CAPTIONS: Line[] = [
  { at: 17.2, hold: 10.4, text: 'Energy is the missing floor.' },
  { at: 33.2, hold: 10.4, text: 'Fuel from seawater. No import. No cartel.' },
]

const TITLES: Line[] = [
  { at: 1.2, hold: 5.8, text: 'Fusion' },
  { at: 44.6, hold: 3.2, text: 'Fusion' },
]

const activeLine = (lines: Line[], time: number) =>
  [...lines].reverse().find((line) => time >= line.at && time < line.at + line.hold)?.text ?? ''

interface WorldFilmProps {
  /**
   * When set, the clock is frozen for capture.
   */
  capture?: boolean
}

/**
 * Full-viewport theater around the live world.
 */
export function WorldFilm({ capture = false }: WorldFilmProps) {
  const captionRef = useRef('')
  const titleRef = useRef('')
  const [caption, setCaption] = useState('')
  const [title, setTitle] = useState('')

  return (
    <div className="scTheater" data-capture={capture ? '' : undefined}>
      {capture ? null : (
        <a className="scTheaterClose" href="/preview/scale">
          Close
        </a>
      )}
      <OceanWorld
        capture={capture}
        onTime={(time) => {
          const nextCaption = activeLine(CAPTIONS, time)
          const nextTitle = activeLine(TITLES, time)
          if (nextCaption !== captionRef.current) {
            captionRef.current = nextCaption
            setCaption(nextCaption)
          }
          if (nextTitle !== titleRef.current) {
            titleRef.current = nextTitle
            setTitle(nextTitle)
          }
        }}
        theater
      />
      <div aria-hidden="true" className="scTheaterScrim" />
      {title ? (
        <p className="scTheaterTitle" data-tone={caption ? 'quiet' : undefined}>
          {title}
        </p>
      ) : null}
      {caption ? <p className="scTheaterCaption">{caption}</p> : null}
      {capture ? null : (
        <div aria-hidden="true" className="scFilmProgress">
          <i style={{ animationDuration: `${FILM_DURATION}s` }} />
        </div>
      )}
    </div>
  )
}

'use client'

import { useEffect, useRef, useState } from 'react'
import styles from '../insights.module.css'

/* How far through the argument a reader is, and how long ago it was written.

   A plain comment rather than a doc one: the block below documents
   `ReadingProgress`, and two doc comments in a row leave the first documenting
   nothing.

   Two client components on an otherwise server-rendered page, for the same
   reason the showcase is one: what needs state is a scroll position and a
   clock, and neither of those exists at build time. Everything else about a
   post stays server rendered. */

/**
 * A line under the masthead that fills as the article is read.
 *
 * **Not the chip, and that is the whole design note.** The obvious home for
 * this is the `n min read` tag, which already states the duration and would
 * state the remainder for free. It cannot: that tag is in the masthead, and the
 * masthead has scrolled away by the second paragraph. A progress indicator that
 * is only legible before you start reading and after you finish is an ornament
 * with a number attached.
 *
 * So it goes where it can be seen the whole time, which is the one strip of the
 * page that never moves. `AppHeader` is `position: sticky` at
 * `--helix-layer-sticky`, and this sits at the same rung, pinned to the header's
 * own height, so it rides the bottom edge of the bar rather than floating under
 * it.
 *
 * **It measures the document, after two attempts at measuring the article.**
 * Scoping it to the body is the better-sounding idea, since the masthead and
 * "keep reading" are not the argument, and both ways of doing it measured
 * wrong on a real post.
 *
 * `height - innerHeight`, the version everybody writes, is how far the body's
 * box travels: on a 962 body in a 900 window that is 62 pixels of travel, so
 * the bar went 0 to 1 inside one flick of a wheel and was a switch rather than
 * a meter. `innerHeight - top`, how much of the body has passed the fold,
 * spans properly but starts wherever the body already is: measured at 0.479 at
 * rest, so the page loaded with the bar half full, which is true and reads as a
 * lie because nobody has read anything yet.
 *
 * The trouble is real rather than arithmetic. A post barely taller than the
 * window has almost no reading scroll in it, and no honest article-relative
 * number can span 0 to 1 over a distance that is not there. The document does
 * have that distance, always, and it is the same distance the scrollbar is
 * already reporting. The chrome it includes is a masthead and three rows,
 * which is a smaller error than either of the ones it replaces.
 *
 * `scaleX` on a full-width bar rather than an animated `inline-size`, so the
 * fill is a compositor transform and a scroll handler never triggers layout.
 * `passive` for the same reason.
 */
export function ReadingProgress() {
  const [progress, setProgress] = useState(0)
  const frame = useRef(0)

  useEffect(() => {
    const measure = () => {
      /* The scrollable distance, which is zero on a page that fits the window.
         Nothing to report there, and nothing to divide by either. */
      const runway = document.documentElement.scrollHeight - window.innerHeight
      const next = runway <= 0 ? 0 : window.scrollY / runway
      setProgress(Math.min(1, Math.max(0, next)))
    }

    /* Coalesced to a frame. A scroll handler runs far more often than the
       screen redraws, and setting state on every one of them is work nobody
       sees. */
    const onScroll = () => {
      cancelAnimationFrame(frame.current)
      frame.current = requestAnimationFrame(measure)
    }

    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(frame.current)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  return (
    /* `aria-hidden`, and it is not laziness. The same fact is already in the
       page as text, in the `n min read` tag, and a progress bar announcing
       itself on every scroll frame is the noisiest possible way to say
       something a reader was told once and quietly. */
    <div aria-hidden="true" className={styles.readingProgress} style={{ scale: `${progress} 1` }} />
  )
}

/**
 * The publication date, with how long ago that was on hover.
 *
 * **Client rendered because the answer changes while the file does not.** These
 * pages are static, so a relative phrase computed at build time is a lie that
 * gets worse every day it is cached: a post built as "two days ago" still says
 * so a year later. The absolute date is what renders, which is what a static
 * page can honestly claim, and the relative one arrives when there is a clock.
 *
 * `Intl.RelativeTimeFormat` rather than arithmetic on strings, so the phrasing
 * is the reader's locale's rather than English pretending to be universal.
 */
export function PublishedOn({ children, date }: { children: string; date: string }) {
  const [ago, setAgo] = useState<string>()

  useEffect(() => {
    const then = new Date(`${date}T00:00:00Z`).getTime()
    const days = Math.round((then - Date.now()) / 86_400_000)
    const format = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
    const [amount, unit]: [number, Intl.RelativeTimeFormatUnit] =
      Math.abs(days) < 31
        ? [days, 'day']
        : Math.abs(days) < 365
          ? [Math.round(days / 30), 'month']
          : [Math.round(days / 365), 'year']
    setAgo(format.format(amount, unit))
  }, [date])

  return (
    <time dateTime={date} title={ago}>
      {children}
    </time>
  )
}

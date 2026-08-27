'use client'

import { type RefObject, useEffect } from 'react'

/**
 * The sample every option shows, and the only glyphs its face is asked for.
 *
 * Stated here rather than in the markup because the two cannot disagree: the
 * request below subsets the face to exactly these characters, so a sample
 * showing anything else would show it in the fallback and nothing would say so.
 */
export const FACE_SAMPLE = 'Ag'

/**
 * Loads a Google face only while one of its options is on screen.
 *
 * **A preview has to load the font, and there are 1,893 of them.** That is the
 * whole problem. The builder's rule for the chosen faces is written beside
 * `fontsHref`: only the ones actually in use, and only while they are in use,
 * because requesting the list up front would fetch five faces to show one. A
 * preview on every option is the same request multiplied by the catalog, and
 * nothing about wanting to see a face justifies downloading two thousand.
 *
 * So the list is the trigger rather than the render. An `IntersectionObserver`
 * over the preview spans reports the handful a reader can actually see, and
 * only those are asked for. Scrolling the whole catalog would eventually load
 * all of it, which is correct: a reader who scrolled past every face has looked
 * at every face.
 *
 * **Batched, because one request per option is the version that does not
 * ship.** The CSS2 endpoint takes many families in one URL, so a scroll fires a
 * few requests rather than a few hundred.
 *
 * **A timer rather than a `requestAnimationFrame`, and that was a bug before it
 * was a preference.** The first version scheduled the batch on a frame, which
 * is a rendering hook: a hidden tab renders nothing, so the callback never runs.
 * Measured in a pane reporting `visibilityState: hidden`, `requestAnimationFrame`
 * did not fire at all. On its own that is harmless, a tab nobody is looking at
 * needing no previews, and it was not on its own: a family was written into
 * `asked` when it was collected rather than when it was sent, so a batch the
 * frame never delivered left those families marked as requested forever. They
 * would stay blank after the tab came back, which is the failure that outlives
 * the condition that caused it.
 *
 * So the mark moves to the send, and the send runs on a timer, which a hidden
 * tab throttles rather than stops.
 *
 * **One weight, not three.** The chosen faces are asked for 400, 500 and 600
 * because the token layer sets all three; a sample of two letters needs the
 * first one the family has, and asking for the others triples a request whose
 * whole point is to be cheap.
 *
 * **Nothing is unloaded.** A face already fetched is in the browser's cache and
 * removing its stylesheet would only make the next scroll past it fetch again.
 * The `Set` is what stops a family being requested twice in a session.
 *
 * Degrades to nothing. Without the network the observer still fires, the
 * request fails, and every sample stays in the fallback face: the list is a
 * list of names either way, which is what it was before any of this.
 */
export function useFacePreviews(root: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const host = root.current
    if (!host || typeof IntersectionObserver === 'undefined') {
      return
    }

    /* **Connect to the font host once, before anything needs it.**
       A CSS2 stylesheet names files on `fonts.gstatic.com`, a second origin the
       browser has not met, so the first face pays a DNS lookup and a TLS
       handshake before a byte of it moves. Opening that connection while the
       reader is still deciding to scroll takes both out of the critical path,
       which is the largest single saving available here and is one element.
       `crossorigin`, because fonts are fetched in CORS mode and a connection
       opened without it is not the one the fetch will use. */
    for (const host of ['https://fonts.googleapis.com', 'https://fonts.gstatic.com']) {
      if (!document.querySelector(`link[rel="preconnect"][href="${host}"]`)) {
        const hint = document.createElement('link')
        hint.crossOrigin = ''
        hint.href = host
        hint.rel = 'preconnect'
        document.head.append(hint)
      }
    }

    const asked = new Set<string>()
    let pending: string[] = []
    let timer: ReturnType<typeof setTimeout> | undefined

    const send = (): void => {
      timer = undefined
      const batch = pending.filter((request) => !asked.has(request))
      pending = []
      if (batch.length === 0) {
        return
      }
      /* Marked here rather than on collection, so a batch that never went out
         does not leave its families believing they have been asked for. */
      for (const request of batch) {
        asked.add(request)
      }
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      /* `display=swap`, so a sample shows its fallback until the face lands
         rather than showing nothing. Which face a reader is looking at while
         that happens is what `ready` below answers. */
      /* **`text` is the whole difference between this being cheap and being a
         download.** Google will subset a face to the characters actually asked
         for, and a two-letter specimen needs two of them. Measured on Inter at
         400: the full stylesheet is 2,646 bytes naming seven `@font-face` blocks
         and 95,020 bytes of font behind them, of which a browser fetches the
         latin one at 10,236; subset to `Ag` it is 290 bytes naming one block and
         1,128 bytes of font. Nine times less to move, and the stylesheet saving
         compounds because a batch of twenty families shares one of them.

         **It cannot collide with the face a reader actually picks.** That one is
         requested by `fontsHref` in the builder, in full and at three weights,
         under a different URL. A subset good for two glyphs is never handed to
         the page being previewed. */
      link.href = `https://fonts.googleapis.com/css2?${batch
        .map((request) => `family=${request}`)
        .join('&')}&text=${encodeURIComponent(FACE_SAMPLE)}&display=swap`
      /* **Ask the browser when each face has actually arrived**, rather than
         assuming the stylesheet landing is the same thing. It is not: the CSS is
         one round trip and the woff2 it names is another, and between them a
         sample renders in the fallback while claiming to be the face. Marking on
         `document.fonts.load` is what lets a skeleton stand down at the moment
         there is something true to show.

         **After the stylesheet, and only on a non-empty result.** Both halves
         are guarding the same race, and it fails in the one direction that
         matters. `document.fonts.load` for a family the document has never heard
         of does not reject: it resolves with an empty array. Called in the same
         tick the `<link>` was appended, before the CSS has been parsed, it would
         resolve empty for every family in the batch and mark every sample ready,
         and a skeleton that stands down early is worse than one that never
         appeared, because what replaces it is the fallback wearing another
         family's name.

         Per family rather than on `document.fonts.ready`, which resolves for the
         whole batch and would hold every sample behind the slowest face in it. */
      link.addEventListener('load', () => {
        for (const request of batch) {
          const family = decodeURIComponent(request.split(':')[0] ?? '').replace(/\+/g, ' ')
          if (family === '') {
            continue
          }
          /* **The sample is passed, and subsetting is why.** `document.fonts.load`
             checks the face against a string, and its default is `BESbswy`: a
             face subset to `Ag` contains none of those letters, so the call
             resolves empty against a font that loaded perfectly. Measured
             directly: without the text it resolves 0 faces and with it 1, so the
             guard below would have read a working face as a failed one and left
             every skeleton up forever. Asking about the glyphs actually being
             shown is both the correct question and the only one this subset can
             answer. */
          void document.fonts
            .load(`1em "${family}"`, FACE_SAMPLE)
            .then((faces) => {
              if (faces.length === 0) {
                return
              }
              for (const sample of document.querySelectorAll<HTMLElement>(
                `[data-face-request="${CSS.escape(request)}"]`,
              )) {
                sample.dataset.faceReady = ''
              }
            })
            /* A face that will not load keeps its skeleton, which is honest: the
               sample beside it would be the fallback under another name. */
            .catch(() => {})
        }
      })

      document.head.append(link)
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            continue
          }
          const request = (entry.target as HTMLElement).dataset.faceRequest
          observer.unobserve(entry.target)
          if (request === undefined || asked.has(request) || pending.includes(request)) {
            continue
          }
          pending.push(request)
        }
        /* Short, because this is latency a reader sees rather than a budget to
           spend. It exists to gather one delivery of the observer into one URL,
           not to wait for more. */
        if (pending.length > 0 && timer === undefined) {
          timer = setTimeout(send, 30)
        }
      },
      /* **Four screens of lookahead, because one was not enough.** The list's
         own viewport is about 220px, so the first version's 200px margin bought
         a single screen of warning and a reader scrolling at any speed outran
         it: rows arrived before their faces did. A request has two round trips
         in it, the stylesheet and then the file it names, so the margin has to
         cover the scrolling done during both. */
      { rootMargin: '900px' },
    )

    for (const sample of host.querySelectorAll<HTMLElement>('[data-face-request]')) {
      observer.observe(sample)
    }

    return () => {
      observer.disconnect()
      if (timer !== undefined) {
        clearTimeout(timer)
      }
    }
  }, [root])
}

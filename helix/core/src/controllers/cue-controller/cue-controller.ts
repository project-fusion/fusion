import type { ReactiveController, ReactiveControllerHost } from 'lit'

/** One caption track, named as the menu names it. */
export interface Caption {
  label: string
  language: string
}

/** A `<track>` as the consumer wrote it, reduced to what naming it needs. */
interface TrackCopy {
  attrs: Record<string, string>
  tag: string
}

/**
 * The tracks a reader could choose between, in the order they were written.
 *
 * Filtered by kind, because `textTracks` also carries `chapters`, `metadata`
 * and `descriptions`, and a menu offering "Chapters" as a subtitle language
 * would be offering something that draws no words. Read off the media element
 * rather than off the slot: a `<track>` added later is in one and not the
 * other, and the element is the one that has resolved them.
 */
export const captionTracks = (media: HTMLMediaElement | null): TextTrack[] => {
  const tracks = media?.textTracks
  if (!tracks) {
    return []
  }
  return [...tracks].filter((one) => one.kind === 'subtitles' || one.kind === 'captions')
}

/**
 * Shows one track and disables every other, or shows none at `-1`.
 *
 * Every other, rather than only the one that was on. Two tracks in `hidden`
 * both fire `cuechange`, so the rendered cue becomes whichever fired last and
 * a reader who switched language gets the two interleaved. Measured as two
 * subtitles alternating line by line.
 *
 * `hidden`, never `showing`. Hidden is the mode where a track still fires
 * `cuechange` and still fills `activeCues`, and the browser draws nothing,
 * which is exactly what is wanted when something else is doing the drawing.
 */
export const showCaption = (tracks: readonly TextTrack[], index: number): void => {
  tracks.forEach((track, at) => {
    track.mode = at === index ? 'hidden' : 'disabled'
  })
}

/**
 * Whether a track the platform started showing is now ours to draw.
 *
 * A `<track default>` arrives `showing`, which is the browser drawing it.
 * Moved to `hidden` so the cues keep coming and we draw them instead. What
 * comes back is whether captions are on, which is not always "off": a button
 * that began there reported the opposite of what was on screen.
 */
export const adoptTrack = (track: TextTrack): boolean => {
  if (track.mode === 'showing') {
    track.mode = 'hidden'
  }
  return track.mode === 'hidden'
}

/**
 * The caption tracks among the copies, before the render that draws them.
 *
 * By the platform's own reading of `kind`, which is what makes a `<track>` a
 * caption at all: missing is `subtitles` and anything it does not know is
 * `metadata`. Read from the video's tracks after the render instead, the count
 * arrived a render late and asked for one more. Choosing one still goes
 * through the video's tracks, which hold them in the same order.
 */
export const captionsAmong = (media: readonly TrackCopy[]): Caption[] =>
  media
    .filter(
      (one) =>
        one.tag === 'track' &&
        (one.attrs.kind === undefined ||
          ['captions', 'subtitles'].includes(one.attrs.kind.toLowerCase())),
    )
    .map((one) => ({ label: one.attrs.label ?? '', language: one.attrs.srclang ?? '' }))

/**
 * The cue on screen now, as nodes, or nothing between cues.
 *
 * Nodes rather than a string, because `VTTCue.text` is the cue's *source*:
 * WebVTT carries markup, and a caption file in the wild is full of it. `<v
 * Hildy>` names who is speaking, `<b>` and `<i>` and `<u>` mark emphasis, and
 * `<c.loud>` classes a line. Rendered as text every one of those arrives on
 * screen as visible angle brackets.
 *
 * `getCueAsHTML` is the platform parsing its own format, so nothing here has
 * to know the grammar and no cue text is ever treated as HTML: what comes
 * back is a fragment the browser built, not a string anybody interpolated.
 */
export const activeCue = (track: TextTrack | undefined): DocumentFragment | undefined => {
  const active = track?.activeCues?.[0]
  return active instanceof VTTCue ? active.getCueAsHTML() : undefined
}

/**
 * Listens to one track's cues at a time, so the next one can take it off.
 *
 * Taken off whatever it was on before adding it here. `follow` runs from
 * `loadedmetadata`, which fires again for every source a reader moves to, and
 * a consumer adding a `<track>` later gets another. Added without removing, a
 * playlist of six left six listeners on tracks that between them fire for
 * every cue in the video.
 */
export class CueController implements ReactiveController {
  private track: TextTrack | undefined

  constructor(
    host: ReactiveControllerHost,
    private readonly listener: () => void,
  ) {
    host.addController(this)
  }

  follow(track: TextTrack): void {
    this.stop()
    this.track = track
    track.addEventListener('cuechange', this.listener)
  }

  hostDisconnected(): void {
    this.stop()
  }

  private stop(): void {
    this.track?.removeEventListener('cuechange', this.listener)
    this.track = undefined
  }
}

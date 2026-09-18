/**
 * What each key does to a player, and how far it moves.
 *
 * Separable because the table is a convention rather than a fact about this
 * element: Space and `k` play, the arrows scrub and change the volume, `m`
 * mutes, `f` fills the screen, and `j` and `l` jump the distance the bar's own
 * buttons jump. What it needs is the media element and four actions, which is
 * the same handful the media session hands to a headset. Whether the keys are
 * bound at all, and what a taken press does to the event, stay with the element.
 */

import { SKIP_SECONDS } from '@fusion.dev/helix-core'

/** What a press asks the player for, which is all a key can do. */
export interface KeyActions {
  fullscreen: () => void
  seek: (seconds: number) => void
  skipBy: (seconds: number) => void
  toggle: () => void
}

/**
 * Answers one press, and says whether it was one of these.
 *
 * Nothing is taken while focus is in a range. The scrubber and the volume are
 * real inputs and the arrows are already theirs, so intercepting would mean
 * seeking twice for one press.
 */
export const takeKey = (
  event: KeyboardEvent,
  video: HTMLVideoElement,
  actions: KeyActions,
): boolean => {
  if ((event.target as HTMLElement)?.tagName === 'INPUT') {
    return false
  }
  /* Five seconds an arrow, the distance a native `<video controls>` moves by,
     and ten with shift held, which is `SKIP_SECONDS` reached from the keyboard
     rather than from a button: `j` and shift-left have to agree or the player
     skips two distances under one name. */
  const step = event.shiftKey ? SKIP_SECONDS : 5
  switch (event.key) {
    case ' ':
    case 'k': {
      actions.toggle()
      break
    }
    case 'ArrowRight': {
      actions.seek(video.currentTime + step)
      break
    }
    case 'ArrowLeft': {
      actions.seek(video.currentTime - step)
      break
    }
    case 'ArrowUp': {
      /* A tenth of the range a press, so the whole of it is ten presses
         either way. Clamped here rather than left to the platform, which
         throws on a volume outside zero to one instead of taking the nearest
         legal one. */
      video.volume = Math.min(video.volume + 0.1, 1)
      break
    }
    case 'ArrowDown': {
      video.volume = Math.max(video.volume - 0.1, 0)
      break
    }
    case 'j': {
      actions.skipBy(-SKIP_SECONDS)
      break
    }
    case 'l': {
      actions.skipBy(SKIP_SECONDS)
      break
    }
    case 'm': {
      video.muted = !video.muted
      break
    }
    case 'f': {
      actions.fullscreen()
      break
    }
    default: {
      return false
    }
  }
  return true
}

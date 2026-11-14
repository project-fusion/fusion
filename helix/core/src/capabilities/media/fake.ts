import type { CaptionTrack, NowPlaying, Playback } from '../types.generated.js'
import type { Media } from './contract.generated.js'
import { STILL_PLAYBACK } from './server.js'

/** One request a host made of a player, as it was made. Reading where it stands is not kept. */
export type MediaCall<N> =
  | { readonly call: 'captions'; readonly id: string | null; readonly node: N }
  | { readonly call: 'fullscreen'; readonly node: N; readonly on: boolean }
  | { readonly call: 'mute'; readonly muted: boolean; readonly node: N }
  | { readonly call: 'now-playing'; readonly node: N; readonly shown: NowPlaying | null }
  | { readonly call: 'pause'; readonly node: N }
  | { readonly call: 'picture-in-picture'; readonly node: N; readonly on: boolean }
  | { readonly call: 'play'; readonly node: N }
  | { readonly call: 'rate'; readonly node: N; readonly rate: number }
  | { readonly call: 'seek'; readonly node: N; readonly seconds: number }

/** A media capability that keeps each node's playback and every request, for a spec to read. */
export interface FakeMedia<N> extends Media<N> {
  /** Every request, in order. */
  readonly calls: readonly MediaCall<N>[]
  /**
   * Sets where `node` stands, as its media loading, playing, or ending does,
   * and tells each observer of `node`. No call is kept.
   */
  readonly place: (node: N, playback: Partial<Playback>) => void
  /** Sets the caption tracks `node`'s media carries. */
  readonly tracks: (node: N, tracks: readonly CaptionTrack[]) => void
  /** Whether a play stands, as a platform that refuses to play before a press does not. `true` unless set. */
  plays: boolean
}

/**
 * A fake that keeps each node's playback and each request. A play and a pause
 * move the playback as a player does, a seek is held between the start and
 * the length, and fullscreen and picture in picture stand as asked.
 */
export const fakeMedia = <N>(): FakeMedia<N> => {
  const calls: MediaCall<N>[] = []
  const states = new Map<N, Playback>()
  const tracksOf = new Map<N, readonly CaptionTrack[]>()
  const observers = new Map<N, Set<(playback: Playback) => void>>()
  const read = (node: N): Playback => states.get(node) ?? STILL_PLAYBACK
  const place = (node: N, playback: Partial<Playback>): void => {
    const next = { ...read(node), ...playback }
    states.set(node, next)
    for (const one of [...(observers.get(node) ?? [])]) {
      one(next)
    }
  }
  const fake: FakeMedia<N> = {
    calls,
    captions: (node) => tracksOf.get(node) ?? [],
    fullscreen: async (node, on) => {
      calls.push({ call: 'fullscreen', node, on })
      return true
    },
    mute: (node, muted) => {
      calls.push({ call: 'mute', muted, node })
      place(node, { muted })
    },
    nowPlaying: (node, shown) => {
      calls.push({ call: 'now-playing', node, shown })
    },
    observe: (node, changed) => {
      const heard = observers.get(node) ?? new Set()
      observers.set(node, heard)
      const one = (playback: Playback): void => changed(playback)
      heard.add(one)
      return () => {
        heard.delete(one)
      }
    },
    pause: (node) => {
      calls.push({ call: 'pause', node })
      place(node, { paused: true })
    },
    pictureInPicture: async (node, on) => {
      calls.push({ call: 'picture-in-picture', node, on })
      return true
    },
    place,
    play: async (node) => {
      calls.push({ call: 'play', node })
      if (fake.plays) {
        place(node, { ended: false, paused: false })
      }
      return fake.plays
    },
    plays: true,
    rate: (node, rate) => {
      calls.push({ call: 'rate', node, rate })
    },
    read,
    seek: (node, seconds) => {
      calls.push({ call: 'seek', node, seconds })
      const { duration } = read(node)
      place(node, { ended: false, time: Math.min(Math.max(seconds, 0), duration) })
    },
    showCaptions: (node, id) => {
      calls.push({ call: 'captions', id, node })
    },
    tracks: (node, tracks) => {
      tracksOf.set(node, tracks)
    },
  }
  return fake
}

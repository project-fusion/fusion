import { el, type PropValue, type Scenario, type Setup } from '../format.js'

/*
 * The scenarios of Video Playlist, a list of clips one player plays. A
 * scenario holds no player, which neither half could load the same way, so
 * the record says the moves a press asks and makes, by the entries' values,
 * and a refusal. The player it drives and the end of a clip are held by a
 * jest spec of the phone, with a stand-in player.
 */

/** A playlist of three entries, the first current. */
const playlist = (props: Readonly<Record<string, PropValue>> = {}): Setup =>
  el('helix-video-playlist', { 'default-active': 'one', label: 'Episodes', ...props }, [
    el('helix-video-playlist-item', { src: 'one.mp4', value: 'one' }, ['First']),
    el('helix-video-playlist-item', { src: 'two.mp4', value: 'two' }, ['Second']),
    el('helix-video-playlist-item', { disabled: true, src: 'three.mp4', value: 'three' }, [
      'Third',
    ]),
  ])

const press = (item: string) => ({ item, kind: 'press' as const })

/** Playlists: a press moves to an entry, a disabled one is passed by, and a refusal holds. */
export const VIDEO_PLAYLIST: readonly Scenario[] = [
  {
    family: 'video-playlist',
    intents: [press('two'), press('one'), press('three')],
    name: 'a press plays an entry, and a disabled entry plays nothing',
    setup: playlist(),
  },
  {
    family: 'video-playlist',
    intents: [{ event: 'before-activate', kind: 'refuse' }, press('two')],
    name: 'a refused move leaves the current entry',
    setup: playlist(),
  },
]

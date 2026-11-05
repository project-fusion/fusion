/**
 * A view that plays a video through `expo-video`, with no controls of its
 * own unless asked, and hands the media capability the player and the view
 * it plays through, as a web player hands it its `<video>`.
 *
 * **`expo-video` is an optional peer, loaded as the view first draws.** An app
 * without it draws an empty box of the same size, and the capability plays
 * nothing in it.
 */
import type { NowPlaying } from '@fusion.dev/helix-core/capabilities/types'
import type * as ExpoVideo from 'expo-video'
import { useEffect, useMemo } from 'react'
import { type StyleProp, View, type ViewStyle } from 'react-native'
import { loadVideo, type MediaNode } from '../capabilities/media'

/** What a media view takes. */
export interface MediaViewProps {
  /** How the picture fills the box, as the web's `object-fit`. */
  readonly contentFit?: 'contain' | 'cover' | 'fill'
  /** Whether the platform draws its own controls over the picture, as the web's `controls`. */
  readonly controls?: boolean
  /** Told the player and its view once it is made, and `null` once it is gone. */
  readonly handle?: (node: MediaNode | null) => void
  /** Whether the media plays again from its start at its end. */
  readonly loop?: boolean
  /** What the now-playing controls show while it plays. */
  readonly nowPlaying?: NowPlaying | null
  /** Told whether the platform's fullscreen player shows, as it enters and leaves. */
  readonly onFullscreen?: (on: boolean) => void
  /** Whether the system may float it in picture in picture. */
  readonly pictureInPicture?: boolean
  /** The address of the media, or what `require` gives for a file in the app. */
  readonly source: number | string | null
  readonly style?: StyleProp<ViewStyle>
}

/** The source a player takes: the address or the file, with what the now-playing controls show. */
const sourceOf = (
  source: MediaViewProps['source'],
  shown: NowPlaying | null | undefined,
): ExpoVideo.VideoSource => {
  if (source === null) {
    return null
  }
  const metadata = shown === null || shown === undefined ? {} : { metadata: { ...shown } }
  return typeof source === 'number'
    ? { assetId: source, ...metadata }
    : { uri: source, ...metadata }
}

/** The player and the view, where `expo-video` loads. */
const Playing = ({
  contentFit = 'contain',
  controls = false,
  handle,
  loop = false,
  nowPlaying,
  onFullscreen,
  pictureInPicture = true,
  source,
  style,
  video,
}: MediaViewProps & { readonly video: typeof ExpoVideo }) => {
  const player = video.useVideoPlayer(sourceOf(source, nowPlaying))
  const node = useMemo<MediaNode>(
    () => ({ player, shown: nowPlaying ?? null, view: null }),
    [player, nowPlaying],
  )
  useEffect(() => {
    player.loop = loop
  }, [loop, player])
  useEffect(() => {
    handle?.(node)
    return () => handle?.(null)
  }, [handle, node])
  return (
    <video.VideoView
      allowsPictureInPicture={pictureInPicture}
      contentFit={contentFit}
      nativeControls={controls}
      onFullscreenEnter={() => onFullscreen?.(true)}
      onFullscreenExit={() => onFullscreen?.(false)}
      player={player}
      ref={(view) => {
        node.view = view
      }}
      style={style}
    />
  )
}

/** Whether a phone can play video at all: `expo-video` is installed and its native module built in. */
export const playsVideo = (): boolean => loadVideo() !== null

/** Plays `source`. */
export const MediaView = (props: MediaViewProps) => {
  const video = loadVideo()
  return video === null ? <View style={props.style} /> : <Playing {...props} video={video} />
}

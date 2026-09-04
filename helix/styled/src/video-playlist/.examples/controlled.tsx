import { useState } from 'react'

export function Example() {
  const [active, setActive] = useState('two')

  return (
    <helix-video-playlist
      active={active}
      label="Episodes"
      onhelix-before-activate={(event) => setActive(event.detail.value)}
    >
      <helix-video
        label="One of several"
        slot="player"
      />

      <helix-video-playlist-item value="one">Getting started</helix-video-playlist-item>
      <helix-video-playlist-item value="two">Tokens and themes</helix-video-playlist-item>
    </helix-video-playlist>
  )
}

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
        extra-controls="previous next"
        label="Episode player"
        slot="player"
      />

      <helix-video-playlist-item value="one">Setting up your account</helix-video-playlist-item>
      <helix-video-playlist-item value="two">Inviting your team</helix-video-playlist-item>
    </helix-video-playlist>
  )
}

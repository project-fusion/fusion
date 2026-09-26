export function Example() {
  return (
    <helix-video-playlist
      default-active="two"
      label="Episodes"
    >
      <helix-video
        extra-controls="previous next"
        label="Episode player"
        slot="player"
      ></helix-video>
      <helix-video-playlist-menu
        label="Episodes"
        placement="top-end"
      ></helix-video-playlist-menu>
      <helix-video-playlist-item value="one">
        Setting up your account <span slot="meta">4:12</span>
      </helix-video-playlist-item>
      <helix-video-playlist-item value="two">
        Inviting your team <span slot="meta">6:40</span>
      </helix-video-playlist-item>
    </helix-video-playlist>
  )
}

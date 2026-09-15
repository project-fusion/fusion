import './preview.css'

export function Example() {
  return (
    <helix-headless-video-playlist
      default-active="sintel"
      label="Episodes"
    >
      <helix-headless-video
        extra-controls="previous next"
        label="One of several"
        slot="player"
      ></helix-headless-video>
      <helix-headless-video-playlist-item
        poster="/media/sintel-short.jpg"
        src="https://mdn.github.io/shared-assets/videos/sintel-short.mp4"
        value="sintel"
      >
        Sintel <span slot="meta">2:00</span>
      </helix-headless-video-playlist-item>
      <helix-headless-video-playlist-item
        poster="/media/tears-of-steel.jpg"
        src="https://mdn.github.io/shared-assets/videos/tears-of-steel-battle-clip-medium.mp4"
        value="tears"
      >
        Tears of Steel <span slot="meta">1:10</span>
      </helix-headless-video-playlist-item>
      <helix-headless-video-playlist-item
        disabled
        poster="/media/tears-of-steel.jpg"
        src="https://mdn.github.io/shared-assets/videos/tears-of-steel-battle-clip-medium.mp4"
        value="unavailable"
      >
        Not available in your region <span slot="meta">1:10</span>
      </helix-headless-video-playlist-item>
    </helix-headless-video-playlist>
  )
}

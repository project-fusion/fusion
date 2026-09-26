import './beside-the-player.css'

export function Example() {
  return (
    <helix-video-playlist
      className="wide"
      default-active="sintel"
      label="Episodes"
    >
      <helix-video
        extra-controls="previous next"
        label="Episode player"
        slot="player"
      ></helix-video>
      <helix-video-playlist-item
        poster="/media/sintel-short.jpg"
        src="https://mdn.github.io/shared-assets/videos/sintel-short.mp4"
        value="sintel"
      >
        Sintel <span slot="meta">2:00</span>
      </helix-video-playlist-item>
      <helix-video-playlist-item
        poster="/media/tears-of-steel.jpg"
        src="https://mdn.github.io/shared-assets/videos/tears-of-steel-battle-clip-medium.mp4"
        value="tears"
      >
        Tears of Steel <span slot="meta">1:10</span>
      </helix-video-playlist-item>
    </helix-video-playlist>
  )
}

import './separation.css'

export function Example() {
  return (
    <div className="players">
      <helix-video
        label="Product walkthrough"
        src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4"
      ></helix-video>
      <helix-video
        label="Getting started video"
        separation="filled"
        src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4"
      ></helix-video>
      <helix-video
        label="Team update"
        separation="plain"
        src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4"
      ></helix-video>
    </div>
  )
}

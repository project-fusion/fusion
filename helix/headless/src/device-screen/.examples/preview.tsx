import './preview.css'

export function Example() {
  return (
    <helix-headless-device-screen
      label="iPhone 17 Pro"
      screen-height="874"
      screen-width="402"
    >
      {/* Put your stream here: a video, an image, or a canvas. */}
      <div className="stand-in">
        <span className="date">Saturday, October 10</span>
        <span className="time">9:41</span>
      </div>
    </helix-headless-device-screen>
  )
}

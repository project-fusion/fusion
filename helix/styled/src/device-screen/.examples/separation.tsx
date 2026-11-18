import './separation.css'

export function Example() {
  return (
    <div className="row">
      <helix-device-screen
        label="iPhone 17 Pro"
        screen-height="874"
        screen-width="402"
      >
        {/* Put your stream here: a video, an image, or a canvas. */}
        <div className="stand-in">9:41</div>
      </helix-device-screen>

      <helix-device-screen
        label="iPhone 17"
        screen-height="874"
        screen-width="402"
        separation="plain"
      >
        <div className="stand-in">9:41</div>
      </helix-device-screen>
    </div>
  )
}

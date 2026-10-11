import './bezels.css'

export function Example() {
  return (
    <div className="row">
      <helix-device-screen
        className="home-button"
        label="iPhone SE"
        screen-height="667"
        screen-width="375"
        shape="square"
      >
        <div className="stand-in">9:41</div>
      </helix-device-screen>

      <helix-device-screen
        className="watch"
        controls="none"
        label="Pixel Watch"
        screen-height="384"
        screen-width="384"
        shape="circle"
      >
        <div className="stand-in">9:41</div>
      </helix-device-screen>

      <helix-device-screen
        className="tablet"
        controls="home rotate screenshot"
        label="iPad Air"
        screen-height="820"
        screen-width="1180"
      >
        <div className="stand-in">9:41</div>
      </helix-device-screen>
    </div>
  )
}

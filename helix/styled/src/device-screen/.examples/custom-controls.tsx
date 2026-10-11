import './custom-controls.css'

export function Example() {
  return (
    <helix-device-screen
      label="iPhone 17 Pro"
      screen-height="874"
      screen-width="402"
    >
      <div className="stand-in">
        <span className="date">Saturday, October 10</span>
        <span className="time">9:41</span>
      </div>

      <helix-icon-button
        label="Record the screen"
        slot="controls"
      >
        <helix-icon name="record"></helix-icon>
      </helix-icon-button>
    </helix-device-screen>
  )
}

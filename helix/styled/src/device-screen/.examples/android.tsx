import './android.css'

export function Example() {
  return (
    <helix-device-screen
      controls="back home recents power volume rotate screenshot"
      controls-placement="end"
      label="Pixel 9"
      screen-height="915"
      screen-width="412"
    >
      <div className="stand-in">
        <span className="time">9:41</span>
        <span className="date">Sat, Oct 10</span>
      </div>
    </helix-device-screen>
  )
}

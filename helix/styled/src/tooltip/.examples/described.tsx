import './described.css'

export function Example() {
  return (
    <div className="row">
      <helix-button aria-describedby="save-tip" id="save">
        Save
      </helix-button>
      <helix-tooltip content="Writes the file to disk" for="save" id="save-tip"></helix-tooltip>

      <helix-icon-button aria-describedby="archive-tip" id="archive" label="Archive">
        <helix-icon name="archive"></helix-icon>
      </helix-icon-button>
      <helix-tooltip
        content="Moves it out of the inbox"
        for="archive"
        id="archive-tip"
        placement="bottom"
      ></helix-tooltip>
    </div>
  )
}

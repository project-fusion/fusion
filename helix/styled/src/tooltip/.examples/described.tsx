import './described.css'

export function Example() {
  return (
    <div className="row">
      <helix-button
        aria-describedby="save-tip"
        id="save"
      >
        Save changes
      </helix-button>
      <helix-tooltip
        content="Save your changes to the file"
        for="save"
        id="save-tip"
      ></helix-tooltip>

      <helix-icon-button
        aria-describedby="archive-tip"
        id="archive"
        label="Archive"
      >
        <helix-icon name="archive"></helix-icon>
      </helix-icon-button>
      <helix-tooltip
        content="Move the message out of your inbox"
        for="archive"
        id="archive-tip"
        placement="bottom"
      ></helix-tooltip>
    </div>
  )
}

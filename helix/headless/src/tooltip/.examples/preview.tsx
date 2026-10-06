import './preview.css'

export function Example() {
  return (
    <>
      <helix-headless-button
        aria-describedby="save-tip"
        id="save"
      >
        Save changes
      </helix-headless-button>
      <helix-headless-tooltip
        content="Save your changes to the file"
        for="save"
        id="save-tip"
      ></helix-headless-tooltip>
    </>
  )
}

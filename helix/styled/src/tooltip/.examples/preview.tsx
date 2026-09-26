export function Example() {
  return (
    <>
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
    </>
  )
}
